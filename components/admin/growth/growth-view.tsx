import { DataFreshness } from "@/components/admin/data-freshness"
import { PageHeader } from "@/components/admin/table-kit"
import { CohortGrid } from "./cohort-grid"
import { CountingRules } from "./counting-rules"
import { Funnel } from "./funnel"
import { KpiStrip } from "./kpi-strip"
import { MetricTable } from "./metric-table"
import { PostHogNotice } from "./posthog-notice"
import { RefreshButton } from "./refresh-button"
import { TrendChart } from "./trend-chart"
import type { GrowthReport } from "@/lib/queries/growth"

// The whole Growth page, top to bottom: headline numbers, the weekly trend,
// the arrival funnel, retention cohorts, then the in-app loops and the supply
// side, and the counting rules last.

export function GrowthView({ report }: { report: GrowthReport }) {
  const { accounts, active, signups, posthog } = report
  const unavailable =
    posthog.status === "not_configured"
      ? "Add POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to this deployment."
      : "PostHog didn’t answer. Refresh to try again."

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <PageHeader
          title="Growth"
          summary={`${accounts.counted.toLocaleString()} real accounts. ${accounts.excluded.toLocaleString()} test, team and owner accounts are left out of every number.`}
          action={<RefreshButton />}
        />
        <DataFreshness generatedAt={report.generatedAt} />
      </div>

      {posthog.status !== "ok" && <PostHogNotice status={posthog} />}

      <KpiStrip report={report} />

      <TrendChart
        weeks={report.weeks}
        series={[
          {
            key: "active",
            label: "Active people",
            values: active?.weekly ?? null,
            last7: active?.last7 ?? null,
            prev7: active?.prev7 ?? null,
            source: "PostHog, mobile app, test accounts left out.",
            unavailable,
          },
          {
            key: "first_opens",
            label: "First opens",
            values: active?.firstOpensWeekly ?? null,
            last7: active?.firstOpens7 ?? null,
            prev7: active?.firstOpensPrev7 ?? null,
            source: "PostHog “Application Installed”: a device opening the app for the first time.",
            unavailable,
          },
          {
            key: "signups",
            label: "New accounts",
            values: signups.weekly,
            last7: signups.last7,
            prev7: signups.prev7,
            source: "Supabase Auth, test and team accounts left out.",
          },
        ]}
      />

      <Funnel report={report} />

      <CohortGrid cohorts={report.retention} posthog={posthog} />

      <MetricTable
        title="What people do in the app"
        lead="The loops that should bring people back: ranking, saving, reviewing, crawling. Last 7 days against the 7 before."
        rows={report.loops}
      />

      <MetricTable
        title="Cafés and owners"
        lead="The supply side. Totals are as of now; the weekly columns count what happened in each window."
        rows={report.supply}
        showTotal
      />

      <CountingRules />
    </div>
  )
}
