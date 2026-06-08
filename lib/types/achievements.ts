export type AchievementCategory = "crawl" | "drops" | "social" | "milestones" | "hidden"
export type SourceType = "crawl_tier" | "drop_redemption" | "manual" | "streak" | "milestone"

export type AchievementDef = {
  id: string
  slug: string
  name: string
  description: string | null
  category: AchievementCategory
  source_type: SourceType
  source_id: string | null
  badge_image_url: string | null
  is_limited_edition: boolean
  is_hidden: boolean
  created_at: string
}

export type AchievementInsert = {
  slug: string
  name: string
  description?: string | null
  category: AchievementCategory
  source_type: SourceType
  source_id?: string | null
  badge_image_url?: string | null
  is_limited_edition?: boolean
  is_hidden?: boolean
}

export type AchievementUpdate = Partial<AchievementInsert>

export type Profile = {
  id: string
  username: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

export type UserAchievement = {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  source_type: string
  source_ref_id: string | null
  metadata: Record<string, unknown> | null
  is_visible: boolean
}

export type UserAchievementInsert = {
  user_id: string
  achievement_id: string
  earned_at?: string
  source_type: string
  source_ref_id?: string | null
  metadata?: Record<string, unknown> | null
  is_visible?: boolean
}
