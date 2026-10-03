import type { Metadata } from "next"
import { Suspense } from "react"
import { getAchievements } from "@/lib/queries/achievements"
import { ManualAwardClient } from "@/components/admin/achievements/manual-award-client"

export const metadata: Metadata = { title: "Award an achievement" }

// Short task form (design.md › Page skeletons): one centred column of numbered
// steps with the action at the end. The client reads `?achievement_id=` to
// preselect step 2, which needs a Suspense boundary for useSearchParams.
export default async function AwardAchievementPage() {
  const achievements = await getAchievements()

  return (
    <Suspense fallback={null}>
      <ManualAwardClient initialAchievements={achievements} />
    </Suspense>
  )
}
