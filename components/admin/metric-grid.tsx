import Link from "next/link"

import { cn } from "@/lib/utils"

export type Metric = {
  label: string
  value: number
  note: string
  href?: string
  linkLabel?: string
  // Needs a superadmin's attention when the value is above zero.
  attention?: boolean
}

export function MetricGrid({
  metrics,
  className,
  compact = false,
}: {
  metrics: Metric[]
  className?: string
  // Smaller values for context metrics that sit below the attention row.
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden bg-border ring-1 ring-border sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {metrics.map((metric) => {
        const flagged = metric.attention && metric.value > 0
        return (
          <div key={metric.label} className="flex flex-col bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{metric.label}</span>
              {flagged && (
                <span
                  aria-label="Needs attention"
                  className="size-1.5 rounded-full bg-destructive"
                />
              )}
            </div>
            <span
              className={cn(
                "display mt-4 tabular-nums",
                compact ? "text-3xl" : "text-4xl",
                flagged && "text-destructive"
              )}
            >
              {metric.value.toLocaleString()}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">{metric.note}</p>
            {metric.href && (
              <Link
                href={metric.href}
                className="mt-4 w-fit text-sm font-semibold underline decoration-1 underline-offset-[3px] hover:text-primary"
              >
                {metric.linkLabel} →
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
