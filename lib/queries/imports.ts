import { createAdminClient } from "@/lib/supabase/admin"
import { escapeLikePattern } from "@/lib/utils"

// Cafés imported from Google Places (nook-supabase scripts/cafe-scraper).
// Each is an ordinary cafes row (status draft until published here) plus a
// cafe_imports row with the place id, quality tier and review metadata.
// Migrations: nook-supabase 20261011100000_cafe_imports,
// 20261011100100_admin_publish_cafe_imports.

export type ImportStatus = "draft" | "active" | "inactive"

export type ImportRow = {
  cafe_id: string
  google_place_id: string
  batch: string
  metro: string | null
  quality_tier: "A" | "B" | "C"
  quality_score: number | null
  quality_reasons: string[]
  flags: string[]
  category: string | null
  is_chain: boolean
  google_rating: number | null
  google_rating_count: number | null
  google_maps_url: string | null
  hours_source: "google" | "none"
  imported_at: string
  published_at: string | null
  verified_at: string | null
  cafes: {
    id: string
    name: string
    address: string | null
    neighborhood: string | null
    city: string
    lat: number
    lng: number
    status: ImportStatus
    operating_hours: Record<string, { open: string; close: string; closed: boolean }> | null
    is_claimed: boolean
  }
}

export type ImportSummaryRow = {
  city: string
  metro: string | null
  quality_tier: "A" | "B" | "C"
  status: ImportStatus
  has_hours: boolean
  n: number
}

export const IMPORT_FLAGS = [
  { value: "chain", label: "Chain or borderline" },
  { value: "multi_branch", label: "Several branches" },
  { value: "takeaway_type", label: "Takeaway only" },
  { value: "few_reviews", label: "Few reviews" },
  { value: "city_from_neighbors", label: "City guessed" },
  { value: "plus_code", label: "Plus-code address" },
  { value: "outside_city_box", label: "Outside the city box" },
] as const

export const IMPORTS_PAGE_SIZE = 25

export type ImportFilters = {
  status?: string
  city?: string
  metro?: string
  tier?: string
  hours?: string
  flag?: string
  search?: string
  sort?: string
  page?: number
}

const SELECT = `
  cafe_id, google_place_id, batch, metro, quality_tier, quality_score, quality_reasons, flags,
  category, is_chain, google_rating, google_rating_count, google_maps_url, hours_source,
  imported_at, published_at, verified_at,
  cafes!inner ( id, name, address, neighborhood, city, lat, lng, status, operating_hours, is_claimed )
`

export async function getImportsPage(filters: ImportFilters) {
  const supabase = createAdminClient()
  const page = Math.max(1, filters.page ?? 1)
  const from = (page - 1) * IMPORTS_PAGE_SIZE
  const to = from + IMPORTS_PAGE_SIZE - 1

  let q = supabase.from("cafe_imports").select(SELECT, { count: "exact" })

  const status = filters.status ?? "draft"
  if (status === "draft" || status === "active" || status === "inactive") q = q.eq("cafes.status", status)
  if (filters.city && filters.city !== "all") q = q.eq("cafes.city", filters.city)
  if (filters.metro && filters.metro !== "all") q = q.eq("metro", filters.metro)
  if (filters.tier && filters.tier !== "all") q = q.eq("quality_tier", filters.tier)
  if (filters.hours === "yes") q = q.not("cafes.operating_hours", "is", null)
  if (filters.hours === "no") q = q.is("cafes.operating_hours", null)
  if (filters.flag === "chain") q = q.or("is_chain.eq.true,category.in.(chain,borderline)")
  else if (filters.flag === "plus_code") q = q.contains("quality_reasons", ["address:plus_code_only"])
  else if (filters.flag === "city_from_neighbors") q = q.overlaps("flags", ["city_from_neighbors", "city_from_address"])
  else if (filters.flag && filters.flag !== "all") q = q.contains("flags", [filters.flag])
  if (filters.search) q = q.ilike("cafes.name", `%${escapeLikePattern(filters.search)}%`)

  if (filters.sort === "name") q = q.order("cafes(name)", { ascending: true })
  else if (filters.sort === "ratings") q = q.order("google_rating_count", { ascending: false, nullsFirst: false })
  else q = q.order("quality_tier", { ascending: true }).order("quality_score", { ascending: false, nullsFirst: false })
  q = q.order("cafe_id").range(from, to)

  const { data, error, count } = await q
  // 42P01 / PGRST205: cafe_imports isn't in the database yet (migration not applied).
  if (error && (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST200")) {
    return { rows: [] as ImportRow[], total: 0, page, totalPages: 0, missingTable: true }
  }
  if (error) throw error
  const total = count ?? 0
  return {
    rows: (data ?? []) as unknown as ImportRow[],
    total,
    page,
    totalPages: total > 0 ? Math.ceil(total / IMPORTS_PAGE_SIZE) : 0,
    missingTable: false,
  }
}

export async function getImportSummary(): Promise<ImportSummaryRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("admin_cafe_import_summary")
  if (error && (error.code === "PGRST202" || error.code === "42883")) return []
  if (error) throw error
  return (data ?? []) as ImportSummaryRow[]
}

/** Draft imports in a city at a tier: what "Publish all tier A in <city>" acts on. */
export async function getDraftImportIds(city: string, tier: string): Promise<string[]> {
  const supabase = createAdminClient()
  const ids: string[] = []
  // PostgREST caps a response at 1000 rows; page through.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cafe_imports")
      .select("cafe_id, cafes!inner(status, city)")
      .eq("quality_tier", tier)
      .eq("cafes.city", city)
      .eq("cafes.status", "draft")
      .order("cafe_id")
      .range(from, from + 999)
    if (error) throw error
    ids.push(...(data ?? []).map((r) => r.cafe_id as string))
    if ((data ?? []).length < 1000) break
  }
  return ids
}

/** Unpublished imports: the Cafés list and dashboard leave these to Imports. */
export async function countImportDrafts(): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from("cafe_imports")
    .select("cafe_id, cafes!inner(status)", { count: "exact", head: true })
    .eq("cafes.status", "draft")
  if (error) return 0
  return count ?? 0
}
