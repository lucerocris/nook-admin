"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CrawlStatus } from "@/lib/types/crawls"
import { isValidTransition } from "@/lib/types/crawls"

export async function createCrawlAction(data: {
  title: string
  description: string | null
  slug: string
  city: string
  starts_at: string
  ends_at: string
  cover_image_url: string | null
  stamp_template_url: string | null
  is_featured: boolean
}) {
  try {
    const supabase = createAdminClient()
    const { data: crawl, error } = await supabase
      .from("crawls")
      .insert({
        title: data.title,
        description: data.description,
        slug: data.slug,
        city: data.city,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        cover_image_url: data.cover_image_url,
        stamp_template_url: data.stamp_template_url,
        is_featured: data.is_featured,
        status: "draft",
        total_stops: 0,
      })
      .select("id")
      .single()

    if (error) throw error
    revalidatePath("/admin/crawls")
    return { success: true, id: crawl.id } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function updateCrawlAction(
  id: string,
  data: {
    title?: string
    description?: string | null
    slug?: string
    city?: string
    starts_at?: string
    ends_at?: string
    cover_image_url?: string | null
    stamp_template_url?: string | null
    is_featured?: boolean
  },
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawls")
      .update(data)
      .eq("id", id)

    if (error) throw error
    revalidatePath("/admin/crawls")
    revalidatePath(`/admin/crawls/${id}`)
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function updateCrawlStatusAction(
  id: string,
  newStatus: CrawlStatus,
) {
  try {
    const supabase = createAdminClient()

    const { data: crawl, error: fetchError } = await supabase
      .from("crawls")
      .select("status")
      .eq("id", id)
      .single()

    if (fetchError || !crawl) throw new Error("Crawl not found")

    if (!isValidTransition(crawl.status as CrawlStatus, newStatus)) {
      throw new Error(
        `Cannot transition from ${crawl.status} to ${newStatus}`,
      )
    }

    const { error } = await supabase
      .from("crawls")
      .update({ status: newStatus })
      .eq("id", id)

    if (error) throw error
    revalidatePath("/admin/crawls")
    revalidatePath(`/admin/crawls/${id}`)
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function toggleFeaturedAction(id: string, isFeatured: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawls")
      .update({ is_featured: isFeatured })
      .eq("id", id)

    if (error) throw error
    revalidatePath("/admin/crawls")
    revalidatePath(`/admin/crawls/${id}`)
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function checkSlugUniquenessAction(
  slug: string,
  excludeId?: string,
) {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("crawls")
      .select("id")
      .eq("slug", slug)

    if (excludeId) {
      query = query.neq("id", excludeId)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return { taken: data !== null } as const
  } catch (error) {
    return {
      taken: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function addCrawlStopAction(
  crawlId: string,
  data: {
    cafe_id: string
    stop_order: number
    tier: string
    label: string | null
  },
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("crawl_stops").insert({
      crawl_id: crawlId,
      cafe_id: data.cafe_id,
      stop_order: data.stop_order,
      tier: data.tier,
      is_active: true,
      label: data.label,
    })

    if (error) throw error
    revalidatePath(`/admin/crawls/${crawlId}`)
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function updateCrawlStopAction(
  stopId: string,
  data: {
    is_active?: boolean
    stop_order?: number
    tier?: string
    label?: string | null
  },
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawl_stops")
      .update(data)
      .eq("id", stopId)

    if (error) throw error
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function removeCrawlStopAction(stopId: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawl_stops")
      .delete()
      .eq("id", stopId)

    if (error) throw error
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function reorderStopsAction(
  updates: Array<{ id: string; stop_order: number }>,
) {
  try {
    const supabase = createAdminClient()
    const promises = updates.map((u) =>
      supabase
        .from("crawl_stops")
        .update({ stop_order: u.stop_order })
        .eq("id", u.id),
    )
    const results = await Promise.all(promises)
    const error = results.find((r) => r.error)
    if (error) throw error.error
    return { success: true } as const
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function createCrawlTierAction(
  crawlId: string,
  data: {
    name: string
    slug: string
    description: string | null
    completion_copy: string | null
    tier_order: number
    required_tier_tags: string[]
    badge_image_url: string | null
  },
) {
  try {
    const supabase = createAdminClient()
    const { data: created, error } = await supabase
      .from("crawl_tiers")
      .insert({
        crawl_id: crawlId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        completion_copy: data.completion_copy,
        tier_order: data.tier_order,
        required_tier_tags: data.required_tier_tags,
        badge_image_url: data.badge_image_url,
      })
      .select("id")
      .single()

    if (error) throw error
    revalidatePath(`/admin/crawls/${crawlId}`)
    return { success: true as const, id: created.id }
  } catch (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as Record<string, unknown>).message)
        : error instanceof Error
          ? error.message
          : "Something went wrong"
    console.error("createCrawlTierAction error:", error)
    return { success: false as const, error: message }
  }
}

export async function updateCrawlTierAction(
  tierId: string,
  crawlId: string,
  data: {
    name?: string
    slug?: string
    description?: string | null
    completion_copy?: string | null
    tier_order?: number
    required_tier_tags?: string[]
    badge_image_url?: string | null
  },
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawl_tiers")
      .update(data)
      .eq("id", tierId)

    if (error) throw error
    revalidatePath(`/admin/crawls/${crawlId}`)
    return { success: true } as const
  } catch (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as Record<string, unknown>).message)
        : error instanceof Error
          ? error.message
          : "Something went wrong"
    console.error("updateCrawlTierAction error:", error)
    return { success: false as const, error: message }
  }
}

export async function searchCafesAction(
  q: string,
  crawlId: string,
): Promise<{ id: string; name: string; address: string | null; neighborhood: string | null }[]> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from("crawl_stops")
    .select("cafe_id")
    .eq("crawl_id", crawlId)

  const existingIds = new Set((existing ?? []).map((r) => r.cafe_id))

  const { data, error } = await supabase
    .from("cafes")
    .select("id, name, address, neighborhood")
    .eq("status", "active")
    .or(`name.ilike.*${q}*,address.ilike.*${q}*`)
    .order("name", { ascending: true })
    .limit(20)

  if (error) throw error
  return ((data ?? []) as { id: string; name: string; address: string | null; neighborhood: string | null }[]).filter(
    (cafe) => !existingIds.has(cafe.id),
  )
}

export async function searchProfilesAction(
  query: string,
): Promise<{ id: string; username: string; avatar_url: string | null }[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
    .order("username", { ascending: true })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function checkDuplicateStampAction(
  stopId: string,
  userId: string,
): Promise<{ id: string; claimed_at: string } | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("crawl_stamps")
    .select("id, claimed_at")
    .eq("stop_id", stopId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteCrawlTierAction(tierId: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("crawl_tiers")
      .delete()
      .eq("id", tierId)

    if (error) throw error
    return { success: true } as const
  } catch (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as Record<string, unknown>).message)
        : error instanceof Error
          ? error.message
          : "Something went wrong"
    console.error("deleteCrawlTierAction error:", error)
    return { success: false as const, error: message }
  }
}
