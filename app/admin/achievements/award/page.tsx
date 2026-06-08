import type { Metadata } from "next"
import { Suspense } from "react"
import { getAchievements } from "@/lib/queries/achievements"
import { ManualAwardClient } from "@/components/admin/achievements/manual-award-client"

export const metadata: Metadata = { title: "Award Achievement" }

export default async function AwardAchievementPage() {
  const achievements = await getAchievements()

  return (
    <Suspense fallback={null}>
      <ManualAwardClient initialAchievements={achievements} />
    </Suspense>
  )
}
