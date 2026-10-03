import type { AchievementCategory, SourceType } from "@/lib/types/achievements"
import { cn } from "@/lib/utils"

// Category and source are descriptive, not status, so they read as plain
// bordered pills. Colour stays reserved for status chips (design.md › Color).

const categoryLabels: Record<AchievementCategory, string> = {
  crawl: "Crawl",
  drops: "Drops",
  social: "Social",
  milestones: "Milestones",
  hidden: "Hidden",
}

const sourceTypeLabels: Record<SourceType, string> = {
  crawl_tier: "Crawl tier",
  drop_redemption: "Drop redemption",
  manual: "Manual",
  streak: "Streak",
  milestone: "Milestone",
}

export function categoryLabel(category: AchievementCategory) {
  return categoryLabels[category]
}

export function sourceTypeLabel(sourceType: SourceType) {
  return sourceTypeLabels[sourceType]
}

const PILL =
  "inline-flex items-center whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-foreground"

export function CategoryBadge({ category, className }: { category: AchievementCategory; className?: string }) {
  return <span className={cn(PILL, className)}>{categoryLabels[category]}</span>
}

export function SourceTypeBadge({ sourceType, className }: { sourceType: SourceType; className?: string }) {
  return <span className={cn(PILL, "text-muted-foreground", className)}>{sourceTypeLabels[sourceType]}</span>
}
