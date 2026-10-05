import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "@phosphor-icons/react/dist/ssr"

import { cn } from "@/lib/utils"
import type { Direction } from "@/components/admin/growth/format"

// Change against the previous period. Deliberately not green/red: green is
// reserved for the primary action and current page (design.md › Constraints),
// and at this scale "up" is rarely the good news it looks like. The arrow and
// the signed number carry the direction.
export function Delta({
  dir,
  label,
  className,
}: {
  dir: Direction
  label: string
  className?: string
}) {
  if (dir === "none") return null
  const Icon = dir === "up" ? ArrowUpRightIcon : dir === "down" ? ArrowDownRightIcon : MinusIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-medium text-foreground tabular-nums",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" weight="bold" aria-hidden />
      {label}
    </span>
  )
}
