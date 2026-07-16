import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"

// Shape of the get_admin_dashboard_summary jsonb payload. The admin client is
// not parameterised with <Database>, so .rpc() returns `any` — this interface
// is the only description of the payload, and it is not compiler-checked
// against the SQL. Keep it in sync with
// nook-supabase/supabase/migrations/20260716160000_phase3_dashboard_resolved_last_7d.sql
export type AdminDashboardSummary = {
  cafes: { total: number; active: number; unclaimed: number }
  users: { total: number; suspended: number }
  owners: number
  reviews: { total: number; last_7d: number }
  claims: { total: number; by_status: Record<string, number | undefined> }
  reports: {
    total: number
    by_status: Record<string, number | undefined>
    resolved_last_7d: number
  }
  crawls: { total: number; active: number }
  generated_at: string
}

// Wrapped in React cache() so the admin layout and the dashboard page share one
// result per request. Previously each called getReportsMetrics() independently,
// paying for the same three counts twice.
export const getAdminDashboardSummary = cache(
  async (): Promise<AdminDashboardSummary> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("get_admin_dashboard_summary")
    if (error) throw error
    return data as AdminDashboardSummary
  }
)
