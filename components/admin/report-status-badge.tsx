import {
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReportStatus } from "@/lib/types/reports"

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; icon: Icon }
> = {
  pending: {
    label: "Pending",
    className:
      "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    icon: ClockIcon,
  },
  under_review: {
    label: "Under review",
    className:
      "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: EyeIcon,
  },
  resolved: {
    label: "Resolved",
    className:
      "text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    icon: CheckCircleIcon,
  },
  rejected: {
    label: "Rejected",
    className:
      "text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: XCircleIcon,
  },
}

interface ReportStatusBadgeProps {
  status: ReportStatus
  className?: string
  showIcon?: boolean
}

export function ReportStatusBadge({
  status,
  className,
  showIcon = true,
}: ReportStatusBadgeProps) {
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
