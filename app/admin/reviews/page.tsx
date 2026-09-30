import type { Metadata } from "next"

import {
  ReportsFilterBar,
  ReportsQueueClient,
} from "@/components/admin/reports-queue-client"
import { ReportsMetricsCards } from "@/components/admin/reports-metrics-cards"
import {
  getOldestPendingReportAt,
  getReports,
  getReportsMetrics,
} from "@/lib/queries/reports"
import { PageTitle } from "@/components/admin/page-header"

export const metadata: Metadata = { title: "Reviews" }

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

  const [{ reports, total, totalPages, page: safePage }, metrics, oldestPendingAt] =
    await Promise.all([
      getReports({ search, status, sort, page }),
      getReportsMetrics(),
      getOldestPendingReportAt(),
    ])

  const activeStatus = status ?? "active"
  const showEmpty = activeStatus === "active" && reports.length === 0

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          eyebrow="Moderation"
          title="Reviews"
          lead="Review and action reports submitted by cafe owners"
        />
      </div>

      <ReportsMetricsCards metrics={metrics} oldestPendingAt={oldestPendingAt} />

      <ReportsFilterBar />

      {showEmpty ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            The active queue is empty. Nothing needs your attention right now.
          </p>
        </div>
      ) : (
        <ReportsQueueClient
          reports={reports}
          page={safePage}
          total={total}
          totalPages={totalPages}
        />
      )}
    </div>
  )
}
