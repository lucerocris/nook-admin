"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  CheckIcon,
  ProhibitIcon,
  StarIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { StatusChip, shortAge } from "@/components/admin/table-kit"
import {
  PhotoStatusChips,
  handle,
  photoTitle,
  usePhotoModeration,
} from "@/components/admin/gallery/photo-moderation"
import {
  PHOTO_SOURCE_LABELS,
  photoReasonLabel,
  type PersonMini,
  type PhotoDetail,
  type PhotoHistoryEvent,
  type PhotoReportStatus,
} from "@/lib/types/gallery"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function When({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso)} className="tabular-nums">
      {shortAge(iso)} ago
    </time>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

const REPORT_TONE: Record<PhotoReportStatus, "warning" | "danger" | "neutral"> = {
  pending: "warning",
  resolved: "danger",
  dismissed: "neutral",
}
const REPORT_LABEL: Record<PhotoReportStatus, string> = {
  pending: "Open",
  resolved: "Photo removed",
  dismissed: "Dismissed",
}

const HISTORY_LABEL: Record<string, string> = {
  photo_removed: "Removed the photo",
  photo_restored: "Restored the photo",
  photo_reports_dismissed: "Dismissed reports",
}

function historyLine(e: PhotoHistoryEvent) {
  const what = HISTORY_LABEL[e.action] ?? e.action
  if (e.count && e.action === "photo_removed") return `${what}, closing ${e.count} ${e.count === 1 ? "report" : "reports"}`
  if (e.count && e.action === "photo_reports_dismissed") return `Dismissed ${e.count} ${e.count === 1 ? "report" : "reports"}`
  return what
}

function Person({ person }: { person: PersonMini }) {
  return (
    <Link
      href={`/admin/gallery?view=all&user=${person.id}`}
      className="font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {handle(person)}
    </Link>
  )
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4 last:border-0">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function PhotoDetailsClient({ photo }: { photo: PhotoDetail }) {
  const { ask, dialog, busyPhotoId } = usePhotoModeration()
  const busy = busyPhotoId === photo.id
  const removed = photo.moderation_status !== "visible"
  const openReports = photo.reports.filter((r) => r.status === "pending")
  const owner = photo.owner

  const decisionLine = removed
    ? `Removed${photo.moderated_at ? ` ${shortAge(photo.moderated_at)} ago` : ""}${photo.moderated_by ? ` by ${handle(photo.moderated_by)}` : ""}. Nobody sees it, not even ${handle(owner)}.`
    : openReports.length > 0
      ? `${openReports.length} open ${openReports.length === 1 ? "report" : "reports"}. Remove the photo, or dismiss if it breaks no rule.`
      : photo.is_hidden
        ? `No open reports. ${handle(owner)} has hidden it from their profile.`
        : `No open reports. It shows on ${handle(owner)}’s profile.`

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="-ml-2 shrink-0">
          <Link href="/admin/gallery" aria-label="Back to gallery photos">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{photoTitle(photo)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {handle(owner)} at {photo.cafe.name} · posted <When iso={photo.created_at} />
          </p>
          <PhotoStatusChips photo={photo} className="mt-2.5 flex flex-wrap gap-1.5" />
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* The photo, whole: the decision is about the image. */}
          <section className="overflow-hidden rounded-xl border bg-card">
            <a
              href={photo.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center bg-muted outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-label="Open the full-size photo in a new tab"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.image_url} alt={photoTitle(photo)} className="max-h-[560px] w-auto max-w-full object-contain" />
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <ArrowSquareOutIcon className="size-3.5" aria-hidden />
                Full size
              </span>
            </a>
            <dl className="divide-y px-4 py-1 sm:px-5">
              <Fact label="Drink">{photo.drink_name ?? <span className="text-muted-foreground">Not named</span>}</Fact>
              <Fact label="Note">
                {photo.caption ? (
                  <span className="whitespace-pre-wrap">“{photo.caption}”</span>
                ) : (
                  <span className="text-muted-foreground">No note</span>
                )}
              </Fact>
              <Fact label="Café">
                <Link href={`/admin/cafes/${photo.cafe.id}`} className="font-medium hover:underline">
                  {photo.cafe.name}
                </Link>
                {photo.cafe.area && <span className="text-muted-foreground"> · {photo.cafe.area}</span>}
              </Fact>
              <Fact label="Source">
                {PHOTO_SOURCE_LABELS[photo.source]}
                {photo.source === "review" && photo.review && (
                  <span className="mt-1 block text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5 tabular-nums text-foreground">
                      <StarIcon weight="fill" className="size-3" aria-hidden />
                      {photo.review.rating}
                    </span>
                    {photo.review.content ? ` “${photo.review.content}”` : " No review text"}
                    {photo.review.moderation_status !== "visible" &&
                      ` · review is ${photo.review.moderation_status}`}
                    <span className="mt-1 block">
                      The photo is also on this review on the café page. Removing it here takes it off the profile
                      and gallery only.
                    </span>
                  </span>
                )}
              </Fact>
              <Fact label="Taken">{formatDate(photo.taken_at)}</Fact>
              <Fact label="Posted">{formatDate(photo.created_at)}</Fact>
              {photo.pin_order && <Fact label="Pinned">Slot {photo.pin_order} of 3 on the profile</Fact>}
            </dl>
          </section>

          <section aria-labelledby="reports-heading" className="overflow-hidden rounded-xl border bg-card">
            <h2 id="reports-heading" className="border-b px-4 py-3.5 text-[15px] font-semibold sm:px-5">
              Reports <span className="font-normal text-muted-foreground tabular-nums">· {photo.reports.length}</span>
            </h2>
            {photo.reports.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Nobody has reported this photo.</p>
            ) : (
              <ul className="divide-y">
                {photo.reports.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{photoReasonLabel(r.reason)}</span>
                      <span className="text-muted-foreground">
                        by <Person person={r.reporter} /> · <When iso={r.created_at} />
                      </span>
                      <StatusChip tone={REPORT_TONE[r.status]} className="ml-auto">
                        {REPORT_LABEL[r.status]}
                      </StatusChip>
                    </div>
                    {r.details && <p className="text-sm whitespace-pre-wrap">“{r.details}”</p>}
                    {r.status !== "pending" && (r.resolved_by || r.resolved_at) && (
                      <p className="text-xs text-muted-foreground">
                        Closed{r.resolved_at && <> <When iso={r.resolved_at} /></>}
                        {r.resolved_by && <> by {handle(r.resolved_by)}</>}
                        {r.resolution_note && <> · “{r.resolution_note}”</>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="history-heading" className="overflow-hidden rounded-xl border bg-card">
            <h2 id="history-heading" className="border-b px-4 py-3.5 text-[15px] font-semibold sm:px-5">
              History
            </h2>
            {photo.history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No moderation actions yet.</p>
            ) : (
              <ol className="divide-y">
                {photo.history.map((e) => (
                  <li key={e.id} className="px-4 py-3 text-sm sm:px-5">
                    <span className="font-medium">{e.actor ? handle(e.actor) : "Someone"}</span> {historyLine(e).toLowerCase()}
                    <span className="text-muted-foreground"> · <When iso={e.created_at} /></span>
                    {e.note && <p className="mt-0.5 text-muted-foreground">“{e.note}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Rail: the decision first, then who and where. */}
        <aside className="overflow-hidden rounded-xl border bg-card lg:sticky lg:top-4">
          <RailSection title="Decision">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {decisionLine}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {removed ? (
                <Button variant="outline" disabled={busy} onClick={() => ask("restore", photo)}>
                  <ArrowCounterClockwiseIcon aria-hidden />
                  Restore photo
                </Button>
              ) : (
                <Button variant="destructive" disabled={busy} onClick={() => ask("remove", photo)}>
                  <TrashIcon aria-hidden />
                  Remove photo
                </Button>
              )}
              {openReports.length > 0 && (
                <Button variant="outline" disabled={busy} onClick={() => ask("dismiss", photo)}>
                  <CheckIcon aria-hidden />
                  {openReports.length === 1 ? "Dismiss report" : `Dismiss ${openReports.length} reports`}
                </Button>
              )}
            </div>
          </RailSection>

          <RailSection title="Owner">
            <p className="text-sm">
              <span className="font-medium">{owner.full_name ?? handle(owner)}</span>
              {owner.username && owner.full_name && <span className="text-muted-foreground"> · @{owner.username}</span>}
            </p>
            {owner.is_suspended && (
              <StatusChip tone="danger" className="mt-1.5">
                Suspended
              </StatusChip>
            )}
            <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-y-1 text-[13px]">
              {photo.owner_stats.joined_at && (
                <>
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className="text-right tabular-nums">{new Date(photo.owner_stats.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Photos</dt>
              <dd className="text-right tabular-nums">{photo.owner_stats.photos}</dd>
              <dt className="text-muted-foreground">Removed</dt>
              <dd className="text-right tabular-nums">{photo.owner_stats.removed}</dd>
              <dt className="text-muted-foreground">Open reports</dt>
              <dd className="text-right tabular-nums">{photo.owner_stats.open_reports}</dd>
            </dl>
            <div className="mt-3 flex flex-col gap-1 text-[13px] font-medium">
              <Link href={`/admin/gallery?view=all&user=${owner.id}`} className="hover:underline">
                All their photos
              </Link>
              <Link href={`/admin/gallery?user=${owner.id}`} className="hover:underline">
                Reports on their photos
              </Link>
            </div>
            <Button
              variant={owner.is_suspended ? "outline" : "ghost"}
              size="sm"
              className="mt-3 w-full justify-start text-muted-foreground"
              disabled={busy}
              onClick={() => ask(owner.is_suspended ? "unsuspend" : "suspend", photo)}
            >
              <ProhibitIcon aria-hidden />
              {owner.is_suspended ? "Lift suspension" : "Suspend user"}
            </Button>
          </RailSection>

          <RailSection title="Café">
            <Link href={`/admin/cafes/${photo.cafe.id}`} className="text-sm font-medium hover:underline">
              {photo.cafe.name}
            </Link>
            {photo.cafe.area && <p className="text-[13px] text-muted-foreground">{photo.cafe.area}</p>}
            <div className="mt-3 flex flex-col gap-1 text-[13px] font-medium">
              <Link href={`/admin/gallery?view=all&cafe=${photo.cafe.id}`} className="hover:underline">
                All photos at this café
              </Link>
            </div>
          </RailSection>
        </aside>
      </div>

      {dialog}
    </div>
  )
}
