import type { Metadata } from "next"

import { GrowthView } from "@/components/admin/growth/growth-view"
import { getGrowthReport } from "@/lib/queries/growth"

export const metadata: Metadata = { title: "Growth" }
export const dynamic = "force-dynamic"

// Whether Nook is growing, counted honestly: real accounts only, store
// installs as the one outside number, and the activation and retention
// definitions from nook-supabase/docs/STICKY_FEATURES.md.
export default async function GrowthPage() {
  const report = await getGrowthReport()
  return <GrowthView report={report} />
}
