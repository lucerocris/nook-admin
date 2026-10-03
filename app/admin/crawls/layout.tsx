import { notFound } from "next/navigation"
import { FEATURES } from "@/lib/features"

// Hidden while crawls are community-run (see lib/features.ts). Covers the
// list, detail and new pages, so old bookmarks don't reach a half-supported
// feature.
export default function CrawlsLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.crawls) notFound()
  return children
}
