import { Badge } from "@/components/ui/badge"
import type { CrawlStatus } from "@/components/admin/crawls/mock-data"

export function CrawlStatusBadge({ status }: { status: CrawlStatus }) {
  if (status === "active") {
    return (
      <Badge variant="outline">
        <span className="inline-block size-1.5 rounded-full bg-green-500 mr-1.5" />
        Active
      </Badge>
    )
  }
  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>
  }
  if (status === "completed") {
    return (
      <Badge variant="outline">
        <span className="inline-block size-1.5 rounded-full bg-blue-500 mr-1.5" />
        Completed
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
    >
      <span className="inline-block size-1.5 rounded-full bg-red-500 mr-1.5" />
      Cancelled
    </Badge>
  )
}
