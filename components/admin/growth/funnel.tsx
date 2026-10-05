import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr"

import type { GrowthReport } from "@/lib/queries/growth"
import { cn } from "@/lib/utils"
import { SMALL_N, formatCount, formatPct, pct } from "@/components/admin/growth/format"

// First open → account → activated → back a week later, for one fixed group
// of arrivals (references: Dub's row of step tiles with chevrons between;
// Visitors' bands that narrow step by step, here a bar under each tile).

type Step = {
  label: string
  value: number | null
  source: string
  missing?: string
}

function dateRange(fromIso: string, toIso: string) {
  const f = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" })
  return `${f(fromIso)} – ${f(toIso)}`
}

export function Funnel({ report }: { report: GrowthReport }) {
  const { funnel, posthog } = report
  const missing = posthog.status === "not_configured" ? "Needs PostHog" : "PostHog didn’t answer"
  const steps: Step[] = [
    { label: "Opened the app for the first time", value: funnel.firstOpens, source: "PostHog", missing },
    { label: "Created an account", value: funnel.signups, source: "Supabase" },
    { label: "Activated on day 1", value: funnel.activated, source: "Supabase" },
    { label: "Came back on day 7–13", value: funnel.returned, source: "PostHog", missing },
  ]
  const top = steps.find((s) => s.value !== null && s.value > 0)?.value ?? null

  return (
    <section aria-labelledby="funnel-title" className="flex flex-col gap-3">
      <div>
        <h2 id="funnel-title" className="text-[15px] font-semibold">
          From first open to coming back
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          People who arrived {dateRange(funnel.from, funnel.to)}, so everyone has had a full first week.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].value : null
          const rate = s.value !== null && prev !== null ? pct(s.value, prev) : null
          const share = s.value !== null && top ? Math.min(1, s.value / top) : 0
          return (
            <li key={s.label} className="relative flex min-w-0 flex-col bg-card p-5">
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute top-5 -left-2.5 z-10 hidden size-5 items-center justify-center rounded-full border bg-card text-muted-foreground lg:flex"
                >
                  <CaretRightIcon className="size-3" weight="bold" />
                </span>
              )}
              <span className="text-[13px] font-medium text-muted-foreground">
                {i + 1}. {s.label}
              </span>
              <span className="mt-3 text-3xl font-semibold tracking-tight">
                {s.value === null ? <span className="text-base font-medium text-muted-foreground">{s.missing}</span> : formatCount(s.value)}
              </span>
              <span className="mt-1 min-h-5 text-[13px] text-muted-foreground tabular-nums">
                {i === 0
                  ? s.source
                  : rate === null
                    ? `${s.source}`
                    : `${formatPct(rate)} of step ${i} · ${s.source}`}
              </span>
              <div aria-hidden className="mt-4 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full bg-primary", share === 0 && "hidden")}
                  style={{ width: `${Math.max(share * 100, 2)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-[13px] text-pretty text-muted-foreground">
        Step 1 counts devices and includes people who never sign up and the team’s own phones before
        they sign in; steps 2–4 count real accounts only.
        {funnel.signups > 0 && funnel.signups < SMALL_N && ` With ${funnel.signups} accounts, one person moves a rate by ${Math.round(100 / funnel.signups)} points.`}
      </p>
    </section>
  )
}
