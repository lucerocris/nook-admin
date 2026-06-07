import type { Metadata } from "next"
import { AdminSidebar } from "@/components/admin/sidebar"
import { createAdminClient } from "@/lib/supabase/admin"
import { getReportsMetrics } from "@/lib/queries/reports"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: {
    template: "%s | Nook Admin",
    default: "Nook Admin",
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createAdminClient()

  const [{ count, error }, metrics] = await Promise.all([
    supabase
      .from("cafe_claims")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    getReportsMetrics(),
  ])

  const pendingClaimsCount = error ? 0 : count ?? 0
  const pendingReportsCount = metrics.pendingCount

  return (
    <SidebarProvider>
      <AdminSidebar
        pendingClaimsCount={pendingClaimsCount}
        pendingReportsCount={pendingReportsCount}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
