import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  ProhibitIcon,
  TrashIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import type { ModerationEvent } from "@/lib/types/reports"

const ICONS: Record<ModerationEvent["type"], Icon> = {
  submitted: FlagIcon,
  marked_under_review: EyeIcon,
  hidden: EyeSlashIcon,
  removed: TrashIcon,
  restored: ArrowCounterClockwiseIcon,
  warned: WarningIcon,
  suspended: ProhibitIcon,
  unsuspended: ArrowCounterClockwiseIcon,
  rejected: XCircleIcon,
  resolved: CheckCircleIcon,
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatAbsolute(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getAdminName(
  admin: ModerationEvent["admin"]
): string | null {
  if (!admin) return null
  if (admin.full_name) return admin.full_name
  if (admin.username) return `@${admin.username}`
  return "an admin"
}

export function ModerationHistory({ events }: { events: ModerationEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClockIcon className="size-3.5" />
        <span>No events recorded yet</span>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {events.map((event) => {
        const Icon = ICONS[event.type]
        const adminName = getAdminName(event.admin)
        return (
          <li
            key={event.id}
            className="flex items-start gap-2.5 text-xs"
          >
            <span className="mt-0.5 text-muted-foreground shrink-0">
              <Icon className="size-3.5" />
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="font-medium">{event.label}</span>
              {event.description && (
                <span className="text-muted-foreground">
                  {event.description}
                </span>
              )}
              {adminName && (
                <span className="text-muted-foreground">by {adminName}</span>
              )}
            </div>
            <span
              className="text-muted-foreground ml-auto shrink-0"
              title={formatAbsolute(event.created_at)}
            >
              {formatRelative(event.created_at)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
