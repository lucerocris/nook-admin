import * as React from "react"

import { BENCHMARKS } from "@/lib/growth/config"
import { shortWeekLabel } from "@/lib/growth/dates"
import type { GrowthReport } from "@/lib/queries/growth"
import { cn } from "@/lib/utils"
import { Delta } from "@/components/admin/growth/delta"
import {
  SMALL_N,
  direction,
  formatCount,
  formatPct,
  pct,
  signed,
  signedPoints,
} from "@/components/admin/growth/format"
import { InstallsSheet } from "@/components/admin/growth/installs-sheet"

// The five numbers that say whether Nook is growing, in one ruled strip
// (references: Dock's single row of equal tiles; Wrike's tile that swaps its
// number for an instruction when there is no data).

function Tile({
  label,
  value,
  delta,
  note,
  target,
  action,
  className,
}: {
  label: string
  value: React.ReactNode
  delta?: React.ReactNode
  note: React.ReactNode
  target?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col bg-card p-5", className)}>
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-3 flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        {delta}
      </div>
      <p className="mt-2 text-[13px] text-pretty text-muted-foreground">{note}</p>
      {target && <p className="mt-1 text-[13px] text-pretty text-muted-foreground">{target}</p>}
      {action && <div className="mt-auto pt-4">{action}</div>}
    </div>
  )
}

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="block text-base leading-snug font-medium text-muted-foreground">{children}</span>
}

export function KpiStrip({ report }: { report: GrowthReport }) {
  const { installs, signups, active, activation, retention, posthog } = report

  // Installs: the last two logged totals.
  const latest = installs.log.at(-1) ?? null
  const before = installs.log.at(-2) ?? null

  // Week-1 retention: the newest cohort whose week 1 is over, and the one before.
  const complete = (retention ?? []).filter((c) => c.retained[0] !== null && c.size > 0)
  const lastCohort = complete.at(-1) ?? null
  const prevCohort = complete.at(-2) ?? null
  const w1 = lastCohort ? pct(lastCohort.retained[0]!, lastCohort.size) : null
  const w1Prev = prevCohort ? pct(prevCohort.retained[0]!, prevCohort.size) : null

  const actRate = pct(activation.activated, activation.eligible)
  const actPrev = pct(activation.prevActivated, activation.prevEligible)

  const phMissing =
    posthog.status === "not_configured"
      ? "Needs PostHog"
      : "PostHog didn’t answer"

  return (
    <section
      aria-label="Headline numbers"
      className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-2 lg:grid-cols-5"
    >
      <Tile
        className="sm:col-span-2 lg:col-span-1"
        label="Store installs"
        value={latest ? formatCount(latest.total) : <Missing>Not logged yet</Missing>}
        delta={
          latest && before ? (
            <Delta
              dir={direction(latest.total, before.total)}
              label={`${signed(latest.total - before.total)} since ${shortWeekLabel(before.weekOf)}`}
            />
          ) : null
        }
        note={
          latest
            ? `Total to date from App Store Connect and Play Console, logged for the week of ${shortWeekLabel(latest.weekOf)}.`
            : installs.status === "unavailable"
              ? "The installs log (marketing_weekly_metrics) couldn't be read."
              : "The one number stores count for us. Add the running total from App Store Connect and Play Console each week."
        }
        target={
          active
            ? `PostHog saw ${formatCount(active.firstOpens7)} first opens in the last 7 days.`
            : undefined
        }
        action={installs.status !== "unavailable" ? <InstallsSheet latest={latest} /> : undefined}
      />

      <Tile
        label="New accounts"
        value={formatCount(signups.last7)}
        delta={
          <Delta
            dir={direction(signups.last7, signups.prev7)}
            label={`${signed(signups.last7 - signups.prev7)} vs previous 7 days`}
          />
        }
        note="Sign-ups in the last 7 days, test and team accounts left out. Supabase Auth."
      />

      <Tile
        label="Weekly active people"
        value={active ? formatCount(active.last7) : <Missing>{phMissing}</Missing>}
        delta={
          active ? (
            <Delta
              dir={direction(active.last7, active.prev7)}
              label={`${signed(active.last7 - active.prev7)} vs previous 7 days`}
            />
          ) : null
        }
        note={
          active
            ? `Used the app in the last 7 days. ${formatCount(active.mau)} in 28 days; ${formatCount(active.ios)} on iOS, ${formatCount(active.android)} on Android. PostHog.`
            : "People who used the app in the last 7 days, from PostHog."
        }
        target={
          active && active.mau > 0
            ? `Daily ÷ monthly: ${formatPct(active.avgDau / active.mau)} (20% is good, 25% strong).`
            : undefined
        }
      />

      <Tile
        label="Activated on day 1"
        value={actRate === null ? <Missing>No new accounts</Missing> : formatPct(actRate)}
        delta={
          actRate !== null && actPrev !== null ? (
            <Delta dir={direction(actRate, actPrev)} label={`${signedPoints(actRate, actPrev)} vs prior 4 weeks`} />
          ) : null
        }
        note={`${activation.activated} of ${activation.eligible} new accounts in the last 4 weeks ranked a café or saved 3+ to Want to Try within 24 hours. Supabase.`}
        target={activation.eligible > 0 && activation.eligible < SMALL_N ? "Too few accounts to read as a trend." : undefined}
      />

      <Tile
        label="Back in week 1"
        value={
          w1 !== null ? formatPct(w1) : <Missing>{retention ? "No finished cohort" : phMissing}</Missing>
        }
        delta={
          w1 !== null && w1Prev !== null ? (
            <Delta dir={direction(w1, w1Prev)} label={`${signedPoints(w1, w1Prev)} vs cohort before`} />
          ) : null
        }
        note={
          lastCohort
            ? `${lastCohort.retained[0]} of ${lastCohort.size} ${lastCohort.size === 1 ? "person" : "people"} who first opened the app the week of ${shortWeekLabel(lastCohort.week)} came back the next week. PostHog.`
            : "Share of a week's new people who use the app again the following week."
        }
        target={`Target ${formatPct(BENCHMARKS.week1RetentionTarget.low)}–${formatPct(BENCHMARKS.week1RetentionTarget.high)}; food and drink apps manage ${formatPct(BENCHMARKS.week1RetentionCategory.low)}–${formatPct(BENCHMARKS.week1RetentionCategory.high)}.`}
      />
    </section>
  )
}
