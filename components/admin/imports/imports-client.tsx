"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLineDown,
  ArrowLineUp,
  ArrowSquareOut,
  CloudArrowDown,
  DotsThree,
  MapPin,
  PencilSimple,
  Star,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BulkBar,
  FilterChips,
  FilterSelect,
  PageHeader,
  SearchField,
  SelectAllCheckbox,
  StatusChip,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Toolbar,
  TR,
  useDebouncedSearch,
  useUrlState,
  type ActiveFilter,
  type Tone,
} from "@/components/admin/table-kit"
import {
  publishImportsAction,
  publishTierInCityAction,
  unpublishImportsAction,
  updateImportedCafeAction,
  type ImportActionResult,
} from "@/app/admin/imports/actions"
import { IMPORT_FLAGS, type ImportRow, type ImportStatus, type ImportSummaryRow } from "@/lib/queries/imports"

const STATUS: Record<ImportStatus, { label: string; tone: Tone }> = {
  draft: { label: "To review", tone: "warning" },
  active: { label: "Published", tone: "success" },
  inactive: { label: "Hidden", tone: "danger" },
}

const METROS: Record<string, string> = {
  cebu: "Metro Cebu",
  manila: "Metro Manila",
}
const metroLabel = (m: string) => METROS[m] ?? m.replace(/(^|-)\w/g, (s) => s.toUpperCase()).replace(/-/g, " ")

const FILTER_KEYS = ["search", "city", "metro", "tier", "hours", "flag", "sort"]

const FLAG_LABEL: Record<string, string> = {
  multi_branch: "Several branches",
  takeaway_type: "Takeaway",
  few_reviews: "Few reviews",
  city_from_neighbors: "City guessed from neighbours",
  city_from_address: "City read from address",
  outside_city_box: "Outside the city box",
}

/** quality_reasons + flags in words. The Google rating has its own column. */
function notesFor(row: ImportRow): string[] {
  const out: string[] = []
  for (const r of row.quality_reasons) {
    let m: RegExpMatchArray | null
    if (r === "hours" || r.startsWith("rating_") && /x\d+$/.test(r)) continue
    else if (r === "no_hours") out.push("No hours")
    else if (r === "no_rating") out.push("No Google rating")
    else if ((m = r.match(/^ratings_(\d+)<(\d+)$/))) out.push(`Only ${m[1]} ratings`)
    else if ((m = r.match(/^rating_([\d.]+)<([\d.]+)$/))) out.push(`Rated ${m[1]}`)
    else if (r === "address:plus_code_only") out.push("Plus-code address")
    else if (r === "name:tea_shop") out.push("Name sounds like a tea shop")
    else if (r === "name:branch") out.push("Branch in the name")
    else if (r === "category:chain") out.push("Chain")
    else if (r === "category:borderline") out.push("Borderline café")
    else if (r.startsWith("flag:")) out.push(FLAG_LABEL[r.slice(5)] ?? r.slice(5).replace(/_/g, " "))
    else out.push(r.replace(/_/g, " "))
  }
  for (const f of row.flags) {
    const label = FLAG_LABEL[f] ?? f.replace(/_/g, " ")
    if (!out.includes(label)) out.push(label)
  }
  if (row.is_chain && !out.includes("Chain")) out.push("Chain")
  return out
}

/** "Lahug, Cebu City"; just the city when the area repeats it. */
function areaOf(row: ImportRow) {
  const { neighborhood, city } = row.cafes
  return neighborhood && neighborhood.trim() !== city ? `${neighborhood.trim()}, ${city}` : city
}

function pinUrl(row: ImportRow) {
  return `https://www.google.com/maps/search/?api=1&query=${row.cafes.lat},${row.cafes.lng}`
}

function Tier({ row }: { row: ImportRow }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={
          row.quality_tier === "A"
            ? "rounded-md bg-foreground px-1.5 text-xs font-semibold text-background"
            : "rounded-md border px-1.5 text-xs font-semibold"
        }
      >
        {row.quality_tier}
      </span>
      {row.quality_score !== null && (
        <span className="text-xs text-muted-foreground tabular-nums">{Number(row.quality_score).toFixed(2)}</span>
      )}
    </span>
  )
}

function GoogleRating({ row }: { row: ImportRow }) {
  if (row.google_rating === null) return <span className="text-muted-foreground">None</span>
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      <Star weight="fill" className="size-3.5" aria-hidden />
      {Number(row.google_rating).toFixed(1)}
      <span className="text-muted-foreground">· {(row.google_rating_count ?? 0).toLocaleString()}</span>
    </span>
  )
}

function Hours({ row }: { row: ImportRow }) {
  return row.cafes.operating_hours ? (
    <span className="whitespace-nowrap">Has hours</span>
  ) : (
    <span className="whitespace-nowrap text-muted-foreground">No hours</span>
  )
}

function toastResult(r: ImportActionResult, verb: "published" | "unpublished") {
  if (!r.success) {
    toast.error(r.error)
    return
  }
  const noun = (n: number) => `${n.toLocaleString()} ${n === 1 ? "café" : "cafés"}`
  if (r.done > 0) toast.success(`${noun(r.done)} ${verb}`)
  if (r.skippedDuplicates > 0) {
    toast.warning(`${noun(r.skippedDuplicates)} skipped: an owner or Nook already lists a café with that name within 100 m.`)
  }
  if (r.done === 0 && r.skippedDuplicates === 0) toast.info(`Nothing to change: already ${verb}${verb === "unpublished" ? ", claimed or owned" : ""}.`)
}

// ---------------------------------------------------------------------------

function QuickEdit({ row, open, onOpenChange }: { row: ImportRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = React.useState(row.cafes.name)
  const [area, setArea] = React.useState(row.cafes.neighborhood ?? "")
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function save(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await updateImportedCafeAction(row.cafe_id, { name, neighborhood: area })
      if (!r.success) {
        setError(r.error)
        return
      }
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Quick fix</DialogTitle>
            <DialogDescription>
              {row.cafes.address ?? row.cafes.city}. Hours, photos and links are on the full edit page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`name-${row.cafe_id}`}>Name</Label>
            <Input id={`name-${row.cafe_id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`area-${row.cafe_id}`}>Area</Label>
            <Input
              id={`area-${row.cafe_id}`}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={80}
              placeholder={row.cafes.city}
            />
          </div>
          {error && <p className="text-[13px] text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <Link href={`/admin/cafes/${row.cafe_id}/edit`}>Edit hours and more</Link>
            </Button>
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RowActions({ row }: { row: ImportRow }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [editing, setEditing] = React.useState(false)
  const status = row.cafes.status

  function publish() {
    start(async () => toastResult(await publishImportsAction([row.cafe_id]), "published"))
  }
  function unpublish() {
    start(async () => toastResult(await unpublishImportsAction([row.cafe_id]), "unpublished"))
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status === "draft" && (
        <Button variant="outline" size="sm" loading={pending} onClick={publish}>
          Publish
        </Button>
      )}
      {status === "active" && (
        <Button variant="ghost" size="sm" loading={pending} onClick={unpublish} disabled={row.cafes.is_claimed}>
          Unpublish
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More for ${row.cafes.name}`}>
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilSimple />
            Quick fix name or area
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/admin/cafes/${row.cafe_id}/edit`)}>
            <PencilSimple />
            Edit hours and more
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={pinUrl(row)} target="_blank" rel="noreferrer">
              <MapPin />
              Check the pin
            </a>
          </DropdownMenuItem>
          {row.google_maps_url && (
            <DropdownMenuItem asChild>
              <a href={row.google_maps_url} target="_blank" rel="noreferrer">
                <ArrowSquareOut />
                Open on Google Maps
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Mounted only while open, so each opening starts from the row's values. */}
      {editing && <QuickEdit row={row} open onOpenChange={setEditing} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Counts per city, with the one-click "publish all tier A in <city>"

type CityCount = { city: string; metro: string | null; a: number; b: number; c: number; published: number; hidden: number }

function cityCounts(summary: ImportSummaryRow[]): CityCount[] {
  const by = new Map<string, CityCount>()
  for (const s of summary) {
    const c = by.get(s.city) ?? { city: s.city, metro: s.metro, a: 0, b: 0, c: 0, published: 0, hidden: 0 }
    if (s.status === "draft") {
      if (s.quality_tier === "A") c.a += s.n
      else if (s.quality_tier === "B") c.b += s.n
      else c.c += s.n
    } else if (s.status === "active") c.published += s.n
    else c.hidden += s.n
    by.set(s.city, c)
  }
  return [...by.values()].sort((x, y) => y.a - x.a || y.b - x.b || x.city.localeCompare(y.city))
}

function PublishCityTier({ city, count }: { city: string; count: number }) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  if (count === 0) return <span className="text-xs text-muted-foreground">Nothing to publish</span>

  function go() {
    start(async () => {
      toastResult(await publishTierInCityAction(city, "A"), "published")
      setOpen(false)
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowLineUp aria-hidden />
        Publish tier A
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publish {count.toLocaleString()} tier A {count === 1 ? "café" : "cafés"} in {city}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They go live in the app and on the web right away, as unverified listings from Google (no photos yet,
              hours as Google has them). Likely duplicates of cafés already on Nook are skipped. You can unpublish
              any of them here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button loading={pending} onClick={go}>
              Publish {count.toLocaleString()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CityCounts({ rows, onCity }: { rows: CityCount[]; onCity: (city: string) => void }) {
  const [all, setAll] = React.useState(false)
  const shown = all ? rows : rows.slice(0, 6)
  if (rows.length === 0) return null
  return (
    <section aria-label="Imports by city" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-semibold">By city</h2>
        <p className="hidden text-xs text-muted-foreground sm:block">Tier A has hours and a strong Google rating. B is missing one of them.</p>
      </div>
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className={TH}>City</TableHead>
              <TableHead className={`${TH} text-right`}>Tier A to review</TableHead>
              <TableHead className={`${TH} text-right`}>Tier B to review</TableHead>
              <TableHead className={`${TH} text-right`}>Published</TableHead>
              <TableHead className={`${TH} w-44 text-right`}>
                <span className="sr-only">Publish</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((c) => (
              <TableRow key={c.city} className={TR}>
                <TableCell className={TD}>
                  <button type="button" onClick={() => onCity(c.city)} className="font-medium hover:underline">
                    {c.city}
                  </button>
                  {c.metro && <span className="ml-2 text-xs text-muted-foreground">{metroLabel(c.metro)}</span>}
                </TableCell>
                <TableCell className={`${TD} text-right tabular-nums`}>{c.a.toLocaleString()}</TableCell>
                <TableCell className={`${TD} text-right tabular-nums text-muted-foreground`}>{c.b.toLocaleString()}</TableCell>
                <TableCell className={`${TD} text-right tabular-nums`}>{c.published.toLocaleString()}</TableCell>
                <TableCell className={`${TD} text-right`}>
                  <PublishCityTier city={c.city} count={c.a} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y sm:hidden">
        {shown.map((c) => (
          <li key={c.city} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onCity(c.city)} className="block truncate text-sm font-medium">
                {c.city}
              </button>
              <p className="text-xs text-muted-foreground tabular-nums">
                A {c.a.toLocaleString()} · B {c.b.toLocaleString()} · {c.published.toLocaleString()} published
              </p>
            </div>
            <PublishCityTier city={c.city} count={c.a} />
          </li>
        ))}
      </ul>
      {rows.length > 6 && (
        <div className="border-t px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="min-h-8 text-[13px] font-medium hover:underline"
          >
            {all ? "Show fewer cities" : `Show all ${rows.length} cities`}
          </button>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

export function ImportsClient({
  rows,
  page,
  pageSize,
  total,
  totalPages,
  missingTable,
  summary,
}: {
  rows: ImportRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  missingTable: boolean
  summary: ImportSummaryRow[]
}) {
  const url = useUrlState()
  const search = useDebouncedSearch()
  // Selection is per page: a new page or filter is a new set of rows, so the
  // selection is keyed by the rows it was made on.
  const rowKey = rows.map((r) => r.cafe_id).join(",")
  const [selection, setSelection] = React.useState<{ key: string; ids: Set<string> }>({ key: rowKey, ids: new Set() })
  const selected = selection.key === rowKey ? selection.ids : new Set<string>()
  const setSelected = (next: Set<string> | ((prev: Set<string>) => Set<string>)) =>
    setSelection((prev) => {
      const base = prev.key === rowKey ? prev.ids : new Set<string>()
      return { key: rowKey, ids: typeof next === "function" ? next(base) : next }
    })
  const [bulkPending, startBulk] = React.useTransition()

  const status = url.get("status", "draft")
  const city = url.get("city", "all")
  const metro = url.get("metro", "all")
  const tier = url.get("tier", "all")
  const hours = url.get("hours", "all")
  const flag = url.get("flag", "all")
  const sort = url.get("sort", "score")

  // Counts follow the city/metro/tier/hours filters (the ones the summary has).
  const scoped = summary.filter(
    (s) =>
      (city === "all" || s.city === city) &&
      (metro === "all" || s.metro === metro) &&
      (tier === "all" || s.quality_tier === tier) &&
      (hours === "all" || s.has_hours === (hours === "yes"))
  )
  const count = (st?: ImportStatus) => scoped.filter((s) => !st || s.status === st).reduce((n, s) => n + s.n, 0)
  const toReview = summary.filter((s) => s.status === "draft").reduce((n, s) => n + s.n, 0)
  const published = summary.filter((s) => s.status === "active").reduce((n, s) => n + s.n, 0)

  const cities = [...new Set(summary.filter((s) => metro === "all" || s.metro === metro).map((s) => s.city))].sort()
  const metros = [...new Set(summary.map((s) => s.metro).filter((m): m is string => !!m))].sort()
  const byCity = cityCounts(summary.filter((s) => (metro === "all" || s.metro === metro) && (city === "all" || s.city === city)))

  const filters: ActiveFilter[] = []
  if (url.get("search")) filters.push({ key: "search", label: "Search", value: `“${url.get("search")}”`, onRemove: () => url.set("search", "") })
  if (city !== "all") filters.push({ key: "city", label: "City is", value: city, onRemove: () => url.set("city", "all", "all") })
  if (metro !== "all") filters.push({ key: "metro", label: "Metro is", value: metroLabel(metro), onRemove: () => url.set("metro", "all", "all") })
  if (tier !== "all") filters.push({ key: "tier", label: "Tier", value: tier, onRemove: () => url.set("tier", "all", "all") })
  if (hours !== "all") filters.push({ key: "hours", label: "Hours", value: hours === "yes" ? "Has hours" : "No hours", onRemove: () => url.set("hours", "all", "all") })
  if (flag !== "all") filters.push({ key: "flag", label: "Flag", value: IMPORT_FLAGS.find((f) => f.value === flag)?.label ?? flag, onRemove: () => url.set("flag", "all", "all") })

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.cafe_id))
  const someOnPage = rows.some((r) => selected.has(r.cafe_id))
  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function bulk(kind: "publish" | "unpublish") {
    const ids = rows
      .filter((r) => selected.has(r.cafe_id) && r.cafes.status === (kind === "publish" ? "draft" : "active"))
      .map((r) => r.cafe_id)
    if (ids.length === 0) {
      toast.info(kind === "publish" ? "No drafts in the selection" : "Nothing published in the selection")
      return
    }
    startBulk(async () => {
      const r = kind === "publish" ? await publishImportsAction(ids) : await unpublishImportsAction(ids)
      toastResult(r, kind === "publish" ? "published" : "unpublished")
      if (r.success) setSelected(new Set())
    })
  }

  const hasFilters = filters.length > 0
  const empty =
    rows.length === 0 ? (
      missingTable ? (
        <TableEmpty
          icon={CloudArrowDown}
          title="Imports aren’t set up yet"
          body="Apply the cafe_imports migrations, then run the draft import (nook-supabase docs/CAFE_IMPORT_APPLY.md)."
        />
      ) : hasFilters ? (
        <TableEmpty
          icon={CloudArrowDown}
          title="No imported cafés match"
          body="Try a different search or fewer filters."
          action={
            <Button variant="outline" size="sm" onClick={() => url.clear(FILTER_KEYS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          icon={CloudArrowDown}
          title={status === "draft" ? "Nothing to review" : "None here"}
          body={status === "draft" ? "Every imported café has been published or hidden." : undefined}
        />
      )
    ) : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Imports"
        summary={
          <>
            {toReview.toLocaleString()} cafés from Google waiting for review · {published.toLocaleString()} published.
            <br className="hidden sm:block" />{" "}
            Imported from Google · unverified: names, pins and hours are leads to check, not facts.
          </>
        }
      />

      <CityCounts rows={byCity} onCity={(c) => url.set("city", c, "all")} />

      <StatusTabs
        value={status}
        onChange={(v) => url.set("status", v, "draft")}
        tabs={[
          { value: "draft", label: "To review", count: count("draft") },
          { value: "active", label: "Published", count: count("active") },
          { value: "inactive", label: "Hidden", count: count("inactive") },
          { value: "all", label: "All", count: count() },
        ]}
      />

      {selected.size > 0 ? (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          {status !== "active" && (
            <Button size="sm" loading={bulkPending} onClick={() => bulk("publish")}>
              <ArrowLineUp aria-hidden />
              Publish selected
            </Button>
          )}
          {status !== "draft" && (
            <Button variant="outline" size="sm" loading={bulkPending} onClick={() => bulk("unpublish")}>
              <ArrowLineDown aria-hidden />
              Unpublish selected
            </Button>
          )}
        </BulkBar>
      ) : (
        <Toolbar>
          <SearchField value={search.value} onChange={search.onChange} placeholder="Search imports by name" />
          <FilterSelect
            label="Metro"
            value={metro}
            onChange={(v) => url.set("metro", v, "all")}
            options={metros.map((m) => ({ value: m, label: metroLabel(m) }))}
          />
          <FilterSelect label="City" value={city} onChange={(v) => url.set("city", v, "all")} options={cities.map((c) => ({ value: c, label: c }))} />
          <FilterSelect
            label="Tier"
            value={tier}
            onChange={(v) => url.set("tier", v, "all")}
            options={[
              { value: "A", label: "A" },
              { value: "B", label: "B" },
            ]}
          />
          <FilterSelect
            label="Hours"
            value={hours}
            onChange={(v) => url.set("hours", v, "all")}
            allLabel="With or without hours"
            options={[
              { value: "yes", label: "Has hours" },
              { value: "no", label: "No hours" },
            ]}
          />
          <FilterSelect
            label="Flag"
            value={flag}
            onChange={(v) => url.set("flag", v, "all")}
            options={IMPORT_FLAGS.map((f) => ({ value: f.value, label: f.label }))}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            allValue="score"
            allLabel="Best first"
            onChange={(v) => url.set("sort", v, "score")}
            options={[
              { value: "ratings", label: "Most Google ratings" },
              { value: "name", label: "Name A–Z" },
            ]}
          />
        </Toolbar>
      )}

      <FilterChips filters={filters} onClearAll={() => url.clear(FILTER_KEYS)} />

      <TableCard
        busy={url.isPending}
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={`${TH} w-10`}>
                  <SelectAllCheckbox
                    checked={allOnPage}
                    indeterminate={someOnPage && !allOnPage}
                    onChange={(on) => setSelected(on ? new Set(rows.map((r) => r.cafe_id)) : new Set())}
                  />
                </TableHead>
                <TableHead className={TH}>Café</TableHead>
                <TableHead className={TH}>Tier</TableHead>
                <TableHead className={TH}>Google</TableHead>
                <TableHead className={TH}>Hours</TableHead>
                <TableHead className={TH}>Why this tier</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={`${TH} w-40`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelected = selected.has(row.cafe_id)
                const notes = notesFor(row)
                return (
                  <TableRow key={row.cafe_id} data-state={isSelected ? "selected" : undefined} className={TR}>
                    <TableCell className={TD}>
                      <Checkbox
                        aria-label={`Select ${row.cafes.name}`}
                        checked={isSelected}
                        onCheckedChange={(v) => toggle(row.cafe_id, v === true)}
                      />
                    </TableCell>
                    <TableCell className={`${TD} max-w-[18rem]`}>
                      <div className="grid min-w-0 leading-tight">
                        <Link href={`/admin/cafes/${row.cafe_id}`} className="truncate font-medium hover:underline">
                          {row.cafes.name}
                        </Link>
                        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <a
                            href={pinUrl(row)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Pin for ${row.cafes.name} on Google Maps`}
                            className="shrink-0 hover:text-foreground"
                          >
                            <MapPin className="size-3.5" aria-hidden />
                          </a>
                          <span className="truncate">{areaOf(row)}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <Tier row={row} />
                    </TableCell>
                    <TableCell className={TD}>
                      <GoogleRating row={row} />
                    </TableCell>
                    <TableCell className={TD}>
                      <Hours row={row} />
                    </TableCell>
                    <TableCell className={`${TD} max-w-[14rem] whitespace-normal`}>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">{notes.length ? notes.join(" · ") : "Meets the bar"}</span>
                    </TableCell>
                    <TableCell className={TD}>
                      <StatusChip tone={STATUS[row.cafes.status].tone}>{STATUS[row.cafes.status].label}</StatusChip>
                    </TableCell>
                    <TableCell className={`${TD} text-right`}>
                      <RowActions row={row} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
        list={rows.map((row) => {
          const notes = notesFor(row)
          return (
            <li key={row.cafe_id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                aria-label={`Select ${row.cafes.name}`}
                checked={selected.has(row.cafe_id)}
                onCheckedChange={(v) => toggle(row.cafe_id, v === true)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/cafes/${row.cafe_id}`} className="line-clamp-2 text-sm font-medium">
                    {row.cafes.name}
                  </Link>
                  <Tier row={row} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {areaOf(row)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <StatusChip tone={STATUS[row.cafes.status].tone}>{STATUS[row.cafes.status].label}</StatusChip>
                  <GoogleRating row={row} />
                  <span className="text-muted-foreground">·</span>
                  <Hours row={row} />
                </div>
                {notes.length > 0 && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notes.join(" · ")}</p>}
                <div className="mt-2 -ml-2 flex justify-start">
                  <RowActions row={row} />
                </div>
              </div>
            </li>
          )
        })}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={rows.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun="imported cafés"
          />
        }
      />
    </div>
  )
}
