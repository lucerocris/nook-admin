"use client"

import { ChatCircle, PencilSimple, Storefront, type Icon } from "@phosphor-icons/react"

interface ActivityItem {
  icon: Icon
  description: string
  timestamp: string
}

// Placeholder until a real activity log exists (design.md › Exceptions). The
// "Sample" label stays on the panel for as long as this list is hardcoded, so
// nobody reads it as what actually happened.
const activityFeed: ActivityItem[] = [
  { icon: Storefront, description: "Slowpoke Coffee was published", timestamp: "2 mins ago" },
  { icon: ChatCircle, description: "@jana_c left a 5-star review for The Grind", timestamp: "3 hrs ago" },
  { icon: Storefront, description: "Casa Breva was set to inactive", timestamp: "Yesterday" },
  { icon: PencilSimple, description: "IT Park Brew operating hours updated", timestamp: "Yesterday" },
  { icon: Storefront, description: "Brewlab was published", timestamp: "2 days ago" },
]

export function RecentActivity() {
  return (
    <section aria-labelledby="activity-heading" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3.5 sm:px-5">
        <h2 id="activity-heading" className="text-[15px] font-semibold">
          Recent activity
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample
        </span>
      </div>
      <ul>
        {activityFeed.map((item, index) => {
          const ItemIcon = item.icon
          return (
            <li key={index} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 sm:px-5">
              <ItemIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="min-w-0 flex-1 text-sm">{item.description}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{item.timestamp}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
