"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReportStatusBadge } from "@/components/admin/report-status-badge"
import { getReasonLabel } from "@/lib/queries/reports"
import type { ReportRow } from "@/lib/types/reports"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex flex-row gap-0.5 items-center">
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <StarIcon
            key={i}
            size={12}
            weight="fill"
            className="text-yellow-400"
          />
        ) : (
          <StarIcon
            key={i}
            size={12}
            className="text-muted-foreground"
          />
        )
      )}
    </div>
  )
}

function ReporterCell({ reporter }: { reporter: ReportRow["reporter"] }) {
  const name = reporter.full_name ?? reporter.username ?? "Unknown"
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(reporter.created_at)}
      </span>
    </div>
  )
}

function CafeCell({ cafe }: { cafe: ReportRow["cafe"] }) {
  const location = [cafe.neighborhood, cafe.city].filter(Boolean).join(", ")
  return (
    <div className="flex items-center gap-3">
      {cafe.featured_image_url ? (
        <div
          className="size-10 rounded-md bg-muted shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cafe.featured_image_url})` }}
          aria-hidden="true"
        />
      ) : (
        <div
          className="size-10 rounded-md bg-muted shrink-0"
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm truncate">{cafe.name}</span>
        {location && (
          <span className="text-xs text-muted-foreground truncate">
            {location}
          </span>
        )}
      </div>
    </div>
  )
}

function ReviewCell({ report }: { report: ReportRow }) {
  const reviewer = report.review.reviewer
  const reviewerName =
    reviewer.full_name ?? reviewer.username ?? "Anonymous"
  return (
    <div className="flex flex-col gap-1 max-w-[260px]">
      <StarRow rating={report.review.rating} />
      <p className="text-sm text-muted-foreground truncate">
        &ldquo;{report.review.content}&rdquo;
      </p>
      <span className="text-xs text-muted-foreground">
        by {reviewerName}
      </span>
    </div>
  )
}

function ReportCell({ report }: { report: ReportRow }) {
  return (
    <div className="flex flex-col gap-1 max-w-[260px]">
      <Badge variant="secondary" className="w-fit text-xs">
        {getReasonLabel(report.reason)}
      </Badge>
      <p className="text-sm truncate">{report.description}</p>
    </div>
  )
}

function ReportRowActions({ report }: { report: ReportRow }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        disabled={report.status === "under_review"}
        title="Mark as under review"
        aria-label="Mark as under review"
      >
        <ClockIcon />
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/admin/reviews/${report.id}`}>
          <EyeIcon />
        </Link>
      </Button>
    </div>
  )
}

export function ReportsQueueClient({
  reports,
  page,
  total,
  totalPages,
}: {
  reports: ReportRow[]
  page: number
  total: number
  totalPages: number
}) {
  const router = useRouter()
  const params = useSearchParams()

  function pushWithParams(nextParams: URLSearchParams) {
    const query = nextParams.toString()
    router.push(query ? `/admin/reviews?${query}` : "/admin/reviews")
  }

  function updateFilterParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value && value !== "all" && value !== "active") {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    p.delete("page")
    pushWithParams(p)
  }

  function handleSearch(value: string) {
    updateFilterParam("search", value)
  }

  function handleStatus(value: string) {
    updateFilterParam("status", value)
  }

  function handleSort(value: string) {
    updateFilterParam("sort", value)
  }

  function handlePage(nextPage: number) {
    const p = new URLSearchParams(params.toString())
    if (nextPage <= 1) {
      p.delete("page")
    } else {
      p.set("page", String(nextPage))
    }
    pushWithParams(p)
  }

  const hasResults = reports.length > 0
  const startItem = hasResults ? (page - 1) * PAGE_SIZE + 1 : 0
  const endItem = hasResults ? startItem + reports.length - 1 : 0
  const activeStatus = params.get("status") ?? "active"

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Cafe</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow
                key={report.id}
                className={cn(
                  "cursor-pointer",
                  report.status === "resolved" && "opacity-60"
                )}
              >
                <TableCell>
                  <Link
                    href={`/admin/reviews/${report.id}`}
                    className="block"
                  >
                    <ReportCell report={report} />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/reviews/${report.id}`}
                    className="block"
                  >
                    <ReviewCell report={report} />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/reviews/${report.id}`}
                    className="block"
                  >
                    <CafeCell cafe={report.cafe} />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/reviews/${report.id}`}
                    className="block"
                  >
                    <ReporterCell reporter={report.reporter} />
                  </Link>
                </TableCell>
                <TableCell>
                  <ReportStatusBadge status={report.status} />
                </TableCell>
                <TableCell className="text-right">
                  <ReportRowActions report={report} />
                </TableCell>
              </TableRow>
            ))}
            {!hasResults && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {activeStatus === "all"
                    ? "No reports yet. The queue is clear."
                    : "No reports match the current filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasResults && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePage(page + 1)}
              disabled={totalPages === 0 || page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ReportsFilterBar() {
  const params = useSearchParams()
  const router = useRouter()

  function updateFilterParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value && value !== "all" && value !== "active") {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    p.delete("page")
    const query = p.toString()
    router.push(query ? `/admin/reviews?${query}` : "/admin/reviews")
  }

  const activeStatus = params.get("status") ?? "active"
  const activeSort = params.get("sort") ?? "oldest"

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Search by cafe, reviewer, reporter..."
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => updateFilterParam("search", e.target.value)}
        />
      </div>

      <Select
        defaultValue={activeStatus}
        onValueChange={(v) => updateFilterParam("status", v)}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active queue</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="under_review">Under review</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={activeSort}
        onValueChange={(v) => updateFilterParam("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="cafe_az">Cafe A–Z</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

