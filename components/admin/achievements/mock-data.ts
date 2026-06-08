export type AchievementCategory = "crawl" | "drops" | "social" | "milestones" | "hidden"
export type SourceType = "crawl_tier" | "drop_redemption" | "manual" | "streak" | "milestone"

export type AchievementDef = {
  id: string
  slug: string
  name: string
  description: string
  category: AchievementCategory
  source_type: SourceType
  source_id: string | null
  badge_image_url: string | null
  is_limited_edition: boolean
  is_hidden: boolean
  created_at: string
}

export type Profile = {
  id: string
  username: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

export type UserAchievement = {
  user_id: string
  achievement_id: string
  earned_at: string
}

export const MOCK_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "ach-1",
    slug: "cebu_island_crawl_city_explorer",
    name: "City Explorer",
    description: "Complete all stops on the Cebu Island Crawl to earn the City Explorer badge.",
    category: "crawl",
    source_type: "crawl_tier",
    source_id: "tier-001",
    badge_image_url: null,
    is_limited_edition: false,
    is_hidden: false,
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "ach-2",
    slug: "stamp_collector",
    name: "Stamp Collector",
    description: "Redeem 5 unique drop stamps across any participating cafes.",
    category: "drops",
    source_type: "drop_redemption",
    source_id: null,
    badge_image_url: null,
    is_limited_edition: true,
    is_hidden: false,
    created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "ach-3",
    slug: "social_butterfly",
    name: "Social Butterfly",
    description: "Share your passport with 3 friends and have them join Nook.",
    category: "social",
    source_type: "manual",
    source_id: null,
    badge_image_url: null,
    is_limited_edition: false,
    is_hidden: false,
    created_at: "2025-03-10T00:00:00Z",
  },
  {
    id: "ach-4",
    slug: "early_bird",
    name: "Early Bird",
    description: "Visit 5 cafes before 9 AM.",
    category: "milestones",
    source_type: "streak",
    source_id: null,
    badge_image_url: null,
    is_limited_edition: true,
    is_hidden: false,
    created_at: "2025-04-05T00:00:00Z",
  },
  {
    id: "ach-5",
    slug: "secret_cafe_hopper",
    name: "Secret Cafe Hopper",
    description: "Visit a cafe that has been unlisted for 30+ days.",
    category: "hidden",
    source_type: "milestone",
    source_id: null,
    badge_image_url: null,
    is_limited_edition: false,
    is_hidden: true,
    created_at: "2025-05-20T00:00:00Z",
  },
]

export const MOCK_PROFILES: Profile[] = [
  { id: "user-1", username: "carltaco", full_name: "Carl Tacoronte", email: "carl@nook.app", avatar_url: null },
  { id: "user-2", username: "mika____", full_name: "Mika Reyes", email: "mika@nook.app", avatar_url: null },
  { id: "user-3", username: "jamilah", full_name: "Jamilah Santos", email: "jamilah@nook.app", avatar_url: null },
  { id: "user-4", username: "reymond", full_name: "Raymond Lim", email: "raymond@nook.app", avatar_url: null },
  { id: "user-5", username: "heartcal", full_name: "Heart Cal", email: "heart@nook.app", avatar_url: null },
]

export const MOCK_USER_ACHIEVEMENTS: UserAchievement[] = [
  { user_id: "user-1", achievement_id: "ach-1", earned_at: "2025-03-10T00:00:00Z" },
  { user_id: "user-3", achievement_id: "ach-2", earned_at: "2025-06-01T00:00:00Z" },
]
