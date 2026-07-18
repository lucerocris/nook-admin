import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"

export type Cafe = {
  id: string
  name: string
  description: string | null
  address: string | null
  neighborhood: string | null
  city: string
  lat: number | null
  lng: number | null
  featured_image_url: string | null
  photo_urls: string[] | null
  rating: number | null
  review_count: number
  is_new: boolean
  is_featured: boolean
  status: "draft" | "active" | "inactive"
  operating_hours: Record<string, {
    open: string; close: string; closed: boolean
  }> | null
  social_links: {
    instagram?: string
    facebook?: string
    tiktok?: string
    website?: string
  } | null
  created_at: string
}

type CafeListFilters = {
  status?: string
  neighborhood?: string
  search?: string
  featured?: string
}

// PostgREST treats these as literal characters inside an ilike pattern, so a
// search for "100% arabica" would otherwise match far more than it should.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

// Neighborhood is intentionally NOT handled here — it is resolved to cafe ids
// upstream (see resolveNeighborhoodCafeIds). The column is dirty free text
// (" Lahug" vs "Lahug"), and PostgREST's `in.()` list parser strips leading
// whitespace from each element, so filtering the column directly drops rows.
function applyCafeListFilters<T extends {
  eq: (column: string, value: unknown) => T
  ilike: (column: string, pattern: string) => T
}>(
  query: T,
  filters?: CafeListFilters
) {
  let next = query

  if (filters?.status && filters?.status !== "all") {
    next = next.eq("status", filters.status)
  }

  if (filters?.featured === "featured") {
    next = next.eq("is_featured", true)
  } else if (filters?.featured === "not-featured") {
    next = next.eq("is_featured", false)
  }

  if (filters?.search) {
    next = next.ilike("name", `%${escapeLikePattern(filters.search)}%`)
  }

  return next
}

export type NeighborhoodOption = {
  /** Trimmed, canonical spelling — what the URL and the dropdown carry. */
  value: string
  /** Every raw spelling in the column that trims to `value`. */
  variants: string[]
}

// The Area dropdown used to be a hardcoded list of slugs ("it-park") while the
// column holds free text ("IT Park"), so every area filter matched zero rows.
// Deriving the options from the data keeps them in sync with what admins type.
export async function getCafeNeighborhoods(): Promise<NeighborhoodOption[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("cafes")
    .select("neighborhood")
    .not("neighborhood", "is", null)

  if (error) throw error

  const byCanonical = new Map<string, Set<string>>()
  for (const row of data ?? []) {
    const raw = row.neighborhood as string | null
    if (!raw) continue
    const canonical = raw.trim()
    if (!canonical) continue

    const variants = byCanonical.get(canonical) ?? new Set<string>()
    variants.add(raw)
    byCanonical.set(canonical, variants)
  }

  return Array.from(byCanonical.entries())
    .map(([value, variants]) => ({ value, variants: Array.from(variants) }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

// Resolves a trimmed neighborhood label to the exact cafe ids that carry it,
// tolerating the column's whitespace variants. The ilike is a coarse superset
// pass (it also matches " Lahug" and "Lahug "); the trim comparison in JS makes
// it exact. Matching on ids sidesteps the `in.()` whitespace-stripping bug.
async function resolveNeighborhoodCafeIds(
  supabase: ReturnType<typeof createAdminClient>,
  neighborhood: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("cafes")
    .select("id, neighborhood")
    .ilike("neighborhood", `%${escapeLikePattern(neighborhood)}%`)

  if (error) throw error

  return (data ?? [])
    .filter((row) => (row.neighborhood as string | null)?.trim() === neighborhood)
    .map((row) => row.id as string)
}

export type CafeSort = "recent" | "az" | "rating"

const CAFE_SORTS: Record<CafeSort, { column: string; ascending: boolean }> = {
  recent: { column: "created_at", ascending: false },
  az: { column: "name", ascending: true },
  rating: { column: "rating", ascending: false },
}

function resolveSort(sort?: string) {
  return CAFE_SORTS[sort as CafeSort] ?? CAFE_SORTS.recent
}

export async function getCafes(filters?: CafeListFilters) {
  const supabase = createAdminClient()
  let query = supabase
    .from("cafes")
    .select(`*`)
    .order("created_at", { ascending: false })

  query = applyCafeListFilters(query, filters)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCafesPage(filters?: CafeListFilters & {
  tagId?: string
  owner?: string
  sort?: string
  page?: number
  pageSize?: number
}) {
  const supabase = createAdminClient()
  const page = Math.max(1, filters?.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, filters?.pageSize ?? 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const emptyPage = {
    cafes: [] as Array<Cafe & { cafe_owner_cafe: { owner_id: string }[] | null }>,
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  }

  const shouldFilterByTag = Boolean(filters?.tagId && filters.tagId !== "all")
  const shouldFilterByNeighborhood = Boolean(
    filters?.neighborhood && filters.neighborhood !== "all"
  )
  const ownerFilter = filters?.owner === "claimed" || filters?.owner === "unclaimed"
    ? filters.owner
    : null

  const [tagRows, claimedRows, neighborhoodIds] = await Promise.all([
    shouldFilterByTag
      ? supabase.from("cafe_tags").select("cafe_id").eq("tag_id", filters?.tagId as string)
      : Promise.resolve({ data: null, error: null }),
    ownerFilter
      ? supabase.from("cafe_owner_cafe").select("cafe_id")
      : Promise.resolve({ data: null, error: null }),
    shouldFilterByNeighborhood
      ? resolveNeighborhoodCafeIds(supabase, filters!.neighborhood as string)
      : Promise.resolve(null),
  ])

  if (tagRows.error) throw tagRows.error
  if (claimedRows.error) throw claimedRows.error

  // The tag, neighborhood, and owner filters all restrict by cafe id.
  // Intersecting them here rather than stacking .in() calls keeps the semantics
  // obvious and lets "unclaimed" subtract from an allowlist instead of needing
  // a not.in().
  let allowedIds: string[] | null = null
  const intersect = (ids: string[]) => {
    const next = new Set(ids)
    allowedIds = allowedIds === null ? ids : allowedIds.filter((id) => next.has(id))
  }

  if (shouldFilterByTag) {
    intersect(Array.from(new Set((tagRows.data ?? []).map((row) => row.cafe_id as string))))
  }

  if (shouldFilterByNeighborhood) {
    intersect(neighborhoodIds ?? [])
  }

  const claimedIds = Array.from(
    new Set((claimedRows.data ?? []).map((row) => row.cafe_id as string))
  )

  if (ownerFilter === "claimed") {
    intersect(claimedIds)
  }

  if (allowedIds !== null && (allowedIds as string[]).length === 0) return emptyPage

  const sort = resolveSort(filters?.sort)

  let countQuery = supabase
    .from("cafes")
    .select("id", { count: "exact", head: true })

  let dataQuery = supabase
    .from("cafes")
    .select(`
      id,
      name,
      neighborhood,
      city,
      featured_image_url,
      status,
      rating,
      is_featured,
      cafe_owner_cafe ( owner_id )
    `)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .range(from, to)

  countQuery = applyCafeListFilters(countQuery, filters)
  dataQuery = applyCafeListFilters(dataQuery, filters)

  if (allowedIds !== null) {
    countQuery = countQuery.in("id", allowedIds)
    dataQuery = dataQuery.in("id", allowedIds)
  }

  // "unclaimed" subtracts the claimed set from whatever is left after the other
  // filters. An empty claimed set means nothing to exclude — and `not.in.()`
  // is not valid PostgREST, so it has to be skipped rather than sent empty.
  if (ownerFilter === "unclaimed" && claimedIds.length > 0) {
    const exclusion = `(${claimedIds.join(",")})`
    countQuery = countQuery.not("id", "in", exclusion)
    dataQuery = dataQuery.not("id", "in", exclusion)
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

  if (countResult.error) throw countResult.error
  if (dataResult.error) throw dataResult.error

  const total = countResult.count ?? 0
  return {
    cafes: (dataResult.data ?? []) as Array<Cafe & { cafe_owner_cafe: { owner_id: string }[] | null }>,
    total,
    page,
    pageSize,
    totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
  }
}

export async function getCafeById(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("cafes")
    .select(`
      *,
      cafe_tags ( tag_id, is_featured ),
      menu_items (
        id, name, description, price, is_highlight,
        image_url, category_id,
        menu_categories ( id, name )
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createCafe(payload: {
  name: string
  neighborhood: string
  city?: string
  description?: string
  address?: string
  lat?: number
  lng?: number
  operating_hours?: object
  social_links?: object
  status?: string
  is_new?: boolean
  is_featured?: boolean
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("cafes")
    .insert({ ...payload, status: payload.status ?? "draft" })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCafe(id: string, payload: Partial<Cafe>) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("cafes")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export type DashboardStats = {
  totalCafes: number
  totalUsers: number
  reviewsThisWeek: number
  activeOwners: number
  unclaimedCafes: number
}

// Was 6 queries, one of which pulled every cafe_owner_cafe row over the wire
// just to count distinct cafe_ids in JS. get_admin_dashboard_summary computes
// all of it in one pass.
export async function getDashboardStats(): Promise<DashboardStats> {
  const summary = await getAdminDashboardSummary()

  return {
    totalCafes:      summary.cafes.active,
    totalUsers:      summary.users.total,
    reviewsThisWeek: summary.reviews.last_7d,
    // Now counts DISTINCT owners. The old query counted cafe_owner_cafe rows,
    // so an owner linked to several cafes was counted once per cafe.
    activeOwners:    summary.owners,
    unclaimedCafes:  summary.cafes.unclaimed,
  }
}
