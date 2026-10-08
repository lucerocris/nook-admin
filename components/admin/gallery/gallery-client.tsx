"use client"

import * as React from "react"
import Link from "next/link"
import { CaretRightIcon, CheckIcon, FlagIcon, ImagesIcon, MagnifyingGlassIcon, TrashIcon } from "@phosphor-icons/react"

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
import {
  PhotoStatusChips,
  handle,
  photoTitle,
  usePhotoModeration,
} from "@/components/admin/gallery/photo-moderation"
import {
  PHOTO_SOURCE_LABELS,
  photoReasonLabel,
  type CafeMini,
  type GalleryCounts,
  type GalleryPhoto,
  type PersonMini,
  type ReportedPhoto,
} from "@/lib/types/gallery"
import { cn } from "@/lib/utils"

// "reported" is the default view and never written to the URL.
const DEFAULT_VIEW = "reported"
const DEFAULT_SORT = "oldest"
const FILTER_KEYS = ["search", "cafe", "user", "source", "owner"]

const SORTS = [
  { value: "newest", label: "Newest report first" },
  { value: "most", label: "Most reports" },
]

const SOURCES = [
  { value: "gallery", label: "Added to gallery" },
  { value: "rank", label: "From a ranking" },
  { value: "review", label: "From a review" },
]

const OWNER_VISIBILITY = [
  { value: "shown", label: "Shown by owner" },
  { value: "hidden", label: "Hidden by owner" },
]

// ---------------------------------------------------------------------------
// Pieces

/** The photo is the thing being judged, so it is bigger than a list thumb. */
function PhotoThumb({ photo, size = "md" }: { photo: GalleryPhoto; size?: "md" | "lg" }) {
  return (
    <Link
      href={`/admin/gallery/${photo.id}`}
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg bg-muted outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        size === "lg" ? "size-16" : "size-12"
      )}
      aria-label={`Open photo: ${photoTitle(photo)}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image_url}
        alt=""
        loading="lazy"
        className={cn("size-full object-cover", photo.moderation_status !== "visible" && "opacity-40 grayscale")}
      />
    </Link>
  )
}

function PhotoName({ photo }: { photo: GalleryPhoto }) {
  return (
    <div className="grid min-w-0 leading-tight">
      <Link
        href={`/admin/gallery/${photo.id}`}
        className="truncate font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {photoTitle(photo)}
      </Link>
      {photo.drink_name && photo.caption && (
        <span className="mt-0.5 truncate text-xs text-muted-foreground" title={photo.caption}>
          “{photo.caption}”
        </span>
      )}
      <span className="mt-0.5 truncate text-xs text-muted-foreground">
        {photo.cafe.name} · {handle(photo.owner)}
        {photo.owner.is_suspended && " (suspended)"}
      </span>
    </div>
  )
}

function reasonsLine(photo: ReportedPhoto) {
  return photo.reasons
    .map((r) => (r.count > 1 ? `${photoReasonLabel(r.reason)} ×${r.count}` : photoReasonLabel(r.reason)))
    .join(", ")
}

function reportersLine(reporters: PersonMini[]) {
  const names = reporters.map(handle)
  if (names.length <= 2) return `by ${names.join(" and ")}`
  return `by ${names.slice(0, 2).join(", ")} and ${names.length - 2} more`
}

function OpenLink({ photo }: { photo: GalleryPhoto }) {
  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link href={`/admin/gallery/${photo.id}`} aria-label={`Open photo: ${photoTitle(photo)}`}>
        <CaretRightIcon aria-hidden />
      </Link>
    </Button>
  )
}

function Age({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} className="tabular-nums">
      {shortAge(iso)}
    </time>
  )
}

// Decision buttons on queue rows (design.md: the decision is safe from the
// list, and both are undoable from the photo page).
function QueueActions({
  photo,
  compact,
  busy,
  ask,
}: {
  photo: ReportedPhoto
  compact?: boolean
  busy: boolean
  ask: ReturnType<typeof usePhotoModeration>["ask"]
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size={compact ? "icon-sm" : "sm"}
        disabled={busy}
        onClick={() => ask("dismiss", photo)}
        aria-label={`Dismiss reports on ${photoTitle(photo)}`}
        title="Dismiss reports"
      >
        <CheckIcon aria-hidden />
        {!compact && "Dismiss"}
      </Button>
      {photo.moderation_status === "visible" && (
        <Button
          variant="destructive"
          size={compact ? "icon-sm" : "sm"}
          disabled={busy}
          onClick={() => ask("remove", photo)}
          aria-label={`Remove ${photoTitle(photo)}`}
          title="Remove photo"
        >
          <TrashIcon aria-hidden />
          {!compact && "Remove"}
        </Button>
      )}
      <OpenLink photo={photo} />
    </div>
  )
}

// ---------------------------------------------------------------------------

export function GalleryClient({
  view,
  photos,
  page,
  pageSize,
  total,
  totalPages,
  counts,
  cafes,
  userFilter,
}: {
  view: "reported" | "all" | "visible" | "removed"
  photos: (GalleryPhoto | ReportedPhoto)[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  counts: GalleryCounts
  cafes: CafeMini[]
  userFilter: PersonMini | null
}) {
  const url = useUrlState()
  const search = useDebouncedSearch()
  const { ask, dialog, busyPhotoId } = usePhotoModeration()

  const reportedView = view === "reported"
  const sort = url.get("sort", DEFAULT_SORT)
  const query = url.get("search")
  const cafe = url.get("cafe", "all")
  const source = url.get("source", "all")
  const owner = url.get("owner", "all")
  const user = url.get("user")

  const filters: ActiveFilter[] = []
  if (query) filters.push({ key: "search", label: "Username", value: `“${query}”`, onRemove: () => url.set("search", "") })
  if (user)
    filters.push({
      key: "user",
      label: "Owner",
      value: userFilter ? handle(userFilter) : "Unknown user",
      onRemove: () => url.set("user", ""),
    })
  if (cafe !== "all")
    filters.push({
      key: "cafe",
      label: "Café",
      value: cafes.find((c) => c.id === cafe)?.name ?? "Unknown café",
      onRemove: () => url.set("cafe", "", "all"),
    })
  if (!reportedView && source !== "all")
    filters.push({
      key: "source",
      label: "Source",
      value: SOURCES.find((s) => s.value === source)?.label ?? source,
      onRemove: () => url.set("source", "", "all"),
    })
  if (!reportedView && owner !== "all")
    filters.push({
      key: "owner",
      label: "Owner",
      value: OWNER_VISIBILITY.find((s) => s.value === owner)?.label ?? owner,
      onRemove: () => url.set("owner", "", "all"),
    })

  const summary = [
    counts.reported > 0
      ? `${counts.reported.toLocaleString()} ${counts.reported === 1 ? "photo" : "photos"} reported (${counts.open_reports.toLocaleString()} open ${counts.open_reports === 1 ? "report" : "reports"})`
      : "No open reports",
    `${counts.all.toLocaleString()} photos in all`,
    counts.removed > 0 ? `${counts.removed.toLocaleString()} removed` : null,
    counts.hidden_by_owner > 0 ? `${counts.hidden_by_owner.toLocaleString()} hidden by their owners` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  let empty: React.ReactNode
  if (photos.length === 0) {
    if (filters.length > 0) {
      empty = (
        <TableEmpty
          icon={MagnifyingGlassIcon}
          title="No photos match"
          body="Try another username, or clear the filters."
          action={
            <Button variant="outline" size="sm" onClick={() => url.clear(FILTER_KEYS)}>
              Clear filters
            </Button>
          }
        />
      )
    } else if (reportedView) {
      empty = (
        <TableEmpty
          icon={FlagIcon}
          title="Nothing waiting"
          body="When someone reports a gallery photo in the app, it lands here until you remove it or dismiss the report."
        />
      )
    } else if (view === "removed") {
      empty = <TableEmpty icon={ImagesIcon} title="No removed photos" body="Photos you remove show here so you can restore them." />
    } else {
      empty = <TableEmpty icon={ImagesIcon} title="No photos yet" body="Photos people add to their coffee gallery show here." />
    }
  }

  const reportedTable = (
    <Table>
      <TableHeader>
        <TableRow className="border-b hover:bg-transparent">
          <TableHead className={TH}>Photo</TableHead>
          <TableHead className={TH}>Reports</TableHead>
          <TableHead className={`${TH} text-right`}>Last report</TableHead>
          <TableHead className={`${TH} w-px`}>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(photos as ReportedPhoto[]).map((photo) => (
          <TableRow key={photo.id} className={TR}>
            <TableCell className={`${TD} max-w-[24rem]`}>
              <div className="flex min-w-0 items-center gap-3">
                <PhotoThumb photo={photo} size="lg" />
                <div className="min-w-0">
                  <PhotoName photo={photo} />
                  {photo.moderation_status !== "visible" && (
                    <PhotoStatusChips photo={photo} showOpenReports={false} className="mt-1 flex gap-1.5" />
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className={`${TD} max-w-[18rem]`}>
              <div className="grid min-w-0 leading-tight">
                <span className="truncate">
                  <span className="font-medium tabular-nums">{photo.open_reports}</span>
                  <span className="text-muted-foreground"> · </span>
                  {reasonsLine(photo)}
                </span>
                <span className="mt-0.5 truncate text-xs text-muted-foreground" title={photo.latest_details ?? undefined}>
                  {photo.latest_details ? `“${photo.latest_details}”` : reportersLine(photo.reporters)}
                </span>
              </div>
            </TableCell>
            <TableCell className={`${TD} text-right text-muted-foreground`}>
              <Age iso={photo.last_reported_at} />
            </TableCell>
            <TableCell className={`${TD} text-right`}>
              <QueueActions photo={photo} ask={ask} busy={busyPhotoId === photo.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const browseTable = (
    <Table>
      <TableHeader>
        <TableRow className="border-b hover:bg-transparent">
          <TableHead className={TH}>Photo</TableHead>
          <TableHead className={TH}>Source</TableHead>
          <TableHead className={TH}>Status</TableHead>
          <TableHead className={`${TH} text-right`}>Posted</TableHead>
          <TableHead className={`${TH} w-12`}>
            <span className="sr-only">Open</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {photos.map((photo) => (
          <TableRow key={photo.id} className={TR}>
            <TableCell className={`${TD} max-w-[26rem]`}>
              <div className="flex min-w-0 items-center gap-3">
                <PhotoThumb photo={photo} />
                <PhotoName photo={photo} />
              </div>
            </TableCell>
            <TableCell className={`${TD} text-muted-foreground`}>{PHOTO_SOURCE_LABELS[photo.source]}</TableCell>
            <TableCell className={TD}>
              <PhotoStatusChips photo={photo} />
            </TableCell>
            <TableCell className={`${TD} text-right text-muted-foreground`}>
              <Age iso={photo.created_at} />
            </TableCell>
            <TableCell className={`${TD} text-right`}>
              <OpenLink photo={photo} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const list = photos.map((photo) => (
    <li key={photo.id} className="flex items-start gap-3 py-3 pr-2 pl-4">
      <PhotoThumb photo={photo} size={reportedView ? "lg" : "md"} />
      <div className="min-w-0 flex-1">
        <PhotoName photo={photo} />
        {reportedView ? (
          <p className="mt-1 truncate text-xs">
            <span className="font-medium tabular-nums">{photo.open_reports}</span>
            <span className="text-muted-foreground"> · </span>
            {reasonsLine(photo as ReportedPhoto)}
            <span className="text-muted-foreground">
              {" · "}
              <Age iso={(photo as ReportedPhoto).last_reported_at} />
            </span>
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <PhotoStatusChips photo={photo} />
            <span>
              {PHOTO_SOURCE_LABELS[photo.source]} · <Age iso={photo.created_at} />
            </span>
          </div>
        )}
      </div>
      {reportedView ? <QueueActions photo={photo as ReportedPhoto} compact ask={ask} busy={busyPhotoId === photo.id} /> : <OpenLink photo={photo} />}
    </li>
  ))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Gallery photos" summary={summary} />

      <StatusTabs
        value={view}
        label="Which photos"
        onChange={(v) => url.set("view", v, DEFAULT_VIEW)}
        tabs={[
          { value: "reported", label: "Reported", count: counts.reported },
          { value: "all", label: "All photos", count: counts.all },
          { value: "visible", label: "Visible", count: counts.visible },
          { value: "removed", label: "Removed", count: counts.removed },
        ]}
      />

      <Toolbar>
        <SearchField value={search.value} onChange={search.onChange} placeholder="Search by @username" />
        {cafes.length > 0 && (
          <FilterSelect
            label="Café"
            value={cafe}
            onChange={(v) => url.set("cafe", v, "all")}
            options={cafes.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        {reportedView ? (
          <FilterSelect
            label="Sort"
            value={sort}
            allValue={DEFAULT_SORT}
            allLabel="Waiting longest"
            onChange={(v) => url.set("sort", v, DEFAULT_SORT)}
            options={SORTS}
          />
        ) : (
          <>
            <FilterSelect label="Source" value={source} onChange={(v) => url.set("source", v, "all")} options={SOURCES} />
            <FilterSelect
              label="Owner"
              value={owner}
              allLabel="Shown or hidden"
              onChange={(v) => url.set("owner", v, "all")}
              options={OWNER_VISIBILITY}
            />
          </>
        )}
      </Toolbar>

      <FilterChips filters={filters} onClearAll={() => url.clear(FILTER_KEYS)} />

      <TableCard
        busy={url.isPending}
        empty={empty}
        table={reportedView ? reportedTable : browseTable}
        list={list}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={photos.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun={total === 1 ? "photo" : "photos"}
          />
        }
      />

      {dialog}
    </div>
  )
}
