import type { Metadata } from "next"
import { CrawlDetailClient } from "@/components/admin/crawls/crawl-detail-client"

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  return { title: `Crawl ${id}` }
}

export default async function CrawlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CrawlDetailClient crawlId={id} />
}
