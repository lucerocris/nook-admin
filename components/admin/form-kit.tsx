"use client"

// Shared pieces for admin form pages (design.md › Page skeletons › Form page,
// "Workbench"): a main column of hairline-divided sections, a sticky rail for
// status and a section index, and a save bar pinned to the bottom that always
// says whether the work is saved.

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Page frame

export function FormPageHeader({
  backHref,
  backLabel,
  title,
  meta,
  actions,
}: {
  backHref: string
  backLabel: string
  title: string
  /** Status chip and similar, beside the title. */
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3">
      <Link
        href={backHref}
        className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-md text-[13px] text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {meta}
        {actions && <div className="ml-auto flex gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/** Main column + sticky rail. The rail drops below the main column on phones;
 *  pages show a status line under the title there instead. */
export function FormLayout({ main, rail }: { main: React.ReactNode; rail?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      <div className="flex min-w-0 flex-col">{main}</div>
      {rail && <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">{rail}</aside>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sections and fields

/** A hairline-topped block in the main column. `id` is what the section index
 *  links to. */
export function FormSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-6 border-t py-8 first:border-t-0 first:pt-2", className)}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-[15px] font-semibold">
            {title}
          </h2>
          {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

/** Label, control, then hint or error. Pass `htmlFor` matching the control's id. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  error?: string | null
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={hintId} className="flex items-center gap-1 text-xs text-destructive">
          <WarningCircleIcon className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rail

export function RailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="border-b px-4 py-3 text-[13px] font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </section>
  )
}

export type SectionIndexItem = { id: string; label: string; error?: boolean; dirty?: boolean }

/** Links to each section; highlights the one in view, dots the ones that
 *  need attention. */
export function SectionIndex({ items }: { items: SectionIndexItem[] }) {
  const [current, setCurrent] = React.useState(items[0]?.id)

  React.useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el)
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setCurrent(visible[0].target.id)
        }
      },
      { rootMargin: "0px 0px -60% 0px" }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  return (
    <nav aria-label="Sections" className="hidden lg:block">
      <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={current === item.id ? "location" : undefined}
              className={cn(
                "flex min-h-8 items-center gap-2 rounded-md px-3 text-[13px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                current === item.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex-1">{item.label}</span>
              {item.error ? (
                <span className="size-1.5 rounded-full bg-destructive" aria-label="has an error" />
              ) : item.dirty ? (
                <span className="size-1.5 rounded-full bg-foreground/50" aria-label="unsaved changes" />
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Save bar

/** Pinned to the bottom of the viewport, starting where the sidebar ends.
 *  Always visible: it is how the page says whether the work is saved. */
export function SaveBar({
  dirtyCount,
  saving,
  errorCount = 0,
  onFirstError,
  onDiscard,
  children,
  savedLabel = "All changes saved",
}: {
  dirtyCount: number
  saving: boolean
  errorCount?: number
  onFirstError?: () => void
  onDiscard?: () => void
  /** The save / publish buttons. */
  children: React.ReactNode
  savedLabel?: string
}) {
  const { state } = useSidebar()
  const dirty = dirtyCount > 0

  return (
    <>
      {/* Reserves room so the bar never covers the last section. */}
      <div aria-hidden className="h-24 shrink-0" />
      <div
        role="region"
        aria-label="Save"
        className={cn(
          "fixed right-0 bottom-0 left-0 z-30 border-t bg-sidebar",
          state === "collapsed" ? "md:left-(--sidebar-width-icon)" : "md:left-(--sidebar-width)"
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <p aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {saving ? (
              <span className="text-muted-foreground">Saving…</span>
            ) : errorCount > 0 ? (
              <button
                type="button"
                onClick={onFirstError}
                className="inline-flex items-center gap-1.5 rounded-md font-medium text-destructive outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                <WarningCircleIcon className="size-4 shrink-0" aria-hidden />
                {errorCount} {errorCount === 1 ? "thing" : "things"} to fix
              </button>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2 rounded-full bg-amber-500" />
                {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" aria-hidden />
                {savedLabel}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {onDiscard && dirty && (
              <Button variant="ghost" onClick={onDiscard} disabled={saving}>
                Discard
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

/** Count of top-level keys whose values differ between two snapshots. */
export function countChanges<T extends Record<string, unknown>>(initial: T, current: T) {
  let n = 0
  for (const key of Object.keys(current)) {
    if (JSON.stringify(initial[key]) !== JSON.stringify(current[key])) n++
  }
  return n
}

/** Warn before leaving the page with unsaved edits (reload, close, external
 *  link). Returns `allowLeave()` for deliberate exits such as Discard, which
 *  reload on purpose and shouldn't be asked "leave site?". */
export function useLeaveGuard(active: boolean) {
  const bypass = React.useRef(false)
  React.useEffect(() => {
    if (!active) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (bypass.current) return
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])
  return React.useCallback(() => {
    bypass.current = true
  }, [])
}

/** Sticky footer for drawer and dialog forms. */
export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex items-center justify-end gap-2 border-t bg-background px-5 py-3.5">
      {children}
    </div>
  )
}
