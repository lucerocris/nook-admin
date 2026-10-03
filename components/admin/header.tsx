"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowSquareOutIcon } from "@phosphor-icons/react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { findNavItem } from "@/components/admin/nav"
import { ThemeToggle } from "@/components/theme-toggle"

const LINK =
  "inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-[13px] text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

export function AdminHeader() {
  const pathname = usePathname()
  const match = findNavItem(pathname)
  // Detail pages (a café, a report) sit under their list page; the list page
  // links back so the breadcrumb is a way out, not just a label.
  const isDetail = match ? pathname !== match.item.url : false

  return (
    // Sticky on mobile: the drawer trigger is the only way back to navigation
    // there, and on long pages it scrolled out of reach.
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:static md:px-6">
      {/* 44px touch target on mobile; the shared trigger defaults to 32px. */}
      <SidebarTrigger className="-ml-1 size-11 md:-ml-2 md:size-8" />
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
          {match?.group.label && (
            <li className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
              {match.group.label}
              <span aria-hidden className="text-muted-foreground/60">
                /
              </span>
            </li>
          )}
          {match && isDetail && (
            <li className="flex min-w-0 items-center gap-1.5">
              <Link
                href={match.item.url}
                className="truncate text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {match.item.title}
              </Link>
              <span aria-hidden className="text-muted-foreground/60">
                /
              </span>
            </li>
          )}
          {match && (
            <li aria-current="page" className="truncate font-medium text-foreground">
              {isDetail ? "Details" : match.item.title}
            </li>
          )}
        </ol>
      </nav>
      <div className="flex shrink-0 items-center gap-3 md:gap-5">
        <ThemeToggle />
        <a
          href="https://business.nookph.app"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(LINK, "hidden sm:inline-flex")}
        >
          Business portal
          <ArrowSquareOutIcon className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <a href="https://www.nookph.app" target="_blank" rel="noopener noreferrer" className={LINK}>
          View Nook
          <ArrowSquareOutIcon className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </header>
  )
}
