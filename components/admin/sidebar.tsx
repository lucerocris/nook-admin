"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MagnifyingGlassIcon, SignOutIcon } from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { ADMIN_NAV, isActivePath } from "@/components/admin/nav"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const LOGO_URL = "https://lucerocris.sgp1.cdn.digitaloceanspaces.com/nook-sites/logo.svg"

// The shared menu button is sized for a desktop pointer (h-8 / 12px text, 16px
// icons). On mobile the sidebar is a full drawer with plenty of room, so size
// rows for a fingertip and drop back to the compact desktop sizing at md.
const MOBILE_ROW =
  "h-11 text-sm [&_svg]:size-5 md:h-8 md:text-[13px] md:[&_svg]:size-4"

// The active page is a pale green chip with green text — a quiet marker on the
// neutral rail rather than a solid fill that competes with the page.
const ACTIVE_PILL =
  "data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground data-active:hover:bg-sidebar-accent data-active:hover:text-sidebar-accent-foreground"

function initials(label: string) {
  const name = label.split("@")[0]
  const words = name.trim().split(/[\s._-]+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)
  return letters.toUpperCase() || "N"
}

export function AdminSidebar({
  pendingClaimsCount = 0,
  pendingReportsCount = 0,
  reportedPhotosCount = 0,
  account,
  onOpenJump,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  pendingClaimsCount?: number
  pendingReportsCount?: number
  reportedPhotosCount?: number
  account: { name: string | null; email: string | null }
  onOpenJump: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isMobile, setOpenMobile } = useSidebar()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const badges = { claims: pendingClaimsCount, reports: pendingReportsCount, photos: reportedPhotosCount }

  // On mobile the sidebar is an overlay drawer. Navigating is a client-side
  // transition that doesn't unmount it, so without this the drawer stayed open
  // on top of the page that was just opened.
  function closeOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  async function handleLogout() {
    // signOut() is a network call and /login is server-rendered, so without a
    // pending state the sidebar sat inert after the click and invited repeat
    // presses.
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      closeOnMobile()
      router.push("/login")
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const accountLabel = account.email || account.name || "Your account"

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Nook admin"
              className="h-auto py-2 hover:bg-sidebar-accent/60"
            >
              <Link href="/admin/dashboard" onClick={closeOnMobile}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nookGlasses.svg"
                  alt=""
                  className="hidden size-8 shrink-0 group-data-[collapsible=icon]:block"
                />
                <span className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_URL} alt="Nook" className="h-6 w-auto" />
                  <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-background">
                    Admin
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Jump to: the ⌘K palette lists every admin page. */}
        <button
          type="button"
          onClick={onOpenJump}
          className="flex h-11 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background px-3 text-[13px] text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:h-9 group-data-[collapsible=icon]:hidden"
        >
          <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Jump to…</span>
          <kbd className="hidden rounded border px-1 font-sans text-[10px] md:inline">⌘K</kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {ADMIN_NAV.map((group, i) => (
          <SidebarGroup key={i} className="px-3 py-1.5 group-data-[collapsible=icon]:px-2">
            {group.label && (
              <SidebarGroupLabel className="h-7 px-2 text-[11px] font-medium tracking-wide text-sidebar-foreground/65 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = isActivePath(pathname, item.url)
                const count = item.badge ? badges[item.badge] : 0
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={count > 0 ? `${item.title} (${count})` : item.title}
                      className={cn(MOBILE_ROW, ACTIVE_PILL)}
                    >
                      <Link
                        href={item.url}
                        onClick={closeOnMobile}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon weight={isActive ? "fill" : "regular"} />
                        <span>{item.title}</span>
                        {count > 0 && <span className="sr-only">, {count} pending</span>}
                      </Link>
                    </SidebarMenuButton>
                    {count > 0 && (
                      // Centred on the row: the stock SidebarMenuBadge pins
                      // itself to the top of a 32px row and sat high on the
                      // taller phone rows.
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-sidebar-accent px-1.5 text-[11px] font-medium tabular-nums text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
                      >
                        {count}
                      </span>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 border-t border-sidebar-border pt-3 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:pt-0">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
          >
            {initials(accountLabel)}
          </span>
          <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-medium">{accountLabel}</span>
            <span className="truncate text-xs text-sidebar-foreground/75">Superadmin</span>
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
                aria-label={isLoggingOut ? "Signing out…" : "Sign out"}
                className="flex size-11 shrink-0 items-center justify-center rounded-md outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent disabled:opacity-60 md:size-8"
              >
                {isLoggingOut ? (
                  <Spinner className="size-4" />
                ) : (
                  <SignOutIcon className="size-5 md:size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={isMobile}>
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
