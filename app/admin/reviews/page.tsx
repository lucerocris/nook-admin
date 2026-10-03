import type { Metadata } from "next"

import { ReportsQueueClient } from "@/components/admin/reports-queue-client"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"
import { getReports } from "@/lib/queries/reports"

export const metadata: Metadata = { title: "Review reports" }

// Matches PAGE_SIZE in lib/queries/reports.ts, which owns the paging.
const PAGE_SIZE = 20

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    sort?: string
    page?: string
  }>
}) {
  const { search, status, sort, page } = await searchParams

  // Tab counts come from the request-cached dashboard summary (the admin
  // layout already fetches it for the sidebar badge), so they cost no extra
  // round trip. getReportsMetrics() reads the same payload.
  const [{ reports, total, totalPages, page: safePage }, summary] =
    await Promise.all([
      getReports({ search, status, sort, page }),
      getAdminDashboardSummary(),
    ])

  const byStatus = summary.reports.by_status
  const pending = byStatus.pending ?? 0
  const underReview = byStatus.under_review ?? 0

  return (
    <ReportsQueueClient
      reports={reports}
      page={safePage}
      pageSize={PAGE_SIZE}
      total={total}
      totalPages={totalPages}
      resolvedThisWeek={summary.reports.resolved_last_7d}
      counts={{
        active: pending + underReview,
        pending,
        under_review: underReview,
        resolved: byStatus.resolved ?? 0,
        rejected: byStatus.rejected ?? 0,
        all: summary.reports.total,
      }}
    />
  )
}
