export type ReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "rejected"

export type ReviewStatus = "visible" | "hidden" | "removed"

// Reason codes are stored in the DB as `reason_code` on review_reports and
// constrained to the values defined in the schema. The list below must stay
// in lockstep with the CHECK constraint on that column.
export type ReportReason =
  | "spam"
  | "fake_review"
  | "harassment"
  | "hate_speech"
  | "off_topic"
  | "conflict_of_interest"
  | "impersonation"
  | "privacy_violation"
  | "inappropriate_content"
  | "other"

// DB action enum on review_moderation_actions. The `under_review` value
// was added in migration 20260607120000_moderation_actions.sql to cover
// the "mark under review" audit event.
export type ModerationActionTypeDb =
  | "hide"
  | "restore"
  | "remove"
  | "warn_user"
  | "suspend_user"
  | "under_review"

// Resolution type stored on review_reports after a terminal decision.
export type ReportResolutionType =
  | "valid_report"
  | "invalid_report"
  | "insufficient_evidence"
  | "owner_abuse"
  | null

// UI-facing event types. The DTO mapper converts DB action values to these
// (e.g. action="hide" → event.type="hidden"). `submitted` and the implicit
// terminal events are synthesized at the DTO boundary, not stored.
export type ModerationEventType =
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
  type: ModerationEventType
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
