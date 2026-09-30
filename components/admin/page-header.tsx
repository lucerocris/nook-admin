import * as React from "react"

import { cn } from "@/lib/utils"

type PageTitleProps = {
  eyebrow: string
  title: React.ReactNode
  lead?: React.ReactNode
  // "sm" is for detail pages, where the title sits next to a back button.
  size?: "default" | "sm"
  className?: string
}

export function PageTitle({
  eyebrow,
  title,
  lead,
  size = "default",
  className,
}: PageTitleProps) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <span className="eyebrow">{eyebrow}</span>
      <h1
        className={cn(
          "display",
          size === "sm" ? "mt-2 text-2xl" : "mt-3 text-3xl sm:text-4xl"
        )}
      >
        {title}
      </h1>
      {lead && (
        <p className="mt-2 max-w-prose text-sm font-medium text-pretty text-foreground/75">
          {lead}
        </p>
      )}
    </div>
  )
}

type PageHeaderProps = PageTitleProps & {
  actions?: React.ReactNode
}

export function PageHeader({ actions, className, ...titleProps }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <PageTitle {...titleProps} />
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
