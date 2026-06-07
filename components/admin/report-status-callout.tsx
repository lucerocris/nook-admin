import {
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import type { ReportStatus } from "@/lib/types/reports"

const STATUS_CALLOUT: Record<
  ReportStatus,
  {
    label: string
    description: string
    icon: Icon
    className: string
  }
> = {
  pending: {
    label: "Awaiting moderator review",
    description:
      "Click “Mark under review” to claim this report and start investigating.",
    icon: ClockIcon,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  under_review: {
    label: "Under review",
    description:
      "An admin is investigating this report. Take an action below to resolve or reject it.",
    icon: EyeIcon,
    className:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  },
  resolved: {
    label: "Resolved",
    description:
      "This report has been resolved. The action is permanent and cannot be undone.",
    icon: CheckCircleIcon,
    className:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  },
  rejected: {
    label: "Rejected",
    description:
      "This report was reviewed and dismissed. The original review remains visible.",
    icon: XCircleIcon,
    className:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  },
}

export function ReportStatusCallout({ status }: { status: ReportStatus }) {
  const config = STATUS_CALLOUT[status]
  const Icon = config.icon
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        config.className
      )}
    >
      <Icon className="size-5 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{config.label}</p>
        <p className="text-xs opacity-80">{config.description}</p>
      </div>
    </div>
  )
}
