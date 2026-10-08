import type { Metadata } from "next"
import { QuickActions } from "@/components/admin/quick-actions"
import { RecentActivity } from "@/components/admin/recent-activity"
import { WaitingOnYou } from "@/components/admin/dashboard/waiting-on-you"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"
import { getQueuePreviews, waitingSentence } from "@/lib/queries/dashboard-queues"
import { getGalleryCounts } from "@/lib/queries/gallery"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Dashboard" }

// The team is in the Philippines; pin the zone so the greeting matches their
// clock regardless of where the server runs.
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Manila",
    }).format(new Date())
  )
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  // Request-cached: the layout already fetched this summary for the sidebar.
  const [summary, gallery, { data: { user } }] = await Promise.all([
    getAdminDashboardSummary(),
    getGalleryCounts(),
    supabase.auth.getUser(),
  ])
  const queues = await getQueuePreviews({
    pendingClaims: summary.claims.by_status.pending ?? 0,
    pendingReports: summary.reports.by_status.pending ?? 0,
    reportedPhotos: gallery.reported,
    unclaimed: summary.cafes.unclaimed,
  })

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const firstName = fullName ? fullName.split(/\s+/)[0] : null

  // Real totals only, as one quiet line under the work.
  const health = [
    `${summary.cafes.total.toLocaleString()} cafés`,
    `${summary.cafes.active.toLocaleString()} live`,
    `${summary.users.total.toLocaleString()} users`,
    `${summary.owners.toLocaleString()} owners`,
    `${summary.reviews.last_7d.toLocaleString()} reviews this week`,
    `${summary.reports.resolved_last_7d.toLocaleString()} reports resolved this week`,
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{waitingSentence(queues)}</p>
      </header>

      <div className="flex flex-col gap-3">
        <WaitingOnYou queues={queues} />
        <p className="px-1 text-[13px] text-muted-foreground tabular-nums">
          {health.join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  )
}
