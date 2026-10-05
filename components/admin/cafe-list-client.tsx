"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLineDown,
  ArrowLineUp,
  DotsThree,
  Eye,
  PencilSimple,
  Plus,
  Star,
  Storefront,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  Thumb,
  Toolbar,
  TR,
  shortDate,
  useDebouncedSearch,
  useUrlState,
  type ActiveFilter,
  type Tone,
} from "@/components/admin/table-kit"
import { setCafeStatusAction, deleteCafeAction } from "@/app/admin/cafes/actions"
import { type Cafe } from "@/lib/queries/cafes"

type CafeRow = Cafe & { cafe_owner_cafe: { owner_id: string }[] | null }
type TagOption = { id: string; name: string; category: string }
type StatusCounts = {
  all: number
  active: number
  draft: number
  inactive: number
  toPublish: number
}

// A draft the owner has sent for review reads differently from one still
// being set up: it's waiting on us.
function statusOf(cafe: CafeRow) {
  if (cafe.status === "draft" && cafe.review_requested_at) {
    return { label: "Ready to publish", tone: "info" as Tone }
  }
  return STATUS[cafe.status]
}

const STATUS: Record<Cafe["status"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  inactive: { label: "Inactive", tone: "danger" },
}

const SORTS = [
  { value: "recent", label: "Recently added" },
  { value: "az", label: "Name A–Z" },
  { value: "rating", label: "Highest rated" },
]

const FILTER_KEYS = ["search", "neighborhood", "tag", "featured", "owner", "sort"]

function CafeActions({ cafe }: { cafe: CafeRow }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function handleStatusChange(status: "active" | "inactive") {
    startTransition(async () => {
      try {
        await setCafeStatusAction(cafe.id, status)
        toast.success(status === "active" ? `${cafe.name} is live` : `${cafe.name} is hidden`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn’t change the status")
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCafeAction(cafe.id)
        toast.success(`${cafe.name} deleted`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn’t delete the café")
      }
    })
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Actions for ${cafe.name}`}>
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => router.push(`/admin/cafes/${cafe.id}/edit`)}>
            <PencilSimple />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/admin/cafes/${cafe.id}/preview`)}>
            <Eye />
            Preview
          </DropdownMenuItem>
          {cafe.status !== "draft" && <DropdownMenuSeparator />}
          {cafe.status === "active" && (
            <DropdownMenuItem onClick={() => handleStatusChange("inactive")}>
              <ArrowLineDown />
              Deactivate
            </DropdownMenuItem>
          )}
          {cafe.status === "inactive" && (
            <DropdownMenuItem onClick={() => handleStatusChange("active")}>
              <ArrowLineUp />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {cafe.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The listing, its menu and photos are removed from Nook. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete café
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Rating({ cafe }: { cafe: CafeRow }) {
  // Unreviewed cafés carry rating 0 rather than null; no real rating is 0.
  if (!cafe.rating) {
    return <span className="text-muted-foreground">No reviews</span>
  }
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star weight="fill" className="size-3.5 text-foreground" aria-hidden />
      {Number(cafe.rating).toFixed(1)}
    </span>
  )
}

function OwnerChip({ claimed }: { claimed: boolean }) {
  return claimed ? (
    <StatusChip tone="neutral">Claimed</StatusChip>
  ) : (
    <StatusChip tone="warning">Unclaimed</StatusChip>
  )
}

export function CafeListClient({
  cafes,
  tagOptions,
  neighborhoodOptions,
  page,
  total,
  totalPages,
  pageSize,
  statusCounts,
}: {
  cafes: CafeRow[]
  tagOptions: TagOption[]
  neighborhoodOptions: string[]
  page: number
  total: number
  totalPages: number
  pageSize: number
  statusCounts: StatusCounts
}) {
  const url = useUrlState()
  const search = useDebouncedSearch()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkPending, startBulk] = React.useTransition()

  // Selection is per page: a new page or filter is a new set of rows.
  const rowKey = cafes.map((c) => c.id).join(",")
  React.useEffect(() => setSelected(new Set()), [rowKey])

  const status = url.get("status", "all")
  const neighborhood = url.get("neighborhood", "all")
  const tag = url.get("tag", "all")
  const featured = url.get("featured", "all")
  const owner = url.get("owner", "all")
  const sort = url.get("sort", "recent")

  const filters: ActiveFilter[] = []
  if (url.get("search")) filters.push({ key: "search", label: "Search", value: `“${url.get("search")}”`, onRemove: () => url.set("search", "") })
  if (neighborhood !== "all") filters.push({ key: "neighborhood", label: "Area is", value: neighborhood, onRemove: () => url.set("neighborhood", "all", "all") })
  if (tag !== "all") filters.push({ key: "tag", label: "Tag is", value: tagOptions.find((t) => t.id === tag)?.name ?? "Unknown tag", onRemove: () => url.set("tag", "all", "all") })
  if (featured !== "all") filters.push({ key: "featured", label: "Featured", value: featured === "featured" ? "Yes" : "No", onRemove: () => url.set("featured", "all", "all") })
  if (owner !== "all") filters.push({ key: "owner", label: "Owner", value: owner === "claimed" ? "Claimed" : "Unclaimed", onRemove: () => url.set("owner", "all", "all") })

  const allOnPage = cafes.length > 0 && cafes.every((c) => selected.has(c.id))
  const someOnPage = cafes.some((c) => selected.has(c.id))

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // setCafeStatusAction takes one id, so a bulk change is one call per café.
  // Drafts are skipped: publishing a draft is a decision made on its own page.
  function bulkStatus(next: "active" | "inactive") {
    const targets = cafes.filter((c) => selected.has(c.id) && c.status !== "draft" && c.status !== next)
    if (targets.length === 0) {
      toast.info(next === "active" ? "Nothing to activate in the selection" : "Nothing to deactivate in the selection")
      return
    }
    startBulk(async () => {
      const results = await Promise.allSettled(targets.map((c) => setCafeStatusAction(c.id, next)))
      const failed = results.filter((r) => r.status === "rejected").length
      const done = targets.length - failed
      if (done > 0) toast.success(`${done} ${done === 1 ? "café" : "cafés"} ${next === "active" ? "activated" : "deactivated"}`)
      if (failed > 0) toast.error(`${failed} couldn’t be changed. Try them again.`)
      setSelected(new Set())
    })
  }

  const hasFilters = filters.length > 0
  const empty =
    cafes.length === 0 ? (
      hasFilters || status !== "all" ? (
        <TableEmpty
          icon={Storefront}
          title="No cafés match"
          body="Try a different search or fewer filters."
          action={
            <Button variant="outline" size="sm" onClick={() => url.clear([...FILTER_KEYS, "status"])}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          icon={Storefront}
          title="No cafés yet"
          body="Listings you add show up here, as drafts until you publish them."
          action={
            <Button asChild size="sm">
              <Link href="/admin/cafes/new">Add café</Link>
            </Button>
          }
        />
      )
    ) : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Cafés"
        summary={`${statusCounts.all.toLocaleString()} listings · ${statusCounts.active.toLocaleString()} live on Nook`}
        action={
          <Button asChild>
            <Link href="/admin/cafes/new">
              <Plus aria-hidden />
              Add café
            </Link>
          </Button>
        }
      />

      <StatusTabs
        value={status}
        onChange={(v) => url.set("status", v, "all")}
        tabs={[
          { value: "all", label: "All", count: statusCounts.all },
          { value: "active", label: "Active", count: statusCounts.active },
          { value: "draft", label: "Draft", count: statusCounts.draft },
          { value: "to_publish", label: "To publish", count: statusCounts.toPublish },
          { value: "inactive", label: "Inactive", count: statusCounts.inactive },
        ]}
      />

      {selected.size > 0 ? (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="outline" size="sm" loading={bulkPending} onClick={() => bulkStatus("active")}>
            <ArrowLineUp aria-hidden />
            Activate
          </Button>
          <Button variant="outline" size="sm" loading={bulkPending} onClick={() => bulkStatus("inactive")}>
            <ArrowLineDown aria-hidden />
            Deactivate
          </Button>
        </BulkBar>
      ) : (
        <Toolbar>
          <SearchField value={search.value} onChange={search.onChange} placeholder="Search cafés by name" />
          <FilterSelect
            label="Area"
            value={neighborhood}
            onChange={(v) => url.set("neighborhood", v, "all")}
            options={neighborhoodOptions.map((n) => ({ value: n, label: n }))}
          />
          <FilterSelect
            label="Tag"
            value={tag}
            onChange={(v) => url.set("tag", v, "all")}
            options={tagOptions.map((t) => ({ value: t.id, label: t.name }))}
          />
          <FilterSelect
            label="Featured"
            value={featured}
            onChange={(v) => url.set("featured", v, "all")}
            allLabel="Featured or not"
            options={[
              { value: "featured", label: "Featured" },
              { value: "not-featured", label: "Not featured" },
            ]}
          />
          <FilterSelect
            label="Owner"
            value={owner}
            onChange={(v) => url.set("owner", v, "all")}
            allLabel="Any owner"
            options={[
              { value: "claimed", label: "Claimed" },
              { value: "unclaimed", label: "Unclaimed" },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            allValue="recent"
            allLabel="Recently added"
            onChange={(v) => url.set("sort", v, "recent")}
            options={SORTS.filter((s) => s.value !== "recent")}
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
                    onChange={(on) => setSelected(on ? new Set(cafes.map((c) => c.id)) : new Set())}
                  />
                </TableHead>
                <TableHead className={TH}>Café</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={TH}>Owner</TableHead>
                <TableHead className={TH}>Rating</TableHead>
                <TableHead className={TH}>Added</TableHead>
                <TableHead className={`${TH} w-12`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cafes.map((cafe) => {
                const claimed = (cafe.cafe_owner_cafe?.length ?? 0) > 0
                const isSelected = selected.has(cafe.id)
                const area = [cafe.neighborhood, cafe.city].filter(Boolean).join(", ")
                return (
                  <TableRow key={cafe.id} data-state={isSelected ? "selected" : undefined} className={TR}>
                    <TableCell className={TD}>
                      <Checkbox
                        aria-label={`Select ${cafe.name}`}
                        checked={isSelected}
                        onCheckedChange={(v) => toggle(cafe.id, v === true)}
                      />
                    </TableCell>
                    <TableCell className={`${TD} max-w-[22rem]`}>
                      <div className="flex items-center gap-3">
                        <Thumb src={cafe.featured_image_url} />
                        <div className="grid min-w-0 leading-tight">
                          <span className="flex min-w-0 items-center gap-2">
                            <Link
                              href={`/admin/cafes/${cafe.id}`}
                              className="truncate font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {cafe.name}
                            </Link>
                            {cafe.is_featured && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] font-medium">
                                <Star weight="fill" className="size-2.5" aria-hidden />
                                Featured
                              </span>
                            )}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{area || "No area set"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <StatusChip tone={statusOf(cafe).tone}>{statusOf(cafe).label}</StatusChip>
                    </TableCell>
                    <TableCell className={TD}>
                      <OwnerChip claimed={claimed} />
                    </TableCell>
                    <TableCell className={TD}>
                      <Rating cafe={cafe} />
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground tabular-nums`}>
                      {cafe.created_at ? shortDate(cafe.created_at) : "—"}
                    </TableCell>
                    <TableCell className={`${TD} text-right`}>
                      <CafeActions cafe={cafe} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
        list={cafes.map((cafe) => {
          const claimed = (cafe.cafe_owner_cafe?.length ?? 0) > 0
          const area = [cafe.neighborhood, cafe.city].filter(Boolean).join(", ")
          return (
            <li key={cafe.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                aria-label={`Select ${cafe.name}`}
                checked={selected.has(cafe.id)}
                onCheckedChange={(v) => toggle(cafe.id, v === true)}
                className="mt-3"
              />
              <Thumb src={cafe.featured_image_url} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/cafes/${cafe.id}`} className="block truncate text-sm font-medium">
                  {cafe.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{area || "No area set"}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <StatusChip tone={statusOf(cafe).tone}>{statusOf(cafe).label}</StatusChip>
                  <OwnerChip claimed={claimed} />
                  <Rating cafe={cafe} />
                </div>
              </div>
              <CafeActions cafe={cafe} />
            </li>
          )
        })}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={cafes.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun="cafés"
          />
        }
      />
    </div>
  )
}
