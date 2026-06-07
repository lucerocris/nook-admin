"use client"

import { WarningCircleIcon } from "@phosphor-icons/react"
import Link from "next/link"

interface PendingReportsCalloutProps {
  pendingCount: number
  oldestSubmittedAt: string | null
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "recently"
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
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

export function PendingReportsCallout({
  pendingCount,
  oldestSubmittedAt,
}: PendingReportsCalloutProps) {
  if (pendingCount <= 0) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
      <WarningCircleIcon
        className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
      />
      <div className="flex flex-col gap-1 flex-1">
        <p className="font-medium text-amber-900 dark:text-amber-100">
          {pendingCount}{" "}
          {pendingCount === 1 ? "report is" : "reports are"} awaiting review
        </p>
        <p className="text-amber-700 dark:text-amber-300">
          Oldest: {formatRelativeTime(oldestSubmittedAt)}.{" "}
          <Link
            href="/admin/reviews?status=pending&sort=oldest"
            className="font-medium underline underline-offset-2"
          >
            Open the pending queue
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
