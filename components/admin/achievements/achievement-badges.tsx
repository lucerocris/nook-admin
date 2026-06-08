import type { AchievementCategory, SourceType } from "@/lib/types/achievements"
import { cn } from "@/lib/utils"

const categoryStyles: Record<AchievementCategory, string> = {
  crawl: "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  drops: "text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  social: "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  milestones: "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  hidden: "text-gray-600 border-gray-300 bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
}

const sourceTypeStyles: Record<SourceType, string> = {
  crawl_tier: "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  drop_redemption: "text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  manual: "text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  streak: "text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
  milestone: "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
}

const categoryLabels: Record<AchievementCategory, string> = {
  crawl: "Crawl",
  drops: "Drops",
  social: "Social",
  milestones: "Milestones",
  hidden: "Hidden",
}

const sourceTypeLabels: Record<SourceType, string> = {
  crawl_tier: "Crawl Tier",
  drop_redemption: "Drop Redemption",
  manual: "Manual",
  streak: "Streak",
  milestone: "Milestone",
}

export function CategoryBadge({ category }: { category: AchievementCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        categoryStyles[category],
      )}
    >
      {categoryLabels[category]}
    </span>
  )
}

export function SourceTypeBadge({ sourceType }: { sourceType: SourceType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        sourceTypeStyles[sourceType],
      )}
    >
      {sourceTypeLabels[sourceType]}
    </span>
  )
}
