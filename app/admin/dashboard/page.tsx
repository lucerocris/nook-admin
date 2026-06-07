import type { Metadata } from "next"
import { QuickActions } from "@/components/admin/quick-actions"

export const metadata: Metadata = { title: "Dashboard" }
import { RecentActivity } from "@/components/admin/recent-activity"
import { SectionCards } from "@/components/admin/section-cards"
import { getDashboardStats } from "@/lib/queries/cafes"
import { getReportsMetrics } from "@/lib/queries/reports"

export default async function DashboardPage() {
  const [stats, reportsMetrics] = await Promise.all([
    getDashboardStats(),
    getReportsMetrics(),
  ])
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <SectionCards
        stats={{ ...stats, pendingReports: reportsMetrics.pendingCount }}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  )
}
