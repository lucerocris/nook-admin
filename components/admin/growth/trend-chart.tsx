"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { shortWeekLabel } from "@/lib/growth/dates"
import { Delta } from "@/components/admin/growth/delta"
import { direction, formatCount, signed } from "@/components/admin/growth/format"

// Weekly counts for the last 12 weeks, one metric at a time (reference: Dub's
// metric tabs fused to the top of one chart; Chargetrip's zero state that
// keeps the baseline and grid). Columns, not a line: these are counts of
// discrete weeks, and the current week is drawn lighter because it isn't over.

export type TrendSeries = {
  key: string
  label: string
  /** null = the source isn't available; the reason shows instead. */
  values: number[] | null
  last7: number | null
  prev7: number | null
  source: string
  unavailable?: string
}

const PLOT_H = 160

function niceMax(max: number) {
  if (max <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 2.5, 5, 10]) {
    const m = step * pow
    if (m >= max) return m
  }
  return 10 * pow
}

export function TrendChart({ weeks, series }: { weeks: string[]; series: TrendSeries[] }) {
  const [activeKey, setActiveKey] = React.useState(series[0]?.key)
  const [hover, setHover] = React.useState<number | null>(null)
  const active = series.find((s) => s.key === activeKey) ?? series[0]
  const values = active.values
  const max = niceMax(Math.max(0, ...(values ?? [0])))
  const ticks = [0, max / 2, max]
  const last = weeks.length - 1

  return (
    <section aria-labelledby="trend-title" className="overflow-hidden rounded-xl border bg-card">
      <h2 id="trend-title" className="sr-only">
        Weekly trend
      </h2>
      <div role="tablist" aria-label="Metric" className="grid grid-cols-3 border-b">
        {series.map((s) => {
          const selected = s.key === active.key
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActiveKey(s.key)
                setHover(null)
              }}
              className={cn(
                "relative flex min-w-0 flex-col items-start gap-1 border-r px-4 py-3 text-left outline-hidden last:border-r-0 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5 sm:py-4",
                selected && "bg-muted/40"
              )}
            >
              <span className="text-[13px] font-medium text-muted-foreground">{s.label}</span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold">{formatCount(s.last7)}</span>
                <span className="hidden sm:inline">
                  <Delta
                    dir={direction(s.last7, s.prev7)}
                    label={s.last7 !== null && s.prev7 !== null ? signed(s.last7 - s.prev7) : ""}
                  />
                </span>
              </span>
              <span className="text-xs text-muted-foreground">last 7 days</span>
              {selected && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={active.label} className="px-4 pt-5 pb-4 sm:px-5">
        {values === null ? (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold">{active.label} needs PostHog</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{active.unavailable}</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              {/* Y axis */}
              <div className="relative w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums" style={{ height: PLOT_H }}>
                {ticks.map((t) => (
                  <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: PLOT_H - (t / max) * PLOT_H }}>
                    {formatCount(Math.round(t))}
                  </span>
                ))}
              </div>
              {/* Plot */}
              <div className="relative min-w-0 flex-1">
                <div className="relative" style={{ height: PLOT_H }}>
                  {ticks.map((t) => (
                    <div
                      key={t}
                      aria-hidden
                      className="absolute inset-x-0 h-px bg-border"
                      style={{ top: PLOT_H - (t / max) * PLOT_H }}
                    />
                  ))}
                  <div className="absolute inset-0 flex">
                    {values.map((v, i) => {
                      const partial = i === last
                      const h = v === 0 ? 0 : Math.max(2, (v / max) * PLOT_H)
                      const shown = hover === i
                      return (
                        <div
                          key={weeks[i]}
                          tabIndex={0}
                          role="img"
                          aria-label={`Week of ${shortWeekLabel(weeks[i])}${partial ? " (so far)" : ""}: ${v} ${active.label.toLowerCase()}`}
                          onPointerEnter={() => setHover(i)}
                          onPointerLeave={() => setHover((h) => (h === i ? null : h))}
                          onFocus={() => setHover(i)}
                          onBlur={() => setHover(null)}
                          className="group relative flex h-full min-w-0 flex-1 items-end justify-center px-px outline-hidden focus-visible:bg-muted/60"
                        >
                          <div
                            className={cn(
                              "w-full max-w-6 rounded-t-[4px] transition-opacity",
                              partial ? "bg-primary/40" : "bg-primary",
                              shown && "opacity-80"
                            )}
                            style={{ height: h }}
                          />
                          {shown && (
                            <div
                              role="tooltip"
                              className={cn(
                                "pointer-events-none absolute z-10 w-max rounded-lg border bg-popover px-3 py-2 text-left shadow-md",
                                i > last - 2 ? "right-0" : i < 2 ? "left-0" : "left-1/2 -translate-x-1/2"
                              )}
                              style={{ bottom: Math.min(h + 8, PLOT_H - 44) }}
                            >
                              <span className="block text-sm font-semibold tabular-nums">{formatCount(v)}</span>
                              <span className="block text-xs text-muted-foreground">
                                Week of {shortWeekLabel(weeks[i])}
                                {partial ? ", so far" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* X axis: every other week (every fourth on phones), and always this week */}
                <div className="mt-2 flex text-xs text-muted-foreground">
                  {weeks.map((w, i) => (
                    <span key={w} className="min-w-0 flex-1 text-center whitespace-nowrap tabular-nums">
                      {i === last ? (
                        "Now"
                      ) : (last - i) % 4 === 0 ? (
                        shortWeekLabel(w)
                      ) : (last - i) % 2 === 0 ? (
                        <span className="hidden sm:inline">{shortWeekLabel(w)}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Weeks run Monday to Sunday, Manila time. This week is lighter: it isn’t over. {active.source}
              </span>
              <details className="group">
                <summary className="cursor-pointer rounded font-medium text-foreground outline-hidden select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  Show as table
                </summary>
                <table className="mt-2 w-full min-w-48 text-[13px]">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 pr-4 text-left font-medium">Week of</th>
                      <th className="py-1 text-right font-medium">{active.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.map((v, i) => (
                      <tr key={weeks[i]} className="border-t">
                        <td className="py-1 pr-4 text-foreground">
                          {shortWeekLabel(weeks[i])}
                          {i === last ? " (so far)" : ""}
                        </td>
                        <td className="py-1 text-right text-foreground tabular-nums">{formatCount(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
