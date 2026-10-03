import { StatusChip, type Tone } from "@/components/admin/table-kit"
import type { ReportStatus } from "@/lib/types/reports"

// Report status in the shared chip language (design.md › Color): waiting is
// amber, being looked at is info, a closed report with action taken is green,
// a report dismissed as invalid is neutral.
const STATUS_CONFIG: Record<ReportStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  under_review: { label: "Under review", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
}

export function ReportStatusBadge({
  status,
  className,
}: {
  status: ReportStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusChip tone={config.tone} className={className}>
      {config.label}
    </StatusChip>
  )
}
