import type { Metadata } from "next"
import { NewCrawlFormClient } from "@/components/admin/crawls/new-crawl-form-client"

export const metadata: Metadata = { title: "New Crawl" }

export default async function NewCrawlPage() {
  return <NewCrawlFormClient />
}
