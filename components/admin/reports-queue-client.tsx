"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CaretRightIcon, ClockIcon, FlagIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FilterChips,
  FilterSelect,
  PageHeader,
  SearchField,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Toolbar,
  TR,
  shortAge,
  useDebouncedSearch,
  useUrlState,
  type ActiveFilter,
} from "@/components/admin/table-kit"
import { ReportStatusBadge } from "@/components/admin/report-status-badge"
import { getReasonLabel } from "@/lib/queries/reports.dto"
import type { ReportRow, ReportStatus } from "@/lib/types/reports"
import { markUnderReviewAction } from "@/app/admin/reviews/actions"

export type ReportStatusCounts = {
  active: number
  pending: number
  under_review: number
  resolved: number
  rejected: number
  all: number
}

// "active" (pending + under review) is the queue's default view and is never
// written to the URL; "all" is written so it survives a reload.
const DEFAULT_STATUS = "active"
const DEFAULT_SORT = "oldest"

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "cafe_az", label: "Café A–Z" },
]

const FILTER_KEYS = ["search"]

const STATUS_NOUN: Record<ReportStatus, string> = {
  pending: "pending",
  under_review: "under review",
  resolved: "resolved",
  rejected: "rejected",
}

function personName(p: { full_name: string | null; username: string | null }, fallback: string) {
  return p.full_name ?? p.username ?? fallback
}

function Rating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" aria-label={`${rating} out of 5 stars`}>
      <StarIcon weight="fill" className="size-3.5 text-foreground" aria-hidden />
      <span aria-hidden>{rating}</span>
    </span>
  )
}

function MarkUnderReviewButton({ report, compact }: { report: ReportRow; compact?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  // Only pending reports can move to under review; finalized ones are refused
  // by the RPC (P0001) and under-review ones are already there.
  if (report.status !== "pending") return null

  function handleMarkUnderReview() {
    startTransition(async () => {
      const result = await markUnderReviewAction(report.id)
      if (result.success) {
        toast.success("Marked under review", {
          description: `Report ${report.short_id} is now being looked at.`,
        })
        router.refresh()
      } else {
        toast.error("Couldn’t mark it under review", { description: result.error })
      }
    })
  }

  return compact ? (
    <Button
      variant="ghost"
      size="icon-sm"
      loading={isPending}
      title="Mark under review"
      aria-label={`Mark report ${report.short_id} under review`}
      onClick={handleMarkUnderReview}
    >
      <ClockIcon aria-hidden />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      loading={isPending}
      aria-label={`Mark report ${report.short_id} under review`}
      onClick={handleMarkUnderReview}
    >
      <ClockIcon aria-hidden />
      Mark under review
    </Button>
  )
}

function OpenReportLink({ report }: { report: ReportRow }) {
  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link href={`/admin/reviews/${report.id}`} aria-label={`Open report ${report.short_id}`}>
        <CaretRightIcon aria-hidden />
      </Link>
    </Button>
  )
}

export function ReportsQueueClient({
  reports,
  page,
  pageSize,
  total,
  totalPages,
  counts,
  resolvedThisWeek,
}: {
  reports: ReportRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  counts: ReportStatusCounts
  resolvedThisWeek: number
}) {
  const url = useUrlState()
  const search = useDebouncedSearch()

  const status = url.get("status", DEFAULT_STATUS)
  const sort = url.get("sort", DEFAULT_SORT)
  const query = url.get("search")

  const filters: ActiveFilter[] = []
  if (query) filters.push({ key: "search", label: "Search", value: `“${query}”`, onRemove: () => url.set("search", "") })

  const summary = [
    counts.pending > 0 ? `${counts.pending.toLocaleString()} pending` : "Nothing pending",
    counts.under_review > 0 ? `${counts.under_review.toLocaleString()} under review` : null,
    `${resolvedThisWeek.toLocaleString()} resolved this week`,
  ]
    .filter(Boolean)
    .join(" · ")

  let empty: React.ReactNode
  if (reports.length === 0) {
    if (query) {
      empty = (
        <TableEmpty
          icon={MagnifyingGlassIcon}
          title="No reports match"
          body="Try a café, reviewer or reporter name, or words from the review."
          action={
            <Button variant="outline" size="sm" onClick={() => url.clear(FILTER_KEYS)}>
              Clear filters
            </Button>
          }
        />
      )
    } else if (status === "active" || status === "pending") {
      empty = (
        <TableEmpty
          icon={FlagIcon}
          title="Nothing waiting"
          body="Reports from café owners land here until someone decides on them."
        />
      )
    } else if (status === "all") {
      empty = <TableEmpty icon={FlagIcon} title="No reports yet" body="Café owners haven’t reported any reviews." />
    } else {
      const noun = STATUS_NOUN[status as ReportStatus] ?? status
      empty = <TableEmpty icon={FlagIcon} title={`No ${noun} reports`} />
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Review reports" summary={summary} />

      <StatusTabs
        value={status}
        onChange={(v) => url.set("status", v, DEFAULT_STATUS)}
        tabs={[
          { value: "active", label: "Active", count: counts.active },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "under_review", label: "Under review", count: counts.under_review },
          { value: "resolved", label: "Resolved", count: counts.resolved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
          { value: "all", label: "All", count: counts.all },
        ]}
      />

      <Toolbar>
        <SearchField
          value={search.value}
          onChange={search.onChange}
          placeholder="Search by café, reviewer, reporter or review"
        />
        <FilterSelect
          label="Sort"
          value={sort}
          allValue={DEFAULT_SORT}
          allLabel="Oldest first"
          onChange={(v) => url.set("sort", v, DEFAULT_SORT)}
          options={SORTS}
        />
      </Toolbar>

      <FilterChips filters={filters} onClearAll={() => url.clear(FILTER_KEYS)} />

      <TableCard
        busy={url.isPending}
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={TH}>Review</TableHead>
                <TableHead className={TH}>Reason</TableHead>
                <TableHead className={TH}>Rating</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={`${TH} text-right`}>Reported</TableHead>
                <TableHead className={`${TH} w-12`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const reporter = personName(report.reporter, "Unknown")
                const reviewer = personName(report.review.reviewer, "Anonymous")
                return (
                  <TableRow key={report.id} className={TR}>
                    <TableCell className={`${TD} max-w-[26rem]`}>
                      <div className="grid min-w-0 leading-tight">
                        <Link
                          href={`/admin/reviews/${report.id}`}
                          className="line-clamp-1 font-medium whitespace-normal outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          “{report.review.content}”
                        </Link>
                        <span className="mt-0.5 truncate text-xs text-muted-foreground">
                          {report.cafe.name} · reported by {reporter}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`${TD} max-w-[14rem]`}>
                      <div className="grid min-w-0 leading-tight">
                        <span>{getReasonLabel(report.reason)}</span>
                        {report.description && (
                          <span className="mt-0.5 truncate text-xs text-muted-foreground" title={report.description}>
                            {report.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <div className="grid leading-tight">
                        <Rating rating={report.review.rating} />
                        <span className="mt-0.5 truncate text-xs text-muted-foreground">by {reviewer}</span>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <ReportStatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className={`${TD} text-right text-muted-foreground tabular-nums`}>
                      <time dateTime={report.created_at} title={new Date(report.created_at).toLocaleString()}>
                        {shortAge(report.created_at)}
                      </time>
                    </TableCell>
                    <TableCell className={`${TD} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <MarkUnderReviewButton report={report} />
                        <OpenReportLink report={report} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
        list={reports.map((report) => (
          <li key={report.id} className="flex items-start gap-2 py-3 pr-2 pl-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <Link
                  href={`/admin/reviews/${report.id}`}
                  className="line-clamp-2 min-w-0 flex-1 text-sm font-medium"
                >
                  “{report.review.content}”
                </Link>
                <ReportStatusBadge status={report.status} className="mt-0.5 shrink-0" />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span className="truncate">{report.cafe.name}</span>
                <span aria-hidden>·</span>
                <span>{getReasonLabel(report.reason)}</span>
                <span aria-hidden>·</span>
                <Rating rating={report.review.rating} />
                <span aria-hidden>·</span>
                <time dateTime={report.created_at} className="tabular-nums">
                  {shortAge(report.created_at)}
                </time>
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <MarkUnderReviewButton report={report} compact />
              <OpenReportLink report={report} />
            </div>
          </li>
        ))}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={reports.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun={total === 1 ? "report" : "reports"}
          />
        }
      />
    </div>
  )
}
