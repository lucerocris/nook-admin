import { MetricGrid, type Metric } from "@/components/admin/metric-grid"
import type { DashboardStats } from "@/lib/queries/cafes"

type Stats = DashboardStats & { pendingReports: number }

export function SectionCards({ stats }: { stats: Stats }) {
  const attention: Metric[] = [
    {
      label: "Pending reports",
      value: stats.pendingReports,
      note: "Reports awaiting moderator action",
      href: "/admin/reviews?status=pending&sort=oldest",
      linkLabel: "Open the queue",
      attention: true,
    },
    {
      label: "Open claims",
      value: stats.openClaims,
      note: "Ownership claims pending or under review",
      href: "/admin/claims",
      linkLabel: "Review claims",
      attention: true,
    },
    {
      label: "Unclaimed listings",
      value: stats.unclaimedCafes,
      note: "Cafes without an owner account",
      href: "/admin/cafes?owner=unclaimed",
      linkLabel: "View listings",
      attention: true,
    },
  ]

  const growth: Metric[] = [
    {
      label: "Active cafes",
      value: stats.totalCafes,
      note: "Listings with Active status, visible in the app",
      href: "/admin/cafes?status=active",
      linkLabel: "Active listings",
    },
    {
      label: "Active owners",
      value: stats.activeOwners,
      note: "Linked to at least one cafe",
    },
    {
      label: "App users",
      value: stats.totalUsers,
      note: "All accounts across the platform",
      href: "/admin/users",
      linkLabel: "All users",
    },
    {
      label: "Reviews this week",
      value: stats.reviewsThisWeek,
      note: "Posted in the last 7 days",
      href: "/admin/reviews",
      linkLabel: "All reviews",
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Needs attention</h2>
        <MetricGrid metrics={attention} className="sm:grid-cols-3" />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Growth</h2>
        <MetricGrid
          metrics={growth}
          compact
          className="sm:grid-cols-2 xl:grid-cols-4"
        />
      </section>
    </div>
  )
}
