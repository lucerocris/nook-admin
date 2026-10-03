"use client"

// Shared pieces for admin table pages (design.md › Page skeletons › Table
// page): header, status tabs, toolbar, filter chips, bulk bar, the ruled card,
// phone rows, footer and empty states. Pages keep their own data and actions;
// these only fix the shape so every table reads the same.

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// URL state

/** Filters, tabs, search and page live in the URL so back/forward and shared
 *  links keep the view. `defaultValue` is never written to the URL. */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  const push = React.useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString()
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    },
    [router, pathname]
  )

  const get = React.useCallback(
    (key: string, defaultValue = "") => params.get(key) ?? defaultValue,
    [params]
  )

  const set = React.useCallback(
    (key: string, value: string, defaultValue = "") => {
      const p = new URLSearchParams(params.toString())
      if (value && value !== defaultValue) p.set(key, value)
      else p.delete(key)
      // A changed filter invalidates the offset: page 4 of the old result set
      // is usually past the end of the new one.
      if (key !== "page") p.delete("page")
      push(p)
    },
    [params, push]
  )

  const clear = React.useCallback(
    (keys: string[]) => {
      const p = new URLSearchParams(params.toString())
      for (const k of keys) p.delete(k)
      p.delete("page")
      push(p)
    },
    [params, push]
  )

  return { get, set, clear, isPending }
}

/** Search box state that writes to the URL after a pause, and follows the URL
 *  when it changes underneath (back button, "Clear filters"). */
export function useDebouncedSearch(key = "search") {
  const { get, set } = useUrlState()
  const urlValue = get(key)
  const [value, setValue] = React.useState(urlValue)
  const typing = React.useRef(false)

  React.useEffect(() => {
    if (!typing.current) {
      setValue(urlValue)
      return
    }
    if (value === urlValue) {
      typing.current = false
      return
    }
    const t = setTimeout(() => {
      typing.current = false
      set(key, value.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [value, urlValue, key, set])

  return {
    value,
    onChange: (v: string) => {
      typing.current = true
      setValue(v)
    },
  }
}

// ---------------------------------------------------------------------------
// Header

export function PageHeader({
  title,
  summary,
  action,
}: {
  title: string
  summary?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </header>
  )
}

// ---------------------------------------------------------------------------
// Status tabs

export type TabOption = { value: string; label: string; count?: number }

export function StatusTabs({
  tabs,
  value,
  onChange,
  label = "Filter by status",
}: {
  tabs: TabOption[]
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    // Scrolls inside its own strip on phones rather than widening the page.
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-5 border-b">
        {tabs.map((tab) => {
          const selected = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.value)}
              className={cn(
                "-mb-px flex min-h-11 items-center gap-1.5 border-b-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10",
                selected
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    selected ? "bg-foreground/10" : "bg-muted",
                    tab.count === 0 && "opacity-60"
                  )}
                >
                  {tab.count.toLocaleString()}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
      <MagnifyingGlassIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-9 text-base sm:text-sm"
      />
    </div>
  )
}

export type FilterOption = { value: string; label: string }

/** A compact select whose trigger reads "Label: Value" once something is set. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allValue = "all",
  allLabel,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  allValue?: string
  allLabel?: string
}) {
  const current = options.find((o) => o.value === value)
  const active = value !== allValue
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn("h-9 min-h-11 max-w-[14rem] sm:min-h-9", active && "border-foreground/30")}
      >
        <SelectValue>
          {active && current ? (
            <span className="truncate">
              <span className="text-muted-foreground">{label}: </span>
              {current.label}
            </span>
          ) : (
            label
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{allLabel ?? `Any ${label.toLowerCase()}`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type ActiveFilter = { key: string; label: string; value: string; onRemove: () => void }

export function FilterChips({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[]
  onClearAll: () => void
}) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex h-8 items-center gap-1 rounded-full border bg-background pr-1 pl-3 text-[13px]"
        >
          <span className="text-muted-foreground">{f.label}</span>
          <span className="font-medium">{f.value}</span>
          <button
            type="button"
            onClick={f.onRemove}
            aria-label={`Remove ${f.label} filter`}
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-3" weight="bold" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto inline-flex min-h-8 items-center rounded-md px-1 text-[13px] font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear filters
      </button>
    </div>
  )
}

/** Takes the toolbar's place while rows are selected. */
export function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-foreground/20 bg-muted px-3 py-1.5"
    >
      <span className="text-sm font-medium tabular-nums">{count} selected</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-md px-1 text-[13px] text-muted-foreground outline-hidden hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear
      </button>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table card

/** The one bordered card a table page's rows live in. Pass the desktop table
 *  and the phone list; each shows at its own width. */
export function TableCard({
  table,
  list,
  footer,
  empty,
  busy,
}: {
  table: React.ReactNode
  list: React.ReactNode
  footer?: React.ReactNode
  empty?: React.ReactNode
  busy?: boolean
}) {
  return (
    <section
      aria-busy={busy || undefined}
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-opacity",
        busy && "opacity-60"
      )}
    >
      {empty ?? (
        <>
          <div className="hidden overflow-x-auto sm:block">{table}</div>
          <ul className="divide-y sm:hidden">{list}</ul>
        </>
      )}
      {footer}
    </section>
  )
}

/** Header cell styles for tables built with components/ui/table. */
export const TH = "h-10 bg-muted/60 px-4 text-xs font-medium text-muted-foreground first:pl-5 last:pr-5"
/** Body cell styles. */
export const TD = "px-4 py-2.5 align-middle first:pl-5 last:pr-5"
/** Row styles: a filled band on hover and when selected, never an outline. */
export const TR = "border-b last:border-0 hover:bg-muted/50 data-[state=selected]:bg-muted"

export function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      aria-label="Select all rows on this page"
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={(v) => onChange(v === true)}
    />
  )
}

export function Thumb({ src, className }: { src: string | null | undefined; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("size-9 shrink-0 rounded-lg bg-muted object-cover", className)} />
  ) : (
    <span aria-hidden className={cn("size-9 shrink-0 rounded-lg bg-muted", className)} />
  )
}

/** Pagination under the rows. */
export function TableFooter({
  page,
  pageSize,
  shown,
  total,
  totalPages,
  onPage,
  noun = "results",
}: {
  page: number
  pageSize: number
  shown: number
  total: number
  totalPages: number
  onPage: (page: number) => void
  noun?: string
}) {
  if (total === 0) return null
  const start = (page - 1) * pageSize + 1
  const end = start + shown - 1
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
      <p className="text-[13px] text-muted-foreground tabular-nums">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
            <CaretLeftIcon aria-hidden />
            Previous
          </Button>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
            Next
            <CaretRightIcon aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}

/** Inside the table card: "nothing matches" (with a way out) or "nothing yet". */
export function TableEmpty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ElementType
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status chip

export type Tone = "success" | "warning" | "danger" | "neutral" | "info"

const TONES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-[#FFF4DC] text-[#8A5A00]",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-50 text-sky-700",
}

const DOTS: Record<Tone, string> = {
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  neutral: "bg-muted-foreground/60",
  info: "bg-sky-600",
}

/** Status in the shared meaning: success = live/approved, warning =
 *  draft/pending, danger = inactive/rejected. Dot + word, never colour alone. */
export function StatusChip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[tone])} />
      {children}
    </span>
  )
}

/** "2d", "5h", "just now" — compact ages for queue rows. */
export function shortAge(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(days / 365)}y`
}

/** "Sep 30" this year, "Sep 30, 2025" otherwise. */
export function shortDate(iso: string) {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}
