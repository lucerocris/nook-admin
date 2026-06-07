import type { Metadata } from "next"

import {
  ReportsFilterBar,
  ReportsQueueClient,
} from "@/components/admin/reports-queue-client"
import { ReportsMetricsCards } from "@/components/admin/reports-metrics-cards"
import { PendingReportsCallout } from "@/components/admin/pending-reports-callout"
import { ReportsQuickActions } from "@/components/admin/reports-quick-actions"
import { getReports, getReportsMetrics } from "@/lib/queries/reports"

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

  const [{ reports, total, totalPages, page: safePage }, metrics] =
    await Promise.all([
      getReports({ search, status, sort, page }),
      getReportsMetrics(),
    ])

  const activeStatus = status ?? "active"
  const showEmpty = activeStatus === "active" && reports.length === 0
  const showCallout =
    activeStatus === "active" || activeStatus === "all" || !activeStatus
  const oldestPending =
    reports.find((r) => r.status === "pending")?.created_at ?? null

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reviews</h1>
          <p className="text-muted-foreground text-sm">
            Review and action reports submitted by cafe owners
          </p>
        </div>
      </div>

      <ReportsMetricsCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-6 min-w-0">
          {showCallout && (
            <PendingReportsCallout
              pendingCount={metrics.pendingCount}
              oldestSubmittedAt={oldestPending}
            />
          )}

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

        <ReportsQuickActions />
      </div>
    </div>
  )
}
