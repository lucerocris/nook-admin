import type { Metadata } from "next"
import { ManualAwardClient } from "@/components/admin/achievements/manual-award-client"

export const metadata: Metadata = { title: "Award Achievement" }

export default function AwardAchievementPage() {
  return <ManualAwardClient />
}
