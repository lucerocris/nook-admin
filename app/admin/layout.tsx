import type { Metadata } from "next"
import { AdminShell } from "@/components/admin/shell"
import { getAdminDashboardSummary } from "@/lib/queries/dashboard"
import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const [summary, { data: { user } }] = await Promise.all([
    getAdminDashboardSummary(),
    supabase.auth.getUser(),
  ])

  return (
    <AdminShell
      pendingClaimsCount={summary.claims.by_status.pending ?? 0}
      pendingReportsCount={summary.reports.by_status.pending ?? 0}
      account={{
        name: (user?.user_metadata?.full_name as string | undefined) ?? null,
        email: user?.email ?? null,
      }}
    >
      {children}
    </AdminShell>
  )
}
