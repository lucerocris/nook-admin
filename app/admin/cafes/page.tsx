import type { Metadata } from "next"
import { getCafeNeighborhoods, getCafesPage } from "@/lib/queries/cafes"
import { getAllTagsAdmin } from "@/lib/queries/tags"

export const metadata: Metadata = { title: "Cafes" }
import { CafeListClient } from "@/components/admin/cafe-list-client"

export default async function CafesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    neighborhood?: string
    search?: string
    tag?: string
    featured?: string
    owner?: string
    sort?: string
    page?: string
  }>
}) {
  const {
    status,
    neighborhood,
    search,
    tag,
    featured,
    owner,
    sort,
    page: rawPage,
  } = await searchParams
  const page = rawPage ? Number(rawPage) : 1

  const [{ cafes, total, totalPages }, neighborhoods, tags] = await Promise.all([
    getCafesPage({
      status,
      neighborhood,
      search,
      tagId: tag,
      featured,
      owner,
      sort,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 10,
    }),
    getCafeNeighborhoods(),
    getAllTagsAdmin(),
  ])

  const tagOptions = tags
    .filter((tagItem) => tagItem.is_active)
    .map((tagItem) => ({
      id: tagItem.id,
      name: tagItem.name,
      category: tagItem.category,
    }))

  return (
    <CafeListClient
      cafes={cafes}
      tagOptions={tagOptions}
      neighborhoodOptions={neighborhoods.map((option) => option.value)}
      page={Number.isFinite(page) && page > 0 ? page : 1}
      total={total}
      totalPages={totalPages}
    />
  )
}
