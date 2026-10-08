import { createAdminClient } from "@/lib/supabase/admin"
import { getCafesPage } from "@/lib/queries/cafes"

export type QueueItem = {
  id: string
  title: string
  meta: string | null
  createdAt: string
  href: string
  imageUrl: string | null
}

export type QueuePreview = {
  key: "claims" | "reports" | "photos" | "drafts" | "unclaimed"
  count: number
  items: QueueItem[]
}

const PREVIEW = 3

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// The newest few items in each queue the dashboard lists, with real counts.
// Counts for claims, reports and unclaimed come from the summary RPC the layout
// already loads; this only adds what that payload doesn't carry.
export async function getQueuePreviews(counts: {
  pendingClaims: number
  pendingReports: number
  reportedPhotos: number
  unclaimed: number
}): Promise<QueuePreview[]> {
  const supabase = createAdminClient()

  const [claims, reports, photoReports, drafts, unclaimed] = await Promise.all([
    supabase
      .from("cafe_claims")
      .select(
        "id, created_at, role, cafes!inner ( name, featured_image_url ), profiles ( full_name, email )"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PREVIEW),
    supabase
      .from("review_reports")
      .select(
        "id, created_at, reason_code, cafes!review_reports_cafe_id_fkey ( name, featured_image_url ), reviews!review_reports_review_id_fkey ( content, rating )"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PREVIEW),
    // Newest open photo reports; deduped to photos below, so over-fetch.
    supabase
      .from("photo_reports")
      .select(
        "photo_id, created_at, user_photos!photo_reports_photo_id_fkey ( image_url, drink_name, caption, cafes ( name ) )"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PREVIEW * 5),
    getCafesPage({ status: "draft", pageSize: PREVIEW }),
    getCafesPage({ owner: "unclaimed", pageSize: PREVIEW }),
  ])

  if (claims.error) throw claims.error
  if (reports.error) throw reports.error
  if (photoReports.error) throw photoReports.error

  const seenPhotos = new Set<string>()
  const photoItems: QueueItem[] = []
  for (const row of photoReports.data ?? []) {
    const id = row.photo_id as string
    if (seenPhotos.has(id) || photoItems.length >= PREVIEW) continue
    seenPhotos.add(id)
    const photo = one<{
      image_url: string
      drink_name: string | null
      caption: string | null
      cafes: { name: string } | { name: string }[] | null
    }>(row.user_photos)
    photoItems.push({
      id,
      title: photo?.drink_name || (photo?.caption ? `“${photo.caption}”` : "Gallery photo"),
      meta: one(photo?.cafes)?.name ?? null,
      createdAt: row.created_at as string,
      href: `/admin/gallery/${id}`,
      imageUrl: photo?.image_url ?? null,
    })
  }

  return [
    {
      key: "claims",
      count: counts.pendingClaims,
      items: (claims.data ?? []).map((row) => {
        const cafe = one<{ name: string; featured_image_url: string | null }>(row.cafes)
        const who = one<{ full_name: string | null; email: string | null }>(row.profiles)
        const name = who?.full_name || who?.email || "Unknown claimant"
        return {
          id: row.id as string,
          title: cafe?.name ?? "Unknown café",
          meta: row.role ? `${name} · ${String(row.role)}` : name,
          createdAt: row.created_at as string,
          href: `/admin/claims?status=pending`,
          imageUrl: cafe?.featured_image_url ?? null,
        }
      }),
    },
    {
      key: "reports",
      count: counts.pendingReports,
      items: (reports.data ?? []).map((row) => {
        const cafe = one<{ name: string; featured_image_url: string | null }>(row.cafes)
        const review = one<{ content: string | null; rating: number }>(row.reviews)
        const excerpt = review?.content?.trim()
        return {
          id: row.id as string,
          title: excerpt ? `“${excerpt}”` : `${review?.rating ?? "?"}-star rating, no text`,
          meta: cafe?.name ?? null,
          createdAt: row.created_at as string,
          href: `/admin/reviews/${row.id}`,
          imageUrl: null,
        }
      }),
    },
    {
      key: "photos",
      count: counts.reportedPhotos,
      items: photoItems,
    },
    {
      key: "drafts",
      count: drafts.total,
      items: drafts.cafes.map((cafe) => ({
        id: cafe.id,
        title: cafe.name,
        meta: [cafe.neighborhood, cafe.city].filter(Boolean).join(", ") || null,
        createdAt: cafe.created_at,
        href: `/admin/cafes/${cafe.id}`,
        imageUrl: cafe.featured_image_url,
      })),
    },
    {
      key: "unclaimed",
      count: counts.unclaimed,
      items: unclaimed.cafes.map((cafe) => ({
        id: cafe.id,
        title: cafe.name,
        meta: [cafe.neighborhood, cafe.city].filter(Boolean).join(", ") || null,
        createdAt: cafe.created_at,
        href: `/admin/cafes/${cafe.id}`,
        imageUrl: cafe.featured_image_url,
      })),
    },
  ]
}

const NOUNS = {
  claims: ["claim", "claims"],
  reports: ["report", "reports"],
  photos: ["reported photo", "reported photos"],
} as const

/** "3 claims and 2 reports are waiting." Counts only the queues that are
 *  decisions (claims, reports); drafts and unclaimed are standing work. Lives
 *  here, not in the client component, so the server page can call it. */
export function waitingSentence(queues: QueuePreview[]) {
  const decisions = queues.filter(
    (q): q is QueuePreview & { key: "claims" | "reports" | "photos" } =>
      (q.key === "claims" || q.key === "reports" || q.key === "photos") && q.count > 0
  )
  if (decisions.length === 0) return "No claims or reports are waiting."
  const parts = decisions.map(
    (q) => `${q.count.toLocaleString()} ${NOUNS[q.key][q.count === 1 ? 0 : 1]}`
  )
  const total = decisions.reduce((n, q) => n + q.count, 0)
  const list = parts.length > 2 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts.join(" and ")
  return `${list} ${total === 1 ? "is" : "are"} waiting.`
}
