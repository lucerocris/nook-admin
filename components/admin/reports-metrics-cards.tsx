import { MetricGrid } from "@/components/admin/metric-grid"
import { formatRelativeTime } from "@/lib/utils"
import type { ReportsMetrics } from "@/lib/types/reports"

export function ReportsMetricsCards({
  metrics,
  oldestPendingAt,
}: {
  metrics: ReportsMetrics
  oldestPendingAt: string | null
}) {
  return (
    <MetricGrid
      className="sm:grid-cols-3"
      metrics={[
        {
          label: "Pending reports",
          value: metrics.pendingCount,
          note:
            metrics.pendingCount > 0 && oldestPendingAt
              ? `Oldest submitted ${formatRelativeTime(oldestPendingAt)}`
              : "New reports from cafe owners, awaiting first review",
          href: "/admin/reviews?status=pending&sort=oldest",
          linkLabel: "Oldest first",
          attention: true,
        },
        {
          label: "Under review",
          value: metrics.underReviewCount,
          note: "Reports an admin is investigating",
        },
        {
          label: "Resolved this week",
          value: metrics.resolvedThisWeekCount,
          note: "Approved and rejected outcomes in the last 7 days",
        },
      ]}
    />
  )
}
