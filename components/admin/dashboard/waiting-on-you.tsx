"use client"

import Link from "next/link"
import {
  CaretRightIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ImagesIcon,
  PencilSimpleLineIcon,
  StorefrontIcon,
} from "@phosphor-icons/react"

import { shortAge, Thumb } from "@/components/admin/table-kit"
import { cn } from "@/lib/utils"
import type { QueuePreview } from "@/lib/queries/dashboard-queues"

const QUEUES: Record<
  QueuePreview["key"],
  { label: string; icon: React.ElementType; href: string; cta: string }
> = {
  claims: {
    label: "Claims",
    icon: ClipboardTextIcon,
    href: "/admin/claims?status=pending",
    cta: "Review claims",
  },
  reports: {
    label: "Review reports",
    icon: ChatCircleTextIcon,
    href: "/admin/reviews?status=pending&sort=oldest",
    cta: "Open queue",
  },
  photos: {
    label: "Reported gallery photos",
    icon: ImagesIcon,
    href: "/admin/gallery",
    cta: "Open queue",
  },
  drafts: {
    label: "Draft listings",
    icon: PencilSimpleLineIcon,
    href: "/admin/cafes?status=draft",
    cta: "Show drafts",
  },
  unclaimed: {
    label: "Unclaimed listings",
    icon: StorefrontIcon,
    href: "/admin/cafes?owner=unclaimed",
    cta: "Show unclaimed",
  },
}

function Group({ queue }: { queue: QueuePreview }) {
  const meta = QUEUES[queue.key]
  const empty = queue.count === 0

  return (
    <section aria-labelledby={`queue-${queue.key}`} className="border-b last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <meta.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h3 id={`queue-${queue.key}`} className="min-w-0 flex-1 text-sm">
          <span className={cn("font-semibold", empty && "font-medium text-muted-foreground")}>
            {meta.label}
          </span>
          <span className="text-muted-foreground tabular-nums"> · {queue.count.toLocaleString()}</span>
          {/* A queue with nothing in it collapses to this one quiet line. */}
          {empty && <span className="text-[13px] text-muted-foreground"> — all clear</span>}
        </h3>
        {!empty && (
          <Link
            href={meta.href}
            className="inline-flex min-h-9 shrink-0 items-center gap-0.5 rounded-md px-1 text-[13px] font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {meta.cta}
            <CaretRightIcon className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {!empty && queue.items.length > 0 && (
        <ul className="pb-2">
          {queue.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 outline-hidden hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:pr-5 sm:pl-12"
              >
                {queue.key !== "reports" && <Thumb src={item.imageUrl} className="size-8 rounded-md" />}
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  {item.meta && (
                    <span className="truncate text-xs text-muted-foreground">{item.meta}</span>
                  )}
                </span>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  {shortAge(item.createdAt)}
                </time>
              </Link>
            </li>
          ))}
          {queue.count > queue.items.length && (
            <li className="px-4 pt-1 pb-1 text-xs text-muted-foreground sm:pl-12">
              and {(queue.count - queue.items.length).toLocaleString()} more
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

export function WaitingOnYou({ queues }: { queues: QueuePreview[] }) {
  // Work first: queues with something in them lead, in their fixed order;
  // the all-clear ones trail as single lines.
  const ordered = [...queues.filter((q) => q.count > 0), ...queues.filter((q) => q.count === 0)]
  const allClear = queues.every((q) => q.count === 0)

  return (
    <section aria-labelledby="waiting-heading" className="overflow-hidden rounded-xl border bg-card">
      <h2 id="waiting-heading" className="border-b px-4 py-3.5 text-[15px] font-semibold sm:px-5">
        Waiting on you
      </h2>
      {allClear ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <CheckCircleIcon className="size-6 text-emerald-600" aria-hidden />
          <p className="mt-2 text-sm font-semibold">Nothing waiting</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            No claims, reports, photos, drafts or unclaimed listings need you right now.
          </p>
        </div>
      ) : (
        ordered.map((q) => <Group key={q.key} queue={q} />)
      )}
    </section>
  )
}
