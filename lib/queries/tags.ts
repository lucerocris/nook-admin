import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from "next/cache"

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }

    if (typeof maybeError.message === "string" && maybeError.message) {
      const extra = [maybeError.details, maybeError.hint]
        .filter((part): part is string => typeof part === "string" && part.length > 0)
        .join(" ")

      return extra ? `${maybeError.message} ${extra}` : maybeError.message
    }
  }

  return fallback
}

export type Tag = {
  id: string
  name: string
  category: string
  icon_name: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  cafe_tags?: { count: number }[]
}

export async function getAllTags(includeVibe = false) {
  const supabase = await createClient()
  let query = supabase
    .from("tags")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  if (!includeVibe) query = query.neq("category", "vibe")

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Tag[]
}

export async function getAllTagsAdmin(): Promise<Tag[]> {
  return getAllTagsAdminCached()
}

const getAllTagsAdminCached = unstable_cache(
  async (): Promise<Tag[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("tags")
      .select("*, cafe_tags(count)")
      .order("category")
      .order("sort_order", { ascending: true })

    if (error) throw error
    return (data ?? []) as Tag[]
  },
  ["admin-all-tags"],
  { revalidate: 60 * 10, tags: ["admin-tags"] }
)

export async function createTag(payload: {
  name: string
  category: string
  icon_name?: string
}): Promise<Tag> {
  const supabase = createAdminClient()
  const normalizedName = payload.name.trim()
  const normalizedCategory = payload.category.trim()
  const normalizedIconName = payload.icon_name?.trim() || null

  if (!normalizedName) throw new Error("Tag name is required")
  if (!normalizedCategory) throw new Error("Category is required")

  // Put the new tag at the bottom of its category.
  const { data: existing } = await supabase
    .from("tags")
    .select("sort_order")
    .eq("category", normalizedCategory)
    .order("sort_order", { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from("tags")
    .insert({
      name: normalizedName,
      category: normalizedCategory,
      icon_name: normalizedIconName,
      sort_order: nextOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("A tag with the same name already exists")
    }

    throw new Error(getErrorMessage(error, "Failed to create tag"))
  }
  return data as Tag
}

export async function updateTag(
  id: string,
  payload: {
    name?: string
    icon_name?: string
    sort_order?: number
    is_active?: boolean
  }
): Promise<Tag> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("tags")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(getErrorMessage(error, "Failed to update tag"))
  return data
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { count } = await supabase
    .from("cafe_tags")
    .select("*", { count: "exact", head: true })
    .eq("tag_id", id)

  if (count && count > 0) {
    throw new Error(
      `Cannot delete - ${count} cafe${count > 1 ? "s" : ""} use this tag. Deactivate it instead.`
    )
  }

  const { error } = await supabase.from("tags").delete().eq("id", id)

  if (error) throw new Error(getErrorMessage(error, "Failed to delete tag"))
}

export async function setCafeTags(
  cafeId: string,
  tagIds: string[],
  featuredTagIds: string[] | string | null
) {
  const supabase = createAdminClient()

  const featuredTagIdSet = new Set(
    Array.isArray(featuredTagIds)
      ? featuredTagIds
      : featuredTagIds
        ? [featuredTagIds]
        : []
  )

  await supabase.from("cafe_tags").delete().eq("cafe_id", cafeId)

  if (tagIds.length === 0) return

  const { error } = await supabase.from("cafe_tags").insert(
    tagIds.map((tagId) => ({
      cafe_id: cafeId,
      tag_id: tagId,
      is_featured: featuredTagIdSet.has(tagId),
    }))
  )

  if (error) throw new Error(getErrorMessage(error, "Failed to save cafe tags"))
}
