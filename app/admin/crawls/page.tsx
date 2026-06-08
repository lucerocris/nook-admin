import type { Metadata } from "next"
import { CrawlsListClient } from "@/components/admin/crawls/crawls-list-client"
import { MOCK_CRAWLS } from "@/components/admin/crawls/mock-data"

export const metadata: Metadata = { title: "Crawls" }

export default async function CrawlsPage() {
  return <CrawlsListClient crawls={MOCK_CRAWLS} />
}
