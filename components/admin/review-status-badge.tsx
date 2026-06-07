import {
  CheckCircleIcon,
  EyeSlashIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReviewStatus } from "@/lib/types/reports"

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; icon: Icon }
> = {
  visible: {
    label: "Visible",
    className:
      "text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    icon: CheckCircleIcon,
  },
  hidden: {
    label: "Hidden",
    className:
      "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    icon: EyeSlashIcon,
  },
  removed: {
    label: "Removed",
    className:
      "text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: TrashIcon,
  },
}

interface ReviewStatusBadgeProps {
  status: ReviewStatus
  className?: string
  showIcon?: boolean
}

export function ReviewStatusBadge({
  status,
  className,
  showIcon = true,
}: ReviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="size-3 mr-1" />}
      {config.label}
    </Badge>
  )
}
