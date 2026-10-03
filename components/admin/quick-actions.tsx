"use client"

import Link from "next/link"
import { CaretRightIcon, PlusIcon, StorefrontIcon, UsersIcon } from "@phosphor-icons/react"

const ACTIONS = [
  { href: "/admin/cafes/new", label: "Add café", icon: PlusIcon },
  { href: "/admin/cafes?owner=unclaimed", label: "Unclaimed listings", icon: StorefrontIcon },
  { href: "/admin/users", label: "Find a user", icon: UsersIcon },
]

export function QuickActions() {
  return (
    <section aria-labelledby="shortcuts-heading" className="overflow-hidden rounded-xl border bg-card">
      <h2 id="shortcuts-heading" className="border-b px-4 py-3.5 text-[15px] font-semibold sm:px-5">
        Shortcuts
      </h2>
      <ul>
        {ACTIONS.map((a) => (
          <li key={a.href} className="border-b last:border-0">
            <Link
              href={a.href}
              className="flex min-h-11 items-center gap-3 px-4 text-sm outline-hidden hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
            >
              <a.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">{a.label}</span>
              <CaretRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
