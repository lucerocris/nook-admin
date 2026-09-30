"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  SquaresFourIcon,
  StorefrontIcon,
  UsersIcon,
  TagIcon,
  TrophyIcon,
  MapPinAreaIcon,
  ChatCircleTextIcon,
  ClipboardTextIcon,
  SignOutIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: React.ElementType
}

// The stock badge sits 6px from the top of a 36px row, 2px above center.
const badgeCentered =
  "peer-data-[size=default]/menu-button:top-1/2 -translate-y-1/2"

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: SquaresFourIcon },
  { title: "Cafes", url: "/admin/cafes", icon: StorefrontIcon },
  { title: "Claims", url: "/admin/claims", icon: ClipboardTextIcon },
  { title: "Users", url: "/admin/users", icon: UsersIcon },
  { title: "Tags", url: "/admin/tags", icon: TagIcon },
  { title: "Achievements", url: "/admin/achievements", icon: TrophyIcon },
  { title: "Crawls", url: "/admin/crawls", icon: MapPinAreaIcon },
  { title: "Reviews", url: "/admin/reviews", icon: ChatCircleTextIcon },
]

export function AdminSidebar({
  pendingClaimsCount = 0,
  pendingReportsCount = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  pendingClaimsCount?: number
  pendingReportsCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      toast.success("Logged out")
      router.push("/login")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log out"
      toast.error(message)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard">
                <Image
                  src="/app_icon.png"
                  alt="Nook"
                  width={32}
                  height={32}
                  className="size-8 rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Nook</span>
                  <span className="truncate text-xs text-muted-foreground">Superadmin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url + "/")
              const showClaimsBadge =
                item.title === "Claims" && pendingClaimsCount > 0
              const showReportsBadge =
                item.title === "Reviews" && pendingReportsCount > 0
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className="data-active:bg-brand-tint data-active:text-primary data-active:shadow-[inset_2px_0_0_var(--primary)]"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {showClaimsBadge && (
                    <SidebarMenuBadge className={badgeCentered}>
                      {pendingClaimsCount}
                    </SidebarMenuBadge>
                  )}
                  {showReportsBadge && (
                    <SidebarMenuBadge className={badgeCentered}>
                      {pendingReportsCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
              <SignOutIcon />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
