// Coffee gallery moderation. Shapes of public.user_photos and
// public.photo_reports (nook-supabase migrations 20261005090000,
// 20261005110000 and 20261008130000).

export type PhotoModerationStatus = "visible" | "hidden" | "removed"
export type PhotoSource = "rank" | "review" | "gallery" | "crawl"
export type PhotoReportStatus = "pending" | "resolved" | "dismissed"
// Must match the CHECK on photo_reports.reason.
export type PhotoReportReason = "offensive" | "not_coffee" | "spam" | "other"

export type PersonMini = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  is_suspended: boolean
}

export type CafeMini = {
  id: string
  name: string
  area: string | null
}

export type GalleryPhoto = {
  id: string
  image_url: string
  drink_name: string | null
  caption: string | null
  source: PhotoSource
  source_id: string | null
  is_hidden: boolean
  moderation_status: PhotoModerationStatus
  moderated_at: string | null
  taken_at: string
  created_at: string
  cafe: CafeMini
  owner: PersonMini
  /** Reports still waiting on a decision. */
  open_reports: number
}

export type ReportedPhoto = GalleryPhoto & {
  reasons: { reason: PhotoReportReason; count: number }[]
  reporters: PersonMini[]
  first_reported_at: string
  last_reported_at: string
  /** The latest open report's own words, if the reporter wrote any. */
  latest_details: string | null
}

export type PhotoReport = {
  id: string
  reason: PhotoReportReason
  details: string | null
  status: PhotoReportStatus
  created_at: string
  reporter: PersonMini
  resolved_at: string | null
  resolved_by: PersonMini | null
  resolution_note: string | null
}

export type PhotoHistoryEvent = {
  id: string
  action: string
  created_at: string
  actor: PersonMini | null
  note: string | null
  count: number | null
}

export type PhotoDetail = GalleryPhoto & {
  pin_order: number | null
  moderated_by: PersonMini | null
  reports: PhotoReport[]
  history: PhotoHistoryEvent[]
  owner_stats: {
    joined_at: string | null
    photos: number
    removed: number
    open_reports: number
  }
  /** For source = 'review': the review the photo came from. */
  review: {
    id: string
    content: string | null
    rating: number | null
    moderation_status: string
  } | null
}

export type GalleryCounts = {
  /** Photos with at least one open report. */
  reported: number
  /** Open reports across all photos. */
  open_reports: number
  all: number
  visible: number
  removed: number
  hidden_by_owner: number
}

export const PHOTO_REASON_LABELS: Record<PhotoReportReason, string> = {
  offensive: "Offensive",
  not_coffee: "Not coffee",
  spam: "Spam",
  other: "Other",
}

export const PHOTO_SOURCE_LABELS: Record<PhotoSource, string> = {
  rank: "Ranking",
  review: "Review",
  gallery: "Gallery",
  crawl: "Crawl",
}

export function photoReasonLabel(reason: string) {
  return PHOTO_REASON_LABELS[reason as PhotoReportReason] ?? reason
}
