import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCrawlById, getCrawlStops, getCrawlTiers, getCrawlStats, getStampLogs, getCrawlStopsForFilter } from "@/lib/queries/crawls"
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

  const [crawl, stops, tiers, stats, stampLogs, stopOptions] = await Promise.all([
    getCrawlById(id),
    getCrawlStops(id),
    getCrawlTiers(id),
    getCrawlStats(id),
    getStampLogs(id),
    getCrawlStopsForFilter(id),
  ])

  if (!crawl) {
    redirect("/admin/crawls")
  }

  return (
    <CrawlDetailClient
      crawl={crawl}
      stops={stops}
      tiers={tiers}
      stats={stats}
      stampLogs={stampLogs}
      stopOptions={stopOptions}
    />
  )
}
