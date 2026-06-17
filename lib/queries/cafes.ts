import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
}

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

  if (filters?.neighborhood && filters.neighborhood !== "all") {
    next = next.eq("neighborhood", filters.neighborhood)
  }

  if (filters?.search) {
    next = next.ilike("name", `%${filters.search}%`)
  }

  return next
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
  page?: number
  pageSize?: number
}) {
  const supabase = createAdminClient()
  const page = Math.max(1, filters?.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, filters?.pageSize ?? 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const shouldFilterByTag = Boolean(filters?.tagId && filters.tagId !== "all")
  const tagCafeIdsPromise = shouldFilterByTag
    ? supabase
      .from("cafe_tags")
      .select("cafe_id")
      .eq("tag_id", filters?.tagId as string)
    : Promise.resolve({ data: null, error: null })

  let countQuery = supabase
    .from("cafes")
    .select("id", { count: "exact", head: true })

  countQuery = applyCafeListFilters(countQuery, filters)

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
      cafe_owner_cafe ( owner_id )
    `)
    .order("created_at", { ascending: false })
    .range(from, to)

  dataQuery = applyCafeListFilters(dataQuery, filters)
  const { data: cafeTagRows, error: cafeTagError } = await tagCafeIdsPromise
  if (cafeTagError) throw cafeTagError

  const tagCafeIds = shouldFilterByTag
    ? Array.from(new Set((cafeTagRows ?? []).map((row) => row.cafe_id)))
    : null

  if (shouldFilterByTag && (tagCafeIds?.length ?? 0) === 0) {
    return {
      cafes: [] as Array<Cafe & { cafe_owner_cafe: { owner_id: string }[] | null }>,
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  if (tagCafeIds) {
    countQuery = countQuery.in("id", tagCafeIds)
    dataQuery = dataQuery.in("id", tagCafeIds)
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

export async function getDashboardStats() {
  const supabase = createAdminClient()
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [cafes, users, reviews, owners, allCafes, linkedCafes] =
    await Promise.all([
      supabase.from("cafes")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase.from("reviews")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoIso),
      supabase.from("cafe_owner_cafe")
        .select("owner_id", { count: "exact", head: true }),
      supabase.from("cafes")
        .select("id", { count: "exact", head: true }),
      supabase.from("cafe_owner_cafe")
        .select("cafe_id"),
    ])

  if (cafes.error) throw cafes.error
  if (users.error) throw users.error
  if (reviews.error) throw reviews.error
  if (owners.error) throw owners.error
  if (allCafes.error) throw allCafes.error
  if (linkedCafes.error) throw linkedCafes.error

  const linkedCafeIds = new Set((linkedCafes.data ?? []).map((row) => row.cafe_id))
  const unclaimedCount = Math.max(0, (allCafes.count ?? 0) - linkedCafeIds.size)

  return {
    totalCafes:       cafes.count ?? 0,
    totalUsers:       users.count ?? 0,
    reviewsThisWeek:  reviews.count ?? 0,
    activeOwners:     owners.count ?? 0,
    unclaimedCafes:   unclaimedCount,
  }
}
