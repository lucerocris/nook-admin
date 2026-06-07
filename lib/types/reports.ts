export type ReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "rejected"

export type ReviewStatus = "visible" | "hidden" | "removed"

export type ReportReason =
  | "spam"
  | "off_topic"
  | "harassment"
  | "hate_speech"
  | "false_information"
  | "inappropriate"
  | "conflict_of_interest"
  | "other"

export type ModerationActionType =
  | "submitted"
  | "marked_under_review"
  | "hidden"
  | "removed"
  | "restored"
  | "warned"
  | "suspended"
  | "unsuspended"
  | "rejected"
  | "resolved"

export type ReporterProfile = {
  id: string
  full_name: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  review_count: number
}

export type ReportCafe = {
  id: string
  name: string
  neighborhood: string | null
  city: string | null
  featured_image_url: string | null
  owner_email: string | null
  rating: number | null
  review_count: number
}

export type ReportReviewer = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  review_count: number
}

export type ReportReview = {
  id: string
  rating: number
  content: string
  created_at: string
  status: ReviewStatus
  photo_urls: string[]
  reviewer: ReportReviewer
}

export type ReportEvidence = {
  id: string
  url: string
  type: "image" | "screenshot"
}

export type ModerationEvent = {
  id: string
  type: ModerationActionType
  label: string
  description: string | null
  created_at: string
  admin: {
    id: string
    full_name: string | null
    username: string | null
  } | null
}

export type ReportRow = {
  id: string
  short_id: string
  status: ReportStatus
  reason: ReportReason
  description: string
  created_at: string
  resolved_at: string | null
  resolved_by_admin_id: string | null
  cafe: ReportCafe
  reporter: ReporterProfile
  review: ReportReview
  evidence: ReportEvidence[]
  history: ModerationEvent[]
}

export type ReportsQueueFilter = {
  search: string
  status: ReportStatus | "active" | "all"
  sort: "oldest" | "newest" | "cafe_az"
  page: number
}

export type ReportsMetrics = {
  pendingCount: number
  underReviewCount: number
  resolvedThisWeekCount: number
}
