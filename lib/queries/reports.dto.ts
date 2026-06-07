import type {
  ModerationActionTypeDb,
  ModerationEvent,
  ModerationEventType,
  ReportCafe,
  ReportEvidence,
  ReportReason,
  ReportResolutionType,
  ReportRow,
  ReportStatus,
  ReporterProfile,
  ReportReview,
  ReportReviewer,
  ReviewStatus,
} from "@/lib/types/reports"

// =============================================================================
// DB row shapes — what comes out of PostgREST with nested joins.
// Kept loose (`unknown` for joined children) because supabase-js does not
// generate types for our tables; we normalize them in the mappers below.
// =============================================================================

export type ProfileMini = {
  id: string
  full_name: string | null
  username: string | null
  email?: string | null
  avatar_url: string | null
  created_at?: string
}

type CafeMini = {
  id: string
  name: string
  neighborhood: string | null
  city: string | null
  featured_image_url: string | null
  rating: number | null
  review_count: number | null
}

type ReviewMini = {
  id: string
  rating: number
  content: string
  created_at: string
  photo_urls: string[] | null
  moderation_status: ReviewStatus
  user_id: string
  profiles?: ProfileMini | ProfileMini[] | null
}

export type ReportRowDb = {
  id: string
  status: ReportStatus
  reason_code: ReportReason
  description: string
  evidence_urls: string[] | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  cafes?: CafeMini | CafeMini[] | null
  reporter?: ProfileMini | ProfileMini[] | null
  reviews?: ReviewMini | ReviewMini[] | null
}

export type HistoryRowDb = {
  id: string
  action: ModerationActionTypeDb
  reason: string | null
  metadata: { decision?: string } | Record<string, unknown> | null
  created_at: string
  moderator_id: string | null
}

export type ReportRowJoinDb = ReportRowDb & {
  cafes: CafeMini
  reporter: ProfileMini | null
  reviews: ReviewMini & { profiles: ProfileMini | null }
}

// =============================================================================
// PostgREST returns joined children as either an object or a single-element
// array (when the relationship is to-many). Normalize to a single object.
// =============================================================================

function oneOrFirst<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// =============================================================================
// Action → UI event type/label/description mapping
// =============================================================================

const ACTION_TO_EVENT_TYPE: Record<ModerationActionTypeDb, ModerationEventType> = {
  hide: "hidden",
  restore: "restored",
  remove: "removed",
  warn_user: "warned",
  suspend_user: "suspended",
  under_review: "marked_under_review",
}

function resolveEventType(
  action: ModerationActionTypeDb,
  metadata: HistoryRowDb["metadata"]
): ModerationEventType {
  if (action === "restore") {
    const decision = (metadata as { decision?: string } | null)?.decision
    if (decision === "report_rejected") return "rejected"
    if (decision === "report_resolved") return "resolved"
  }
  return ACTION_TO_EVENT_TYPE[action]
}

function resolveEventLabel(eventType: ModerationEventType): string {
  switch (eventType) {
    case "hidden":
      return "Review hidden"
    case "removed":
      return "Review removed"
    case "restored":
      return "Review restored"
    case "warned":
      return "Warning issued"
    case "suspended":
      return "User suspended"
    case "marked_under_review":
      return "Marked under review"
    case "rejected":
      return "Report rejected"
    case "resolved":
      return "Report resolved"
    case "submitted":
      return "Report submitted"
    case "unsuspended":
      return "User unsuspended"
  }
}

function resolveEventDescription(
  action: ModerationActionTypeDb,
  reason: string | null,
  metadata: HistoryRowDb["metadata"]
): string | null {
  // For "rejected" events, the report's resolution_note doubles as the
  // moderator's reason on the audit row, so we surface it as the description.
  if (action === "restore") {
    const decision = (metadata as { decision?: string } | null)?.decision
    if (decision === "report_rejected") return reason
    if (decision === "report_resolved") return reason
  }
  return reason
}

// =============================================================================
// short_id — human-readable report number, derived from the UUID.
// Matches the existing UI's "R-001" / "R-0F2A" style.
// =============================================================================

export function buildShortId(id: string): string {
  if (!id) return "R-0000"
  const head = id.replace(/-/g, "").slice(0, 4).toUpperCase()
  return `R-${head}`
}

// =============================================================================
// Mini-profile → UI profile mappers
// =============================================================================

function mapReviewer(profile: ProfileMini | null, reviewCount: number): ReportReviewer {
  return {
    id: profile?.id ?? "",
    full_name: profile?.full_name ?? null,
    username: profile?.username ?? null,
    avatar_url: profile?.avatar_url ?? null,
    review_count: reviewCount,
  }
}

function mapReporter(profile: ProfileMini | null, reviewCount: number): ReporterProfile {
  return {
    id: profile?.id ?? "",
    full_name: profile?.full_name ?? null,
    username: profile?.username ?? null,
    email: profile?.email ?? null,
    avatar_url: profile?.avatar_url ?? null,
    created_at: profile?.created_at ?? new Date(0).toISOString(),
    review_count: reviewCount,
  }
}

function mapCafe(
  cafe: CafeMini | null,
  ownerEmail: string | null
): ReportCafe {
  return {
    id: cafe?.id ?? "",
    name: cafe?.name ?? "Unknown cafe",
    neighborhood: cafe?.neighborhood ?? null,
    city: cafe?.city ?? null,
    featured_image_url: cafe?.featured_image_url ?? null,
    owner_email: ownerEmail,
    rating: cafe?.rating ?? null,
    review_count: cafe?.review_count ?? 0,
  }
}

function mapReview(
  review: ReviewMini | null,
  reviewerReviewCount: number
): ReportReview {
  const reviewerProfile = oneOrFirst(review?.profiles ?? null)
  return {
    id: review?.id ?? "",
    rating: review?.rating ?? 0,
    content: review?.content ?? "",
    created_at: review?.created_at ?? new Date(0).toISOString(),
    status: (review?.moderation_status ?? "visible") as ReviewStatus,
    photo_urls: Array.isArray(review?.photo_urls) ? (review!.photo_urls as string[]) : [],
    reviewer: mapReviewer(reviewerProfile, reviewerReviewCount),
  }
}

function mapEvidence(urls: string[] | null | undefined): ReportEvidence[] {
  if (!urls || urls.length === 0) return []
  return urls.map((url) => ({
    id: url,
    url,
    type: "image" as const,
  }))
}

// =============================================================================
// History event mapping
// =============================================================================

export type ModeratorProfilesById = Map<string, ProfileMini>

function mapHistoryEvent(
  row: HistoryRowDb,
  moderatorProfiles: ModeratorProfilesById
): ModerationEvent {
  // `review_moderation_actions.moderator_id` has no FK to profiles in the
  // current schema, so the join can't happen in PostgREST. The query layer
  // fetches moderator profiles separately and passes them in as a map.
  const moderatorId = (row as unknown as { moderator_id?: string | null })
    .moderator_id
  const moderator = moderatorId ? moderatorProfiles.get(moderatorId) ?? null : null
  const eventType = resolveEventType(row.action, row.metadata)
  return {
    id: row.id,
    type: eventType,
    label: resolveEventLabel(eventType),
    description: resolveEventDescription(row.action, row.reason, row.metadata),
    created_at: row.created_at,
    admin: moderator
      ? {
          id: moderator.id,
          full_name: moderator.full_name,
          username: moderator.username,
        }
      : null,
  }
}

// =============================================================================
// Top-level row mapper
// =============================================================================

export type ReviewCountsByUserId = Map<string, number>

export type MapReportRowParams = {
  row: ReportRowJoinDb
  reviewCounts?: ReviewCountsByUserId
  history?: HistoryRowDb[]
  moderatorProfiles?: ModeratorProfilesById
  ownerEmail?: string | null
  /**
   * If true, synthesize a `submitted` event from the report's created_at
   * and (if the report is finalized) a `rejected` / `resolved` event from
   * its terminal state. Used for the details page.
   */
  synthesizeEvents?: boolean
  /**
   * Profile of the moderator who finalized the report, used to populate
   * the synthetic terminal event's `admin` field.
   */
  resolvedByProfile?: ProfileMini | null
}

export function mapReportRow(params: MapReportRowParams): ReportRow {
  const { row, reviewCounts, history, moderatorProfiles, ownerEmail, synthesizeEvents, resolvedByProfile } = params
  const reviewCountsMap = reviewCounts ?? new Map<string, number>()

  const cafe = oneOrFirst(row.cafes as CafeMini | CafeMini[] | null | undefined) as CafeMini | null
  const reporter = oneOrFirst(row.reporter as ProfileMini | ProfileMini[] | null | undefined) as ProfileMini | null
  const review = oneOrFirst(row.reviews as ReviewMini | ReviewMini[] | null | undefined) as ReviewMini | null
  const reviewerProfile = oneOrFirst(review?.profiles ?? null) as ProfileMini | null

  const reporterCount = reporter ? (reviewCountsMap.get(reporter.id) ?? 0) : 0
  const reviewerCount = reviewerProfile ? (reviewCountsMap.get(reviewerProfile.id) ?? 0) : 0

  const events: ModerationEvent[] = (history ?? []).map((row) =>
    mapHistoryEvent(row, moderatorProfiles ?? new Map())
  )

  if (synthesizeEvents) {
    events.unshift({
      id: `${row.id}::submitted`,
      type: "submitted",
      label: "Report submitted",
      description: null,
      created_at: row.created_at,
      admin: null,
    })

    // If the report was finalized before this convention added audit rows
    // for the terminal decision, synthesize a `rejected` / `resolved` event
    // from the report's terminal fields so the history reads complete.
    if (row.reviewed_at && row.reviewed_by) {
      const hasTerminal = events.some(
        (e) => e.type === "rejected" || e.type === "resolved"
      )
      if (!hasTerminal) {
        const type: ModerationEventType = row.status === "rejected" ? "rejected" : "resolved"
        events.push({
          id: `${row.id}::terminal`,
          type,
          label: resolveEventLabel(type),
          description: null,
          created_at: row.reviewed_at,
          admin: resolvedByProfile
            ? {
                id: resolvedByProfile.id,
                full_name: resolvedByProfile.full_name,
                username: resolvedByProfile.username,
              }
            : null,
        })
      }
    }
  }

  return {
    id: row.id,
    short_id: buildShortId(row.id),
    status: row.status,
    reason: row.reason_code,
    description: row.description ?? "",
    created_at: row.created_at,
    resolved_at: row.reviewed_at,
    resolved_by_admin_id: row.reviewed_by,
    cafe: mapCafe(cafe, ownerEmail ?? null),
    reporter: mapReporter(reporter, reporterCount),
    review: mapReview(review, reviewerCount),
    evidence: mapEvidence(row.evidence_urls),
    history: events,
  }
}

// =============================================================================
// Reason label — single source of truth, used by queue + details pages.
// =============================================================================

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  fake_review: "Fake review",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  off_topic: "Off-topic",
  conflict_of_interest: "Conflict of interest",
  impersonation: "Impersonation",
  privacy_violation: "Privacy violation",
  inappropriate_content: "Inappropriate content",
  other: "Other",
}

export function getReasonLabel(reason: ReportReason): string {
  return REASON_LABELS[reason] ?? "Other"
}

// =============================================================================
// Resolution type → human label, for audit history (if surfaced later).
// =============================================================================

const RESOLUTION_LABELS: Record<NonNullable<ReportResolutionType>, string> = {
  valid_report: "Valid report",
  invalid_report: "Invalid report",
  insufficient_evidence: "Insufficient evidence",
  owner_abuse: "Owner abuse",
}

export function getResolutionLabel(resolution: ReportResolutionType): string {
  return resolution ? RESOLUTION_LABELS[resolution] : ""
}
