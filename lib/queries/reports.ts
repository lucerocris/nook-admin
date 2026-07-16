import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"
import type {
  ReportRow,
  ReportStatus,
  ReportsMetrics,
} from "@/lib/types/reports"
import {
  buildShortId,
  getReasonLabel,
  mapReportRow,
  type HistoryRowDb,
  type ProfileMini,
  type ReportRowDb,
  type ReviewCountsByUserId,
} from "@/lib/queries/reports.dto"

export { getReasonLabel, buildShortId }

const PAGE_SIZE = 20

export type GetReportsParams = {
  search?: string
  status?: string
  sort?: string
  page?: string | number
}

export type GetReportsResult = {
  reports: ReportRow[]
  total: number
  totalPages: number
  page: number
}

// =============================================================================
// Helpers
// =============================================================================

function toInList(values: string[]): string {
  // PostgREST in.(...) requires comma-separated quoted values: "a","b"
  return values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")
}

function parseStatus(raw: string | undefined): ReportStatus | "active" | "all" {
  if (!raw) return "active"
  const normalized = raw.toLowerCase()
  if (normalized === "all") return "all"
  if (normalized === "active") return "active"
  if (
    normalized === "pending" ||
    normalized === "under_review" ||
    normalized === "resolved" ||
    normalized === "rejected"
  ) {
    return normalized
  }
  return "active"
}

function parseSort(raw: string | undefined): "oldest" | "newest" | "cafe_az" {
  if (raw === "newest" || raw === "cafe_az") return raw
  return "oldest"
}

function parsePage(raw: string | number | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

// =============================================================================
// Search: resolve matching cafe_ids / user_ids / review_ids in parallel
// =============================================================================

type SearchLookups = {
  cafeIds: string[]
  userIds: string[]
  reviewIds: string[]
}

async function lookupSearchTargets(
  supabase: ReturnType<typeof createAdminClient>,
  search: string
): Promise<SearchLookups> {
  const like = `%${search}%`

  const [cafes, profiles, reviewsByContent] = await Promise.all([
    supabase.from("cafes").select("id").ilike("name", like),
    supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.${like},username.ilike.${like},email.ilike.${like}`),
    supabase.from("reviews").select("id").ilike("content", like),
  ])

  if (cafes.error) throw cafes.error
  if (profiles.error) throw profiles.error
  if (reviewsByContent.error) throw reviewsByContent.error

  const cafeIds = (cafes.data ?? []).map((r) => r.id)
  const userIds = (profiles.data ?? []).map((r) => r.id)

  // For reviewer-name matches: reviews where user_id is in the matched profiles.
  // We expand this to a list of review_ids so it can be merged with the
  // content-matched review_ids.
  let reviewerReviewIds: string[] = []
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id")
      .in("user_id", userIds)
    if (error) throw error
    reviewerReviewIds = (data ?? []).map((r) => r.id)
  }

  const reviewIds = Array.from(
    new Set([
      ...((reviewsByContent.data ?? []).map((r) => r.id)),
      ...reviewerReviewIds,
    ])
  )

  return { cafeIds, userIds, reviewIds }
}

function buildSearchOrFilter(targets: SearchLookups): string | null {
  const parts: string[] = []
  if (targets.cafeIds.length > 0) {
    parts.push(`cafe_id.in.(${toInList(targets.cafeIds)})`)
  }
  if (targets.userIds.length > 0) {
    parts.push(`reporter_id.in.(${toInList(targets.userIds)})`)
  }
  if (targets.reviewIds.length > 0) {
    parts.push(`review_id.in.(${toInList(targets.reviewIds)})`)
  }
  return parts.length > 0 ? parts.join(",") : null
}

// =============================================================================
// Review count aggregation for a set of user_ids
// =============================================================================

async function getReviewCountsByUserIds(
  supabase: ReturnType<typeof createAdminClient>,
  userIds: string[]
): Promise<ReviewCountsByUserId> {
  const map = new Map<string, number>()
  if (userIds.length === 0) return map

  const { data, error } = await supabase
    .from("reviews")
    .select("user_id")
    .in("user_id", userIds)

  if (error) throw error

  for (const row of data ?? []) {
    if (!row.user_id) continue
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1)
  }
  return map
}

function collectUserIdsFromReportRows(rows: ReportRowDb[]): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter
    if (reporter?.id) ids.add(reporter.id)
    const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews
    const reviewer = review ? Array.isArray(review.profiles) ? review.profiles[0] : review.profiles : null
    if (reviewer?.id) ids.add(reviewer.id)
  }
  return Array.from(ids)
}

// =============================================================================
// getReports — queue page
// =============================================================================

export async function getReports(
  params: GetReportsParams = {}
): Promise<GetReportsResult> {
  const supabase = createAdminClient()
  const search = (params.search ?? "").trim()
  const status = parseStatus(params.status)
  const sort = parseSort(params.sort)
  const page = parsePage(params.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let searchTargets: SearchLookups | null = null
  if (search) {
    searchTargets = await lookupSearchTargets(supabase, search)
    const allEmpty =
      searchTargets.cafeIds.length === 0 &&
      searchTargets.userIds.length === 0 &&
      searchTargets.reviewIds.length === 0
    if (allEmpty) {
      return { reports: [], total: 0, totalPages: 0, page }
    }
  }

  // Base select string — single round trip with nested joins.
  const SELECT = `
    id,
    status,
    reason_code,
    description,
    evidence_urls,
    created_at,
    reviewed_at,
    reviewed_by,
    cafes!review_reports_cafe_id_fkey (
      id, name, neighborhood, city, featured_image_url, rating, review_count
    ),
    reporter:profiles!review_reports_reporter_id_fkey (
      id, full_name, username, email, avatar_url, created_at
    ),
    reviews!review_reports_review_id_fkey (
      id, rating, content, photo_urls, moderation_status, created_at, user_id,
      reviewer:profiles!reviews_user_id_fkey (
        id, full_name, username, avatar_url
      )
    )
  `

  let countQuery = supabase
    .from("review_reports")
    .select("id", { count: "exact", head: true })

  let dataQuery = supabase
    .from("review_reports")
    .select(SELECT)
    .order("created_at", { ascending: sort === "oldest" })
    .range(from, to)

  if (sort === "cafe_az") {
    dataQuery = dataQuery
      .order("name", { ascending: true, foreignTable: "cafes" })
      .order("created_at", { ascending: true })
  }

  // Status filter
  if (status === "active") {
    countQuery = countQuery.in("status", ["pending", "under_review"])
    dataQuery = dataQuery.in("status", ["pending", "under_review"])
  } else if (status !== "all") {
    countQuery = countQuery.eq("status", status)
    dataQuery = dataQuery.eq("status", status)
  }

  // Search filter
  if (searchTargets) {
    const orExpr = buildSearchOrFilter(searchTargets)
    if (orExpr) {
      countQuery = countQuery.or(orExpr)
      dataQuery = dataQuery.or(orExpr)
    }
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])
  if (countResult.error) throw countResult.error
  if (dataResult.error) throw dataResult.error

  const rows = (dataResult.data ?? []) as unknown as ReportRowDb[]
  const userIds = collectUserIdsFromReportRows(rows)
  const reviewCounts = await getReviewCountsByUserIds(supabase, userIds)

  const reports = rows.map((row) => mapReportRow({ row: row as never, reviewCounts }))

  const total = countResult.count ?? 0
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0
  return { reports, total, totalPages, page }
}

// =============================================================================
// getReportById — details page
// =============================================================================

export async function getReportById(id: string): Promise<ReportRow | null> {
  const supabase = createAdminClient()

  const SELECT = `
    id,
    status,
    reason_code,
    description,
    evidence_urls,
    created_at,
    reviewed_at,
    reviewed_by,
    cafes!review_reports_cafe_id_fkey (
      id, name, neighborhood, city, featured_image_url, rating, review_count
    ),
    reporter:profiles!review_reports_reporter_id_fkey (
      id, full_name, username, email, avatar_url, created_at
    ),
    reviews!review_reports_review_id_fkey (
      id, rating, content, photo_urls, moderation_status, created_at, user_id,
      reviewer:profiles!reviews_user_id_fkey (
        id, full_name, username, avatar_url
      )
    )
  `

  const { data, error } = await supabase
    .from("review_reports")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as ReportRowDb

  // Collect IDs for the parallel follow-up queries.
  const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter
  const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews
  const reviewer = review ? Array.isArray(review.profiles) ? review.profiles[0] : review.profiles : null
  const cafe = Array.isArray(row.cafes) ? row.cafes[0] : row.cafes
  const reviewId = review?.id ?? null

  const userIds = [reporter?.id, reviewer?.id].filter((x): x is string => Boolean(x))

  const reviewCountsPromise = getReviewCountsByUserIds(supabase, userIds)

  const historyPromise = reviewId
    ? supabase
        .from("review_moderation_actions")
        .select("id, action, reason, metadata, created_at, moderator_id")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: [], error: null })

  const resolvedByProfilePromise = row.reviewed_by
    ? supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("id", row.reviewed_by)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [
    reviewCountsResult,
    historyResult,
    resolvedByResult,
  ] = await Promise.all([
    reviewCountsPromise,
    historyPromise,
    resolvedByProfilePromise,
  ])

  if (historyResult.error) throw historyResult.error

  const history = (historyResult.data ?? []) as unknown as HistoryRowDb[]

  // Collect distinct moderator_ids and resolved_by_id, then look up their
  // profiles in a single batched query.
  const moderatorIds = new Set<string>()
  for (const row of history) {
    if (row.moderator_id) moderatorIds.add(row.moderator_id)
  }
  if (row.reviewed_by) moderatorIds.add(row.reviewed_by)

  const moderatorProfilesPromise = moderatorIds.size > 0
    ? supabase
        .from("profiles")
        .select("id, full_name, username, email")
        .in("id", Array.from(moderatorIds))
    : Promise.resolve({ data: [], error: null })

  const moderatorProfilesResult = await moderatorProfilesPromise
  if (moderatorProfilesResult.error) throw moderatorProfilesResult.error

  const profileRows = (moderatorProfilesResult.data ?? []) as Array<
    ProfileMini & { email?: string | null }
  >
  const moderatorProfileMap = new Map<string, ProfileMini>()
  for (const p of profileRows) {
    moderatorProfileMap.set(p.id, p)
  }

  return mapReportRow({
    row: row as never,
    reviewCounts: reviewCountsResult,
    history,
    moderatorProfiles: moderatorProfileMap,
    ownerEmail: null,
    synthesizeEvents: true,
    resolvedByProfile: (resolvedByResult.data as never) ?? null,
  })
}

// =============================================================================
// getReportsMetrics — sidebar badge + dashboard card
// =============================================================================

// Was 3 counts, and the admin layout and the dashboard page each called this
// independently — 6 round trips per dashboard render. Now derived from the
// request-cached summary, so layout + page share a single call.
export async function getReportsMetrics(): Promise<ReportsMetrics> {
  const summary = await getAdminDashboardSummary()

  return {
    pendingCount: summary.reports.by_status.pending ?? 0,
    underReviewCount: summary.reports.by_status.under_review ?? 0,
    resolvedThisWeekCount: summary.reports.resolved_last_7d,
  }
}
