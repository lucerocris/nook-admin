import { createAdminClient } from "@/lib/supabase/admin"
import type {
  AchievementDef,
  AchievementInsert,
  AchievementUpdate,
} from "@/lib/types/achievements"

export async function getAchievements(): Promise<AchievementDef[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("achievement_definitions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as AchievementDef[]
}

export async function getAchievementById(
  id: string,
): Promise<AchievementDef | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("achievement_definitions")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as AchievementDef | null
}

export async function createAchievement(
  input: AchievementInsert,
): Promise<AchievementDef> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("achievement_definitions")
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as AchievementDef
}

export async function updateAchievement(
  id: string,
  input: AchievementUpdate,
): Promise<AchievementDef> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("achievement_definitions")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as AchievementDef
}

export async function checkAchievementSlugExists(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = createAdminClient()
  let query = supabase
    .from("achievement_definitions")
    .select("id")
    .eq("slug", slug)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data !== null
}

export async function awardAchievement(input: {
  user_id: string
  achievement_id: string
  earned_at: string
  source_type: string
  source_ref_id?: string | null
  metadata?: Record<string, unknown> | null
  is_visible?: boolean
}): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("user_achievements").insert(input)

  if (error) throw error
}

export async function checkDuplicateAward(
  userId: string,
  achievementId: string,
): Promise<{ earned_at: string } | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("user_achievements")
    .select("earned_at")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function searchProfiles(
  query: string,
): Promise<
  Array<{
    id: string
    username: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }>
> {
  const supabase = createAdminClient()

  if (!query || query.length < 2) return []

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, email, avatar_url")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("username", { ascending: true })
    .limit(20)

  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    username: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }>
}
