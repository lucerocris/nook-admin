import type {
  ReportRow,
  ReportsMetrics,
  ReportStatus,
  ReportReason,
} from "@/lib/types/reports"

const NOW = new Date("2026-06-07T10:00:00Z").getTime()
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function hoursAgo(h: number): string {
  return new Date(NOW - h * HOUR).toISOString()
}

function daysAgo(d: number): string {
  return new Date(NOW - d * DAY).toISOString()
}

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  off_topic: "Off-topic",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  false_information: "False information",
  inappropriate: "Inappropriate content",
  conflict_of_interest: "Conflict of interest",
  other: "Other",
}

export function getReasonLabel(reason: ReportReason): string {
  return REASON_LABELS[reason] ?? "Other"
}

const MOCK_REPORTS: ReportRow[] = [
  {
    id: "r-001",
    short_id: "R-001",
    status: "pending",
    reason: "spam",
    description:
      "This review is clearly spam. The user is posting links to a competitor's app in every review they write on Nook. We have flagged several others from the same account.",
    created_at: hoursAgo(2),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-001",
      name: "Slowpoke Coffee",
      neighborhood: "IT Park",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@slowpokecoffee.ph",
      rating: 4.6,
      review_count: 128,
    },
    reporter: {
      id: "user-001",
      full_name: "Maria Santos",
      username: "maria_s",
      email: "maria@example.com",
      avatar_url: null,
      created_at: daysAgo(420),
      review_count: 23,
    },
    review: {
      id: "rev-101",
      rating: 1,
      content:
        "Worst cafe ever. Go to competitorapp dot com for real coffee. They have a promo code NOOK50 for 50% off your first order. Best coffee in Cebu, trust me!",
      created_at: hoursAgo(3),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-100",
        full_name: "Jane Doe",
        username: "jane_d",
        avatar_url: null,
        review_count: 47,
      },
    },
    evidence: [
      {
        id: "ev-001",
        url: "/placeholder-evidence.png",
        type: "screenshot",
      },
    ],
    history: [
      {
        id: "h-001",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: hoursAgo(2),
        admin: null,
      },
    ],
  },
  {
    id: "r-002",
    short_id: "R-002",
    status: "under_review",
    reason: "off_topic",
    description:
      "The review talks about the cafe's wifi but contains no information about the actual coffee or service. It reads like a tech blog post, not a cafe review.",
    created_at: hoursAgo(5),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-002",
      name: "The Grind",
      neighborhood: "Ayala",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@thegrind.ph",
      rating: 4.4,
      review_count: 86,
    },
    reporter: {
      id: "user-002",
      full_name: "Mark Reyes",
      username: "markr",
      email: "mark@example.com",
      avatar_url: null,
      created_at: daysAgo(180),
      review_count: 12,
    },
    review: {
      id: "rev-102",
      rating: 5,
      content:
        "Excellent bandwidth. Ping was 12ms, download hit 240Mbps. Power outlets at every table. Best place to work in Cebu — way better than Coworking Plus. Five stars for the wifi.",
      created_at: hoursAgo(8),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-101",
        full_name: "Anna Lim",
        username: "anna_lim",
        avatar_url: null,
        review_count: 31,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-002",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: hoursAgo(5),
        admin: null,
      },
      {
        id: "h-003",
        type: "marked_under_review",
        label: "Marked under review",
        description: null,
        created_at: hoursAgo(1),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
    ],
  },
  {
    id: "r-003",
    short_id: "R-003",
    status: "pending",
    reason: "harassment",
    description:
      "Reviewer uses my name and makes personal attacks. I have not met this person and they have never been to my cafe. I believe this is a targeted review.",
    created_at: hoursAgo(8),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-003",
      name: "Casa Breva",
      neighborhood: "Lahug",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@casabrevah.ph",
      rating: 4.2,
      review_count: 54,
    },
    reporter: {
      id: "user-003",
      full_name: "Cafe Laguna Owner",
      username: null,
      email: "owner@casabrevah.ph",
      avatar_url: null,
      created_at: daysAgo(300),
      review_count: 0,
    },
    review: {
      id: "rev-103",
      rating: 1,
      content:
        "Owner Maria Santos is a fraud. She runs a scam business and her cafe is a front. Avoid at all costs. She stole money from my cousin. Do not trust anything on this listing.",
      created_at: hoursAgo(14),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-102",
        full_name: "Chris Tan",
        username: "chris_t",
        avatar_url: null,
        review_count: 3,
      },
    },
    evidence: [
      {
        id: "ev-002",
        url: "/placeholder-evidence-2.png",
        type: "screenshot",
      },
    ],
    history: [
      {
        id: "h-004",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: hoursAgo(8),
        admin: null,
      },
    ],
  },
  {
    id: "r-004",
    short_id: "R-004",
    status: "pending",
    reason: "false_information",
    description:
      "The review claims we use real leather seats and that we charge a cover fee on weekends. Both are factually wrong — we use fabric seats and have never charged a cover.",
    created_at: hoursAgo(14),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-004",
      name: "Brewlab",
      neighborhood: "Talamban",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "hello@brewlab.ph",
      rating: 4.7,
      review_count: 92,
    },
    reporter: {
      id: "user-004",
      full_name: "Pedro Cruz",
      username: "pedroc",
      email: "pedro@brewlab.ph",
      avatar_url: null,
      created_at: daysAgo(200),
      review_count: 4,
    },
    review: {
      id: "rev-104",
      rating: 2,
      content:
        "Cafe charges a 200 peso cover on weekends. Seats are real leather. Coffee is okay. Service is slow. Not worth the entry fee.",
      created_at: hoursAgo(20),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-103",
        full_name: "Diane Lee",
        username: "diane_l",
        avatar_url: null,
        review_count: 18,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-005",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: hoursAgo(14),
        admin: null,
      },
    ],
  },
  {
    id: "r-005",
    short_id: "R-005",
    status: "under_review",
    reason: "inappropriate",
    description:
      "Review contains explicit language and an inappropriate comparison that has nothing to do with the cafe.",
    created_at: hoursAgo(20),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-005",
      name: "IT Park Brew",
      neighborhood: "IT Park",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@itparkbrew.ph",
      rating: 4.3,
      review_count: 67,
    },
    reporter: {
      id: "user-005",
      full_name: "Janelle Ong",
      username: "janelle",
      email: "janelle@itparkbrew.ph",
      avatar_url: null,
      created_at: daysAgo(150),
      review_count: 8,
    },
    review: {
      id: "rev-105",
      rating: 1,
      content:
        "Coffee tastes like (expletive). The barista looked like a (expletive) character. Avoid this dump.",
      created_at: daysAgo(1),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-104",
        full_name: "Sam Garcia",
        username: "sam_g",
        avatar_url: null,
        review_count: 2,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-006",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: hoursAgo(20),
        admin: null,
      },
      {
        id: "h-007",
        type: "marked_under_review",
        label: "Marked under review",
        description: null,
        created_at: hoursAgo(3),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
    ],
  },
  {
    id: "r-006",
    short_id: "R-006",
    status: "pending",
    reason: "conflict_of_interest",
    description:
      "This reviewer is a barista at a competing cafe across the street. They left a 1-star review the day we opened our new location.",
    created_at: daysAgo(1),
    resolved_at: null,
    resolved_by_admin_id: null,
    cafe: {
      id: "cafe-006",
      name: "Coffee Madness",
      neighborhood: "Mango",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@coffeemadness.ph",
      rating: 4.1,
      review_count: 41,
    },
    reporter: {
      id: "user-006",
      full_name: "Lara Mendoza",
      username: "lara_m",
      email: "lara@coffeemadness.ph",
      avatar_url: null,
      created_at: daysAgo(120),
      review_count: 2,
    },
    review: {
      id: "rev-106",
      rating: 1,
      content:
        "Overpriced, subpar drinks, terrible location. Don't waste your money. Stick to actual good cafes in Cebu.",
      created_at: daysAgo(1.2),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-105",
        full_name: "Ramon Bautista",
        username: "ramon_b",
        avatar_url: null,
        review_count: 1,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-008",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: daysAgo(1),
        admin: null,
      },
    ],
  },
  {
    id: "r-007",
    short_id: "R-007",
    status: "resolved",
    reason: "spam",
    description: "Clear spam posting discount codes.",
    created_at: daysAgo(2),
    resolved_at: hoursAgo(20),
    resolved_by_admin_id: "admin-1",
    cafe: {
      id: "cafe-007",
      name: "Abaca Coffee",
      neighborhood: "Ayala",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@abaca.ph",
      rating: 4.5,
      review_count: 73,
    },
    reporter: {
      id: "user-007",
      full_name: "Bea Soriano",
      username: "bea_s",
      email: "bea@abaca.ph",
      avatar_url: null,
      created_at: daysAgo(280),
      review_count: 6,
    },
    review: {
      id: "rev-107",
      rating: 1,
      content:
        "Use code ABACA10 for 10% off at the real Abaca! This cafe is not the real Abaca, do not be fooled.",
      created_at: daysAgo(2.5),
      status: "removed",
      photo_urls: [],
      reviewer: {
        id: "user-106",
        full_name: "Tommy Cruz",
        username: "tommy_c",
        avatar_url: null,
        review_count: 89,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-009",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: daysAgo(2),
        admin: null,
      },
      {
        id: "h-010",
        type: "marked_under_review",
        label: "Marked under review",
        description: null,
        created_at: daysAgo(1.5),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
      {
        id: "h-011",
        type: "removed",
        label: "Review removed",
        description: "Confirmed spam — review removed.",
        created_at: hoursAgo(20),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
      {
        id: "h-012",
        type: "resolved",
        label: "Report resolved",
        description: null,
        created_at: hoursAgo(20),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
    ],
  },
  {
    id: "r-008",
    short_id: "R-008",
    status: "rejected",
    reason: "false_information",
    description: "The reviewer was here last week.",
    created_at: daysAgo(3),
    resolved_at: daysAgo(2),
    resolved_by_admin_id: "admin-1",
    cafe: {
      id: "cafe-008",
      name: "The Daily Grind",
      neighborhood: "Mandaue",
      city: "Cebu City",
      featured_image_url: null,
      owner_email: "owner@dailygrind.ph",
      rating: 4.0,
      review_count: 38,
    },
    reporter: {
      id: "user-008",
      full_name: "Carla Aquino",
      username: null,
      email: "carla@dailygrind.ph",
      avatar_url: null,
      created_at: daysAgo(220),
      review_count: 0,
    },
    review: {
      id: "rev-108",
      rating: 2,
      content:
        "Coffee is mediocre. Service is slow. Probably will not return, but the wifi works fine for working.",
      created_at: daysAgo(4),
      status: "visible",
      photo_urls: [],
      reviewer: {
        id: "user-107",
        full_name: "Patrick Ong",
        username: "patrick_o",
        avatar_url: null,
        review_count: 5,
      },
    },
    evidence: [],
    history: [
      {
        id: "h-013",
        type: "submitted",
        label: "Report submitted",
        description: null,
        created_at: daysAgo(3),
        admin: null,
      },
      {
        id: "h-014",
        type: "rejected",
        label: "Report rejected",
        description:
          "Review reflects the reviewer's honest experience. Does not violate Nook content guidelines.",
        created_at: daysAgo(2),
        admin: {
          id: "admin-1",
          full_name: "Super Admin",
          username: "superadmin",
        },
      },
    ],
  },
]

const PAGE_SIZE = 20

export type GetReportsParams = {
  search?: string
  status?: string
  sort?: string
  page?: string | number
}

export async function getReports(params: GetReportsParams = {}): Promise<{
  reports: ReportRow[]
  total: number
  totalPages: number
  page: number
}> {
  const search = (params.search ?? "").trim().toLowerCase()
  const rawStatus = params.status ?? "active"
  const sort = params.sort ?? "oldest"
  const safePage = Math.max(
    1,
    Number.isFinite(Number(params.page)) ? Number(params.page) : 1
  )

  let filtered = MOCK_REPORTS.slice()

  if (rawStatus === "active") {
    filtered = filtered.filter(
      (r) => r.status === "pending" || r.status === "under_review"
    )
  } else if (rawStatus !== "all") {
    filtered = filtered.filter((r) => r.status === (rawStatus as ReportStatus))
  }

  if (search) {
    filtered = filtered.filter((r) => {
      const haystack = [
        r.cafe.name,
        r.cafe.neighborhood ?? "",
        r.cafe.city ?? "",
        r.reporter.full_name ?? "",
        r.reporter.username ?? "",
        r.reporter.email ?? "",
        r.review.reviewer.full_name ?? "",
        r.review.reviewer.username ?? "",
        r.description,
        getReasonLabel(r.reason),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(search)
    })
  }

  if (sort === "oldest") {
    filtered.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  } else if (sort === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } else if (sort === "cafe_az") {
    filtered.sort((a, b) => a.cafe.name.localeCompare(b.cafe.name))
  }

  const total = filtered.length
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0
  const from = (safePage - 1) * PAGE_SIZE
  const reports = filtered.slice(from, from + PAGE_SIZE)

  return { reports, total, totalPages, page: safePage }
}

export async function getReportById(id: string): Promise<ReportRow | null> {
  return MOCK_REPORTS.find((r) => r.id === id) ?? null
}

export async function getReportsMetrics(): Promise<ReportsMetrics> {
  const weekAgo = NOW - 7 * DAY
  return {
    pendingCount: MOCK_REPORTS.filter((r) => r.status === "pending").length,
    underReviewCount: MOCK_REPORTS.filter(
      (r) => r.status === "under_review"
    ).length,
    resolvedThisWeekCount: MOCK_REPORTS.filter(
      (r) =>
        (r.status === "resolved" || r.status === "rejected") &&
        r.resolved_at &&
        new Date(r.resolved_at).getTime() >= weekAgo
    ).length,
  }
}
