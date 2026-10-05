import type { MetricRow } from "@/lib/queries/growth"
import { cn } from "@/lib/utils"
import { direction, formatCount, signed } from "@/components/admin/growth/format"
import { Delta } from "@/components/admin/growth/delta"

// A titled, ruled table of metrics (reference: Glassnode's catalog table, one
// section per group; Missive's value-plus-change cells with a dash for none).
// Each row says what it counts and where the number comes from.

// Same cell styles as table-kit's TH/TD/TR. Copied, not imported: table-kit is
// a client module, and a server component importing a string from it gets a
// client reference instead of the string.
const TH = "h-10 bg-muted/60 px-4 text-xs font-medium text-muted-foreground first:pl-5 last:pr-5"
const TD = "px-4 py-2.5 align-middle first:pl-5 last:pr-5"
const TR = "border-b last:border-0 hover:bg-muted/50"

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96
  const h = 24
  const max = Math.max(1, ...values)
  const step = w / Math.max(1, values.length - 1)
  const points = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)] as const)
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const [lx, ly] = points[points.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="overflow-visible">
      <title>{label}</title>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className="text-muted-foreground/70" />
      <circle cx={lx} cy={ly} r={2.5} className="fill-primary" />
    </svg>
  )
}

function StatusText({ row }: { row: MetricRow }) {
  return (
    <span className="text-[13px] text-muted-foreground">
      {row.status === "not_tracked" ? "Not tracked yet" : "Needs PostHog"}
    </span>
  )
}

export function MetricTable({
  title,
  lead,
  rows,
  showTotal = false,
}: {
  title: string
  lead: string
  rows: MetricRow[]
  showTotal?: boolean
}) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-")
  const sparkLabel = (r: MetricRow) =>
    r.weekly ? `${r.label}, last 12 weeks: ${r.weekly.join(", ")}` : ""

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h2 id={id} className="text-[15px] font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{lead}</p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Desktop */}
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className={TH}>Metric</th>
              {showTotal && <th scope="col" className={cn(TH, "text-right")}>Now</th>}
              <th scope="col" className={cn(TH, "text-right")}>Last 7 days</th>
              <th scope="col" className={cn(TH, "text-right")}>Previous 7</th>
              <th scope="col" className={cn(TH, "hidden lg:table-cell")}>12 weeks</th>
              <th scope="col" className={TH}>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={TR}>
                <td className={cn(TD, "max-w-[22rem] py-3")}>
                  <span className="block font-medium">{r.label}</span>
                  <span className="mt-0.5 block text-[13px] text-pretty text-muted-foreground">{r.definition}</span>
                </td>
                {showTotal && (
                  <td className={cn(TD, "text-right tabular-nums")}>
                    {r.total === undefined || r.total === null ? "—" : formatCount(r.total)}
                    {r.note && <span className="block text-xs text-muted-foreground">{r.note.replace(/^Total = /, "")}</span>}
                  </td>
                )}
                {r.status === "ok" ? (
                  <>
                    <td className={cn(TD, "text-right whitespace-nowrap tabular-nums")}>
                      <span className="font-medium">{formatCount(r.last7)}</span>
                      {r.last7 !== null && r.prev7 !== null && r.last7 !== r.prev7 && (
                        <Delta
                          className="ml-2 text-xs text-muted-foreground"
                          dir={direction(r.last7, r.prev7)}
                          label={signed(r.last7 - r.prev7)}
                        />
                      )}
                    </td>
                    <td className={cn(TD, "text-right text-muted-foreground tabular-nums")}>{formatCount(r.prev7)}</td>
                    <td className={cn(TD, "hidden lg:table-cell")}>
                      {r.weekly ? <Sparkline values={r.weekly} label={sparkLabel(r)} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </>
                ) : (
                  <td className={cn(TD, "text-right")} colSpan={2}>
                    <StatusText row={r} />
                  </td>
                )}
                {r.status !== "ok" && <td className={cn(TD, "hidden lg:table-cell")} />}
                <td className={cn(TD, "text-[13px] whitespace-nowrap text-muted-foreground")}>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Phone: two-line rows */}
        <ul className="divide-y sm:hidden">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-medium">{r.label}</span>
                {r.status === "ok" ? (
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{formatCount(r.last7)}</span>
                    <span className="text-[13px] text-muted-foreground"> / 7 days</span>
                  </span>
                ) : (
                  <StatusText row={r} />
                )}
              </div>
              <span className="text-[13px] text-muted-foreground">
                {r.status === "ok" && `Previous 7 days: ${formatCount(r.prev7)} · `}
                {showTotal && r.total !== undefined && r.total !== null && `Now: ${formatCount(r.total)} · `}
                {r.source}
              </span>
              <span className="text-[13px] text-pretty text-muted-foreground">{r.definition}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
