import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import { escapeLikePattern } from "@/lib/utils"
import type {
  CafeMini,
  GalleryCounts,
  GalleryPhoto,
  PersonMini,
  PhotoDetail,
  PhotoHistoryEvent,
  PhotoModerationStatus,
  PhotoReport,
  PhotoReportReason,
  PhotoReportStatus,
  PhotoSource,
  ReportedPhoto,
} from "@/lib/types/gallery"

// Reads for the Gallery moderation pages. user_photos and photo_reports are
// service-role only for anyone but the owner/reporter (see the migrations), so
// every read here uses the admin client; the pages sit behind the /admin
// middleware and the writes go through superadmin-gated RPCs.

export const GALLERY_PAGE_SIZE = 20

type Admin = ReturnType<typeof createAdminClient>

const PHOTO_COLUMNS =
  "id, user_id, cafe_id, image_url, drink_name, caption, source, source_id, is_hidden, pin_order, moderation_status, moderated_at, moderated_by, taken_at, created_at, cafes ( id, name, neighborhood, city )"

type PhotoRowDb = {
  id: string
  user_id: string
  cafe_id: string
  image_url: string
  drink_name: string | null
  caption: string | null
  source: PhotoSource
  source_id: string | null
  is_hidden: boolean
  pin_order: number | null
  moderation_status: PhotoModerationStatus
  moderated_at: string | null
  moderated_by: string | null
  taken_at: string
  created_at: string
  cafes:
    | { id: string; name: string; neighborhood: string | null; city: string | null }
    | { id: string; name: string; neighborhood: string | null; city: string | null }[]
    | null
}

type ReportRowDb = {
  id: string
  photo_id: string
  reporter_id: string
  reason: PhotoReportReason
  details: string | null
  status: PhotoReportStatus
  created_at: string
  resolved_at?: string | null
  resolved_by?: string | null
  resolution_note?: string | null
}

// ---------------------------------------------------------------------------
// Helpers

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function parsePage(raw: string | number | undefined) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function unknownPerson(id: string): PersonMini {
  return { id, username: null, full_name: null, avatar_url: null, is_suspended: false }
}

async function getPeople(supabase: Admin, ids: string[]): Promise<Map<string, PersonMini>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const map = new Map<string, PersonMini>()
  if (unique.length === 0) return map
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_suspended")
    .in("id", unique)
  if (error) throw error
  for (const p of data ?? []) {
    map.set(p.id as string, {
      id: p.id as string,
      username: (p.username as string | null) ?? null,
      full_name: (p.full_name as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      is_suspended: p.is_suspended === true,
    })
  }
  return map
}

function toCafe(row: PhotoRowDb): CafeMini {
  const cafe = one(row.cafes)
  return {
    id: row.cafe_id,
    name: cafe?.name ?? "Unknown café",
    area: [cafe?.neighborhood, cafe?.city].filter(Boolean).join(", ") || null,
  }
}

function toPhoto(row: PhotoRowDb, people: Map<string, PersonMini>, openReports: number): GalleryPhoto {
  return {
    id: row.id,
    image_url: row.image_url,
    drink_name: row.drink_name,
    caption: row.caption,
    source: row.source,
    source_id: row.source_id,
    is_hidden: row.is_hidden,
    moderation_status: row.moderation_status,
    moderated_at: row.moderated_at,
    taken_at: row.taken_at,
    created_at: row.created_at,
    cafe: toCafe(row),
    owner: people.get(row.user_id) ?? unknownPerson(row.user_id),
    open_reports: openReports,
  }
}

/** "@ana" or "ana_r" → user ids whose username matches. Null when no search. */
async function usersMatching(supabase: Admin, search: string | undefined): Promise<string[] | null> {
  const q = search?.trim().replace(/^@+/, "")
  if (!q) return null
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", `%${escapeLikePattern(q)}%`)
    .limit(200)
  if (error) throw error
  return (data ?? []).map((p) => p.id as string)
}

async function openReportCounts(supabase: Admin, photoIds: string[]) {
  const counts = new Map<string, number>()
  if (photoIds.length === 0) return counts
  const { data, error } = await supabase
    .from("photo_reports")
    .select("photo_id")
    .eq("status", "pending")
    .in("photo_id", photoIds)
  if (error) throw error
  for (const r of data ?? []) {
    const id = r.photo_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

// ---------------------------------------------------------------------------
// Counts (tabs, sidebar badge, dashboard)

/** Request-cached: the admin layout (sidebar badge), the dashboard and the
 *  gallery page all read it. */
export const getGalleryCounts = cache(async (): Promise<GalleryCounts> => {
  const supabase = createAdminClient()
  const head = { count: "exact" as const, head: true }
  const [open, all, visible, removed, hidden] = await Promise.all([
    supabase.from("photo_reports").select("photo_id").eq("status", "pending").limit(5000),
    supabase.from("user_photos").select("id", head),
    supabase.from("user_photos").select("id", head).eq("moderation_status", "visible"),
    supabase.from("user_photos").select("id", head).neq("moderation_status", "visible"),
    supabase.from("user_photos").select("id", head).eq("is_hidden", true),
  ])
  for (const r of [open, all, visible, removed, hidden]) if (r.error) throw r.error
  const openRows = open.data ?? []
  return {
    reported: new Set(openRows.map((r) => r.photo_id as string)).size,
    open_reports: openRows.length,
    all: all.count ?? 0,
    visible: visible.count ?? 0,
    removed: removed.count ?? 0,
    hidden_by_owner: hidden.count ?? 0,
  }
})

/** Cafés that have gallery photos, for the café filter. */
export async function getGalleryCafes(): Promise<CafeMini[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("user_photos")
    .select("cafe_id, cafes ( id, name, neighborhood, city )")
    .limit(2000)
  if (error) throw error
  const map = new Map<string, CafeMini>()
  for (const row of (data ?? []) as unknown as Pick<PhotoRowDb, "cafe_id" | "cafes">[]) {
    if (map.has(row.cafe_id)) continue
    map.set(row.cafe_id, toCafe(row as PhotoRowDb))
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** The one person a ?user= filter names, for its chip. */
export async function getPerson(userId: string | undefined): Promise<PersonMini | null> {
  if (!isUuid(userId)) return null
  const people = await getPeople(createAdminClient(), [userId])
  return people.get(userId) ?? null
}

// ---------------------------------------------------------------------------
// Reported queue: open reports, grouped per photo

export type ReportedSort = "oldest" | "newest" | "most"

export async function getReportedPhotos(params: {
  search?: string
  cafe?: string
  user?: string
  sort?: string
  page?: string
}): Promise<{ photos: ReportedPhoto[]; total: number; totalPages: number; page: number }> {
  const supabase = createAdminClient()
  const sort: ReportedSort = params.sort === "newest" || params.sort === "most" ? params.sort : "oldest"

  const { data: reportRows, error } = await supabase
    .from("photo_reports")
    .select("id, photo_id, reporter_id, reason, details, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5000)
  if (error) throw error

  const groups = new Map<string, ReportRowDb[]>()
  for (const r of (reportRows ?? []) as ReportRowDb[]) {
    const list = groups.get(r.photo_id) ?? []
    list.push(r)
    groups.set(r.photo_id, list)
  }

  // Photo rows for every reported photo, then the filters on them. The queue
  // is small (one row per reported photo), so filtering here is cheaper than
  // a second round of joins.
  const photoIds = [...groups.keys()]
  const photoRows: PhotoRowDb[] = []
  for (let i = 0; i < photoIds.length; i += 200) {
    const { data, error: photoError } = await supabase
      .from("user_photos")
      .select(PHOTO_COLUMNS)
      .in("id", photoIds.slice(i, i + 200))
    if (photoError) throw photoError
    photoRows.push(...((data ?? []) as unknown as PhotoRowDb[]))
  }

  const matchingUsers = await usersMatching(supabase, params.search)
  let rows = photoRows
  if (isUuid(params.cafe)) rows = rows.filter((p) => p.cafe_id === params.cafe)
  if (isUuid(params.user)) rows = rows.filter((p) => p.user_id === params.user)
  if (matchingUsers) {
    const set = new Set(matchingUsers)
    rows = rows.filter((p) => set.has(p.user_id))
  }

  const last = (id: string) => groups.get(id)!.at(-1)!.created_at
  const first = (id: string) => groups.get(id)![0].created_at
  rows.sort((a, b) => {
    if (sort === "most") {
      const diff = groups.get(b.id)!.length - groups.get(a.id)!.length
      if (diff !== 0) return diff
    }
    if (sort === "newest") return last(b.id).localeCompare(last(a.id))
    return first(a.id).localeCompare(first(b.id))
  })

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE))
  const page = Math.min(parsePage(params.page), totalPages)
  const slice = rows.slice((page - 1) * GALLERY_PAGE_SIZE, page * GALLERY_PAGE_SIZE)

  const people = await getPeople(supabase, [
    ...slice.map((p) => p.user_id),
    ...slice.flatMap((p) => groups.get(p.id)!.map((r) => r.reporter_id)),
  ])

  const photos: ReportedPhoto[] = slice.map((row) => {
    const reports = groups.get(row.id)!
    const byReason = new Map<PhotoReportReason, number>()
    for (const r of reports) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1)
    const withDetails = [...reports].reverse().find((r) => r.details?.trim())
    return {
      ...toPhoto(row, people, reports.length),
      reasons: [...byReason.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      reporters: reports.map((r) => people.get(r.reporter_id) ?? unknownPerson(r.reporter_id)),
      first_reported_at: reports[0].created_at,
      last_reported_at: reports.at(-1)!.created_at,
      latest_details: withDetails?.details?.trim() ?? null,
    }
  })

  return { photos, total, totalPages, page }
}

// ---------------------------------------------------------------------------
// Browse: every gallery photo, newest first

export async function getGalleryPhotos(params: {
  status?: string
  owner?: string
  source?: string
  search?: string
  cafe?: string
  user?: string
  page?: string
}): Promise<{ photos: GalleryPhoto[]; total: number; totalPages: number; page: number }> {
  const supabase = createAdminClient()
  const page = parsePage(params.page)

  const matchingUsers = await usersMatching(supabase, params.search)
  if (matchingUsers && matchingUsers.length === 0) {
    return { photos: [], total: 0, totalPages: 1, page: 1 }
  }

  let query = supabase.from("user_photos").select(PHOTO_COLUMNS, { count: "exact" })
  if (params.status === "visible") query = query.eq("moderation_status", "visible")
  if (params.status === "removed") query = query.neq("moderation_status", "visible")
  if (params.owner === "hidden") query = query.eq("is_hidden", true)
  if (params.owner === "shown") query = query.eq("is_hidden", false)
  if (params.source && ["rank", "review", "gallery", "crawl"].includes(params.source)) {
    query = query.eq("source", params.source)
  }
  if (isUuid(params.cafe)) query = query.eq("cafe_id", params.cafe)
  if (isUuid(params.user)) query = query.eq("user_id", params.user)
  if (matchingUsers) query = query.in("user_id", matchingUsers)

  const from = (page - 1) * GALLERY_PAGE_SIZE
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + GALLERY_PAGE_SIZE - 1)
  if (error) throw error

  const rows = (data ?? []) as unknown as PhotoRowDb[]
  const [people, open] = await Promise.all([
    getPeople(supabase, rows.map((r) => r.user_id)),
    openReportCounts(supabase, rows.map((r) => r.id)),
  ])
  const total = count ?? 0
  return {
    photos: rows.map((r) => toPhoto(r, people, open.get(r.id) ?? 0)),
    total,
    totalPages: Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE)),
    page,
  }
}

// ---------------------------------------------------------------------------
// One photo

// resolved_at / resolved_by / resolution_note arrive with migration
// 20261008130000_admin_photo_moderation. Until it is applied, read the
// reports without them rather than failing the page.
async function getPhotoReports(supabase: Admin, photoId: string): Promise<ReportRowDb[]> {
  const base = "id, photo_id, reporter_id, reason, details, status, created_at"
  const full = await supabase
    .from("photo_reports")
    .select(`${base}, resolved_at, resolved_by, resolution_note`)
    .eq("photo_id", photoId)
    .order("created_at", { ascending: false })
  if (!full.error) return (full.data ?? []) as ReportRowDb[]
  if (full.error.code !== "42703" && full.error.code !== "PGRST204") throw full.error
  const fallback = await supabase
    .from("photo_reports")
    .select(base)
    .eq("photo_id", photoId)
    .order("created_at", { ascending: false })
  if (fallback.error) throw fallback.error
  return (fallback.data ?? []) as ReportRowDb[]
}

export async function getPhotoById(id: string): Promise<PhotoDetail | null> {
  if (!isUuid(id)) return null
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("user_photos").select(PHOTO_COLUMNS).eq("id", id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as PhotoRowDb

  const head = { count: "exact" as const, head: true }
  const [reports, audit, ownerPhotos, ownerRemoved, ownerPhotoIds, owner, review] = await Promise.all([
    getPhotoReports(supabase, id),
    supabase
      .from("audit_logs")
      .select("id, action, actor_id, metadata, created_at")
      .eq("target_type", "user_photo")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("user_photos").select("id", head).eq("user_id", row.user_id),
    supabase.from("user_photos").select("id", head).eq("user_id", row.user_id).neq("moderation_status", "visible"),
    supabase.from("user_photos").select("id").eq("user_id", row.user_id).limit(1000),
    supabase.from("profiles").select("created_at").eq("id", row.user_id).maybeSingle(),
    row.source === "review" && row.source_id
      ? supabase
          .from("reviews")
          .select("id, content, rating, moderation_status")
          .eq("id", row.source_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  for (const r of [audit, ownerPhotos, ownerRemoved, ownerPhotoIds, owner, review]) if (r.error) throw r.error

  const ownerOpen = await openReportCounts(
    supabase,
    (ownerPhotoIds.data ?? []).map((p) => p.id as string)
  )

  const auditRows = (audit.data ?? []) as {
    id: string
    action: string
    actor_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
  }[]

  const people = await getPeople(supabase, [
    row.user_id,
    ...(row.moderated_by ? [row.moderated_by] : []),
    ...reports.map((r) => r.reporter_id),
    ...reports.flatMap((r) => (r.resolved_by ? [r.resolved_by] : [])),
    ...auditRows.flatMap((a) => (a.actor_id ? [a.actor_id] : [])),
  ])

  const mappedReports: PhotoReport[] = reports.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details?.trim() || null,
    status: r.status,
    created_at: r.created_at,
    reporter: people.get(r.reporter_id) ?? unknownPerson(r.reporter_id),
    resolved_at: r.resolved_at ?? null,
    resolved_by: r.resolved_by ? people.get(r.resolved_by) ?? unknownPerson(r.resolved_by) : null,
    resolution_note: r.resolution_note ?? null,
  }))

  const history: PhotoHistoryEvent[] = auditRows.map((a) => {
    const meta = a.metadata ?? {}
    const note = (meta.reason ?? meta.note) as string | null | undefined
    const count = (meta.reports_resolved ?? meta.reports_dismissed) as number | undefined
    return {
      id: a.id,
      action: a.action,
      created_at: a.created_at,
      actor: a.actor_id ? people.get(a.actor_id) ?? unknownPerson(a.actor_id) : null,
      note: note ?? null,
      count: typeof count === "number" ? count : null,
    }
  })

  const reviewRow = review.data as
    | { id: string; content: string | null; rating: number | null; moderation_status: string }
    | null

  return {
    ...toPhoto(row, people, mappedReports.filter((r) => r.status === "pending").length),
    pin_order: row.pin_order,
    moderated_by: row.moderated_by ? people.get(row.moderated_by) ?? unknownPerson(row.moderated_by) : null,
    reports: mappedReports,
    history,
    owner_stats: {
      joined_at: (owner.data?.created_at as string | undefined) ?? null,
      photos: ownerPhotos.count ?? 0,
      removed: ownerRemoved.count ?? 0,
      open_reports: [...ownerOpen.values()].reduce((n, c) => n + c, 0),
    },
    review: reviewRow,
  }
}
