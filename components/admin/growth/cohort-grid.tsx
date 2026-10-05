import { BENCHMARKS, RETENTION_HORIZON } from "@/lib/growth/config"
import { shortWeekLabel } from "@/lib/growth/dates"
import type { Cohort, PostHogStatus } from "@/lib/queries/growth"
import { cn } from "@/lib/utils"
import { formatPct } from "@/components/admin/growth/format"

// Weekly retention: who came back in each of the four weeks after their first.
// No usable reference turned up for this part; it follows the usual cohort
// table (rows = arrival week, columns = weeks since) with a one-hue ramp.

const STEPS = [
  { min: 0.45, cls: "bg-heat-5 text-heat-5-fg" },
  { min: 0.3, cls: "bg-heat-4 text-heat-4-fg" },
  { min: 0.2, cls: "bg-heat-3 text-heat-3-fg" },
  { min: 0.1, cls: "bg-heat-2 text-heat-2-fg" },
  { min: 0.0001, cls: "bg-heat-1 text-heat-1-fg" },
]

function cellClass(rate: number) {
  return STEPS.find((s) => rate >= s.min)?.cls ?? "bg-muted text-muted-foreground"
}

const TINY = 4

export function CohortGrid({ cohorts, posthog }: { cohorts: Cohort[] | null; posthog: PostHogStatus }) {
  const targets: Record<number, string> = {
    1: `target ${formatPct(BENCHMARKS.week1RetentionTarget.low)}–${formatPct(BENCHMARKS.week1RetentionTarget.high)}`,
    4: `target ${formatPct(BENCHMARKS.week4RetentionTarget.low)}–${formatPct(BENCHMARKS.week4RetentionTarget.high)}`,
  }

  return (
    <section aria-labelledby="cohorts-title" className="flex flex-col gap-3">
      <div>
        <h2 id="cohorts-title" className="text-[15px] font-semibold">
          Who comes back
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          People grouped by the week they first opened the app, and the share who used it again in each
          following week. Targets come from the stickiness plan (STICKY_FEATURES.md).
        </p>
      </div>

      {cohorts === null ? (
        <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
          <p className="text-sm font-semibold">
            {posthog.status === "not_configured" ? "Retention needs PostHog" : "PostHog didn’t answer"}
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            {posthog.status === "not_configured"
              ? "Add the PostHog env vars to this deployment to see weekly cohorts."
              : "Refresh the page to try again."}
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto overscroll-x-contain rounded-xl border bg-card">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className="h-12 border-b bg-muted/60 px-5 text-left text-xs font-medium text-muted-foreground">
                  First opened, week of
                </th>
                <th scope="col" className="h-12 border-b bg-muted/60 px-3 text-right text-xs font-medium text-muted-foreground">
                  People
                </th>
                {Array.from({ length: RETENTION_HORIZON }, (_, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="h-12 w-[15%] border-b bg-muted/60 px-3 text-center text-xs font-medium text-muted-foreground"
                  >
                    <span className="block">Week {i + 1}</span>
                    {targets[i + 1] && <span className="block font-normal">{targets[i + 1]}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...cohorts].reverse().map((c) => {
                const tiny = c.size > 0 && c.size < TINY
                return (
                  <tr key={c.week}>
                    <th scope="row" className="border-b px-5 py-2 text-left font-medium whitespace-nowrap">
                      {shortWeekLabel(c.week)}
                      {tiny && <span className="ml-2 text-xs font-normal text-muted-foreground">small group</span>}
                    </th>
                    <td className="border-b px-3 py-2 text-right tabular-nums">{c.size}</td>
                    {c.retained.map((n, i) => {
                      if (n === null) {
                        return (
                          <td key={i} className="border-b px-1.5 py-1.5">
                            <span className="flex h-9 items-center justify-center rounded-md text-xs text-muted-foreground">
                              not over
                            </span>
                          </td>
                        )
                      }
                      const rate = c.size ? n / c.size : 0
                      return (
                        <td key={i} className="border-b px-1.5 py-1.5">
                          <span
                            title={`${n} of ${c.size} came back in week ${i + 1}`}
                            className={cn(
                              "flex h-9 items-center justify-center rounded-md text-[13px] font-semibold tabular-nums",
                              c.size === 0 ? "text-muted-foreground" : cellClass(rate),
                              tiny && "opacity-60"
                            )}
                          >
                            {c.size === 0 ? "—" : formatPct(rate)}
                            <span className="sr-only"> ({n} of {c.size})</span>
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-xs text-muted-foreground">
            <span>Shade:</span>
            {[
              ["0%", "bg-muted"],
              ["1–9%", "bg-heat-1"],
              ["10–19%", "bg-heat-2"],
              ["20–29%", "bg-heat-3"],
              ["30–44%", "bg-heat-4"],
              ["45%+", "bg-heat-5"],
            ].map(([label, cls]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("size-3 rounded-sm", cls)} />
                {label}
              </span>
            ))}
            <span className="basis-full sm:basis-auto sm:ml-auto">
              Hover a cell for counts. PostHog, mobile app only, test accounts left out.
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
