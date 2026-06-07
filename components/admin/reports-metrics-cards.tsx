"use client"

import {
  CheckCircleIcon,
  EyeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card"
import type { ReportsMetrics } from "@/lib/types/reports"

export function ReportsMetricsCards({ metrics }: { metrics: ReportsMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-3">
      <Card>
        <CardDescription>Pending reports</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {metrics.pendingCount}
        </CardTitle>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Awaiting first review <WarningCircleIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            New reports from cafe owners
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardDescription>Under review</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {metrics.underReviewCount}
        </CardTitle>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Being investigated <EyeIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Reports an admin is working on
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardDescription>Resolved this week</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {metrics.resolvedThisWeekCount}
        </CardTitle>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Reports closed in 7 days <CheckCircleIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Approved and rejected outcomes
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
