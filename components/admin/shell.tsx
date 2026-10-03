"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { ADMIN_NAV } from "@/components/admin/nav"

export function AdminShell({
  pendingClaimsCount,
  pendingReportsCount,
  account,
  children,
}: {
  pendingClaimsCount: number
  pendingReportsCount: number
  account: { name: string | null; email: string | null }
  children: React.ReactNode
}) {
  const router = useRouter()
  const [jumpOpen, setJumpOpen] = React.useState(false)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setJumpOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <SidebarProvider>
      <AdminSidebar
        pendingClaimsCount={pendingClaimsCount}
        pendingReportsCount={pendingReportsCount}
        account={account}
        onOpenJump={() => setJumpOpen(true)}
      />
      <SidebarInset>
        <AdminHeader />
        {/* min-w-0 + overflow-x-hidden: without these, any over-wide
            descendant widens the document and scrolls the whole page
            sideways instead of being contained. */}
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden">{children}</main>
      </SidebarInset>

      <CommandDialog
        open={jumpOpen}
        onOpenChange={setJumpOpen}
        title="Jump to"
        description="Go to any admin page"
      >
        <Command>
          <CommandInput placeholder="Jump to a page…" />
          <CommandList>
            <CommandEmpty>No page matches that.</CommandEmpty>
            {ADMIN_NAV.map((group, i) => (
              <CommandGroup key={i} heading={group.label ?? "Overview"}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${group.label ?? ""} ${item.title}`}
                    onSelect={() => {
                      setJumpOpen(false)
                      router.push(item.url)
                    }}
                  >
                    <item.icon />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </SidebarProvider>
  )
}
