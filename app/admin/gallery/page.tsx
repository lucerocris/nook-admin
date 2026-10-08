import type { Metadata } from "next"

import { GalleryClient } from "@/components/admin/gallery/gallery-client"
import {
  GALLERY_PAGE_SIZE,
  getGalleryCafes,
  getGalleryCounts,
  getGalleryPhotos,
  getPerson,
  getReportedPhotos,
} from "@/lib/queries/gallery"

export const metadata: Metadata = { title: "Gallery photos" }

const VIEWS = ["reported", "all", "visible", "removed"] as const
type View = (typeof VIEWS)[number]

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    search?: string
    cafe?: string
    user?: string
    source?: string
    owner?: string
    sort?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const view: View = VIEWS.includes(params.view as View) ? (params.view as View) : "reported"

  const [result, counts, cafes, userFilter] = await Promise.all([
    view === "reported"
      ? getReportedPhotos(params)
      : getGalleryPhotos({ ...params, status: view === "all" ? undefined : view }),
    getGalleryCounts(),
    getGalleryCafes(),
    getPerson(params.user),
  ])

  return (
    <GalleryClient
      view={view}
      photos={result.photos}
      page={result.page}
      pageSize={GALLERY_PAGE_SIZE}
      total={result.total}
      totalPages={result.totalPages}
      counts={counts}
      cafes={cafes}
      userFilter={userFilter}
    />
  )
}
