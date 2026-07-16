import type { Metadata } from "next"
import { AdminSidebar } from "@/components/admin/sidebar"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"
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
  // Both sidebar badges come from the one request-cached summary. This used to
  // be a claims count plus getReportsMetrics()' three counts, on every admin
  // page, with the dashboard page then repeating the latter three.
  const summary = await getAdminDashboardSummary()

  const pendingClaimsCount = summary.claims.by_status.pending ?? 0
  const pendingReportsCount = summary.reports.by_status.pending ?? 0

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
