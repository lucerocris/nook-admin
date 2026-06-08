import type { Metadata } from "next"
import { getAchievements } from "@/lib/queries/achievements"
import { AchievementsCatalogClient } from "@/components/admin/achievements/achievements-catalog-client"

export const metadata: Metadata = { title: "Achievements" }

export default async function AchievementsPage() {
  const achievements = await getAchievements()
  return <AchievementsCatalogClient initialAchievements={achievements} />
}
