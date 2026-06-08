export type CrawlStatus = "draft" | "active" | "completed" | "cancelled"

export type Crawl = {
  id: string
  title: string
  description: string | null
  slug: string
  status: CrawlStatus
  city: string
  starts_at: string
  ends_at: string
  cover_image_url: string | null
  stamp_template_url: string | null
  is_featured: boolean
  total_stops: number
  created_at: string
  created_by: string | null
}

export type CrawlTier = {
  id: string
  crawl_id: string
  name: string
  slug: string
  description: string | null
  completion_copy: string | null
  tier_order: number
  required_tier_tags: string[]
  badge_image_url: string | null
  created_at: string
}

export type CrawlStop = {
  id: string
  crawl_id: string
  cafe_id: string
  stop_order: number
  tier: string
  is_active: boolean
  label: string | null
  created_at: string
}

export type CrawlStopWithCafe = CrawlStop & {
  cafe_name: string
  address: string | null
  neighborhood: string | null
}

export type CrawlRegistrations = {
  id: string
  crawl_id: string
  user_id: string
  registered_at: string
  highest_tier_id: string | null
  completed_at: string | null
  last_stamp_at: string | null
  total_stamps: number
}

export type CrawlStamp = {
  id: string
  crawl_id: string
  stop_id: string
  user_id: string
  claimed_at: string
  claim_method: "qr" | "manual" | "redemption"
  claim_lat: number
  claim_lng: number
  distance_meters: number
  cafe_lat: number
  cafe_lng: number
  is_verified: boolean
  verification_note: string | null
  created_at: string
}

export type CrawlStats = {
  totalRegistrants: number
  totalStamps: number
  tierBreakdown: Array<{
    name: string
    tier_order: number
    completions: number
  }>
}

export type CafeSearchResult = {
  id: string
  name: string
  address: string | null
  neighborhood: string | null
}

export type StampLogEntry = CrawlStamp & {
  username: string
  avatar_url: string | null
  cafe_name: string
  cafe_lat: number
  cafe_lng: number
  stop_order: number
  stop_label: string | null
  tier: string
}

export type StopOption = {
  id: string
  stop_order: number
  label: string | null
  tier: string
  cafe_id: string
  cafe_name: string
}

export type ProfileSearchResult = {
  id: string
  username: string
  avatar_url: string | null
}

const VALID_TRANSITIONS: Record<CrawlStatus, CrawlStatus[]> = {
  draft: ["active"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export function isValidTransition(
  from: CrawlStatus,
  to: CrawlStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
