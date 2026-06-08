import type { Metadata } from "next"
import { AchievementsCatalogClient } from "@/components/admin/achievements/achievements-catalog-client"
import { MOCK_ACHIEVEMENTS } from "@/components/admin/achievements/mock-data"

export const metadata: Metadata = { title: "Achievements" }

export default function AchievementsPage() {
  return <AchievementsCatalogClient initialAchievements={MOCK_ACHIEVEMENTS} />
}
