"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  EnvelopeSimpleIcon,
  ImageIcon,
  MapPinIcon,
  StarIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModerationActions } from "@/components/admin/moderation-actions"
import { ModerationHistory } from "@/components/admin/moderation-history"
import { ReportStatusCallout } from "@/components/admin/report-status-callout"
import { ReviewStatusBadge } from "@/components/admin/review-status-badge"
import { getReasonLabel } from "@/lib/queries/reports"
import type { ReportRow } from "@/lib/types/reports"

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex flex-row gap-0.5 items-center">
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <StarIcon
            key={i}
            size={14}
            weight="fill"
            className="text-yellow-400"
          />
        ) : (
          <StarIcon key={i} size={14} className="text-muted-foreground" />
        )
      )}
    </div>
  )
}

function getInitials(fullName: string | null, username: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (username) return username.slice(0, 2).toUpperCase()
  return "?"
}

function getDisplayName(
  fullName: string | null,
  username: string | null
): string {
  if (fullName) return fullName
  if (username) return username
  return "Anonymous"
}

function formatRelative(isoString: string): string {
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

function formatAbsolute(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ReportDetailsClient({ report }: { report: ReportRow }) {
  const reviewer = report.review.reviewer
  const reviewerName = getDisplayName(
    reviewer.full_name,
    reviewer.username
  )
  const reporterName = getDisplayName(
    report.reporter.full_name,
    report.reporter.username
  )
  const cafeLocation = [report.cafe.neighborhood, report.cafe.city]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/reviews">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold">
              Report {report.short_id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Submitted {formatRelative(report.created_at)} by{" "}
              {report.reporter.username
                ? `@${report.reporter.username}`
                : reporterName}{" "}
              · Reason: {getReasonLabel(report.reason)}
            </p>
          </div>
        </div>
      </div>

      {/* Status callout */}
      <ReportStatusCallout status={report.status} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          {/* Reported review card */}
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Reported review</CardTitle>
                  <CardDescription>
                    Posted {formatRelative(report.review.created_at)}
                  </CardDescription>
                </div>
                <ReviewStatusBadge status={report.review.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback>
                    {getInitials(reviewer.full_name, reviewer.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium">
                    {reviewerName}
                  </span>
                  {reviewer.username && (
                    <span className="text-xs text-muted-foreground">
                      @{reviewer.username}
                    </span>
                  )}
                </div>
              </div>

              <StarRow rating={report.review.rating} />

              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {report.review.content}
              </p>

              {report.review.photo_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {report.review.photo_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-20 rounded-md bg-muted border bg-cover bg-center"
                      style={{ backgroundImage: `url(${url})` }}
                      aria-label={`Review photo ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`https://nook.example.com/reviews/${report.review.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowSquareOutIcon className="size-3.5" />
                    Open in app
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report details card */}
          <Card>
            <CardHeader>
              <CardTitle>Report details</CardTitle>
              <CardDescription>
                {getReasonLabel(report.reason)} report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">
                    Reason
                  </span>
                  <Badge variant="secondary">
                    {getReasonLabel(report.reason)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">
                    Submitted
                  </span>
                  <span
                    className="font-medium"
                    title={formatAbsolute(report.created_at)}
                  >
                    {formatRelative(report.created_at)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Evidence
                </p>
                {report.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Reporter did not attach evidence.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {report.evidence.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-md bg-muted border bg-cover bg-center"
                        style={{ backgroundImage: `url(${ev.url})` }}
                        aria-label={`Evidence ${ev.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Moderation actions */}
          <div className="lg:sticky lg:top-4">
            <ModerationActions
              reportId={report.id}
              reportStatus={report.status}
              reviewStatus={report.review.status}
            />
          </div>

          {/* Cafe card */}
          <Card>
            <CardHeader>
              <CardTitle>Cafe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {report.cafe.featured_image_url ? (
                  <div
                    className="size-12 rounded-md bg-muted shrink-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${report.cafe.featured_image_url})`,
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <div
                    className="size-12 rounded-md bg-muted shrink-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/admin/cafes/${report.cafe.id}`}
                    className="font-medium text-sm hover:underline underline-offset-2 truncate"
                  >
                    {report.cafe.name}
                  </Link>
                  {cafeLocation && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {cafeLocation}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {report.cafe.rating !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <StarRow rating={Math.round(report.cafe.rating)} />
                  <span className="tabular-nums text-sm font-medium">
                    {report.cafe.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({report.cafe.review_count} reviews)
                  </span>
                </div>
              )}

              {report.cafe.owner_email && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <EnvelopeSimpleIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Owner email
                    </span>
                    <span className="ml-auto font-medium truncate">
                      {report.cafe.owner_email}
                    </span>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link href={`/admin/cafes/${report.cafe.id}`}>
                  View cafe
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Reporter card */}
          <Card>
            <CardHeader>
              <CardTitle>Reporter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback>
                    {getInitials(
                      report.reporter.full_name,
                      report.reporter.username
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {reporterName}
                  </span>
                  {report.reporter.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {report.reporter.email}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">
                    {formatRelative(report.reporter.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviews posted</span>
                  <span className="font-medium tabular-nums">
                    {report.reporter.review_count}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link href="/admin/users">
                  <UserCircleIcon className="size-3.5" />
                  View user
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Moderation history (full width) */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Moderation history</CardTitle>
          <CardDescription>
            Every action taken on this report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModerationHistory events={report.history} />
        </CardContent>
      </Card>
    </div>
  )
}
