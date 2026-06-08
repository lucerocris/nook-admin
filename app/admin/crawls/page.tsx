import type { Metadata } from "next"
import { getCrawls } from "@/lib/queries/crawls"
import { CrawlsListClient } from "@/components/admin/crawls/crawls-list-client"

export const metadata: Metadata = { title: "Crawls" }

export default async function CrawlsPage() {
  const crawls = await getCrawls()
  return <CrawlsListClient crawls={crawls} />
}
