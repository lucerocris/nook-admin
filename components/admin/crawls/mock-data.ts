export type CrawlStatus = "draft" | "active" | "completed" | "cancelled"

export type MockCrawl = {
  id: string
  title: string
  description: string
  slug: string
  status: CrawlStatus
  city: string
  starts_at: string
  ends_at: string
  cover_image_url: string | null
  is_featured: boolean
  total_stops: number
}

export type MockCrawlTier = {
  id: string
  crawl_id: string
  name: string
  slug: string
  description: string
  completion_copy: string
  tier_order: number
  required_tier_tags: string[]
  badge_image_url: string | null
}

export type MockCrawlStop = {
  id: string
  crawl_id: string
  cafe_name: string
  stop_order: number
  tier: string
  is_active: boolean
  label: string | null
}

export const MOCK_CRAWLS: MockCrawl[] = [
  {
    id: "crawl-1",
    title: "Cebu Island Crawl 2026",
    description:
      "Explore the best cafes across Cebu Island. From the bustling city to the quiet northern towns, this crawl takes you on a caffeinated journey through the Queen City of the South.",
    slug: "cebu-island-crawl-2026",
    status: "active",
    city: "Cebu City",
    starts_at: "2026-07-01T00:00:00",
    ends_at: "2026-08-31T23:59:59",
    cover_image_url: null,
    is_featured: true,
    total_stops: 6,
  },
  {
    id: "crawl-2",
    title: "Ayala Mall Café Trail",
    description:
      "A curated trail through the best cafés inside Ayala Center Cebu. Perfect for a weekend mall crawl with friends.",
    slug: "ayala-mall-cafe-trail",
    status: "draft",
    city: "Cebu City",
    starts_at: "2026-08-01T00:00:00",
    ends_at: "2026-09-30T23:59:59",
    cover_image_url: null,
    is_featured: false,
    total_stops: 5,
  },
  {
    id: "crawl-3",
    title: "Carcar Heritage Crawl",
    description:
      "A heritage-themed crawl through the historic town of Carcar. Enjoy classic cafes and local delicacies.",
    slug: "carcar-heritage-crawl",
    status: "completed",
    city: "Carcar",
    starts_at: "2026-03-01T00:00:00",
    ends_at: "2026-04-30T23:59:59",
    cover_image_url: null,
    is_featured: false,
    total_stops: 8,
  },
]

export const MOCK_TIERS: MockCrawlTier[] = [
  {
    id: "tier-1",
    crawl_id: "crawl-1",
    name: "City Explorer",
    slug: "city-explorer",
    description:
      "Complete the city stops to earn this badge. A warm-up for the island adventure ahead.",
    completion_copy: "You've conquered the city!",
    tier_order: 1,
    required_tier_tags: ["city"],
    badge_image_url: null,
  },
  {
    id: "tier-2",
    crawl_id: "crawl-1",
    name: "Island Crawler",
    slug: "island-crawler",
    description:
      "Venture beyond the city and explore metro and southern cafes.",
    completion_copy: "You explored the island!",
    tier_order: 2,
    required_tier_tags: ["city", "metro", "south"],
    badge_image_url: null,
  },
  {
    id: "tier-3",
    crawl_id: "crawl-1",
    name: "Island Run",
    slug: "island-run",
    description:
      "The ultimate challenge — visit every cafe across all four regions.",
    completion_copy: "You ran the whole island!",
    tier_order: 3,
    required_tier_tags: ["city", "metro", "south", "north"],
    badge_image_url: null,
  },
]

export const MOCK_STOPS: MockCrawlStop[] = [
  {
    id: "stop-1",
    crawl_id: "crawl-1",
    cafe_name: "Cafe Georg",
    stop_order: 1,
    tier: "city",
    is_active: true,
    label: null,
  },
  {
    id: "stop-2",
    crawl_id: "crawl-1",
    cafe_name: "Tamp",
    stop_order: 2,
    tier: "city",
    is_active: true,
    label: null,
  },
  {
    id: "stop-3",
    crawl_id: "crawl-1",
    cafe_name: "Kof",
    stop_order: 3,
    tier: "metro",
    is_active: true,
    label: null,
  },
  {
    id: "stop-4",
    crawl_id: "crawl-1",
    cafe_name: "Common Room",
    stop_order: 4,
    tier: "metro",
    is_active: true,
    label: "Matcha time",
  },
  {
    id: "stop-5",
    crawl_id: "crawl-1",
    cafe_name: "Cebu Union",
    stop_order: 5,
    tier: "south",
    is_active: false,
    label: null,
  },
  {
    id: "stop-6",
    crawl_id: "crawl-1",
    cafe_name: "Kuppa",
    stop_order: 6,
    tier: "north",
    is_active: true,
    label: null,
  },
]
