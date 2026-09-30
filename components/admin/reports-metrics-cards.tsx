import { MetricGrid } from "@/components/admin/metric-grid"
import type { ReportsMetrics } from "@/lib/types/reports"

export function ReportsMetricsCards({ metrics }: { metrics: ReportsMetrics }) {
  return (
    <MetricGrid
      className="sm:grid-cols-3"
      metrics={[
        {
          label: "Pending reports",
          value: metrics.pendingCount,
          note: "New reports from cafe owners, awaiting first review",
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
