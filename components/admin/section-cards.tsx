import { MetricGrid, type Metric } from "@/components/admin/metric-grid"

type Stats = {
  totalCafes: number
  totalUsers: number
  reviewsThisWeek: number
  activeOwners: number
  unclaimedCafes: number
  pendingReports: number
}

export function SectionCards({ stats }: { stats: Stats }) {
  const metrics: Metric[] = [
    {
      label: "Pending reports",
      value: stats.pendingReports,
      note: "Reports awaiting moderator action",
      href: "/admin/reviews?status=pending&sort=oldest",
      linkLabel: "Open the queue",
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
    {
      label: "Total cafes",
      value: stats.totalCafes,
      note: "Published and draft listings",
      href: "/admin/cafes",
      linkLabel: "All cafes",
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

  return <MetricGrid metrics={metrics} />
}
