import {
  ChatCircleTextIcon,
  ClipboardTextIcon,
  MapPinAreaIcon,
  PaperPlaneTiltIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TagIcon,
  TrophyIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { FEATURES } from "@/lib/features"

export type AdminNavItem = {
  title: string
  url: string
  icon: React.ElementType
  /** Which pending count, if any, shows as a badge on the item. */
  badge?: "claims" | "reports"
}

export type AdminNavGroup = { label?: string; items: AdminNavItem[] }

// One source for the sidebar, the header breadcrumb and the Jump to palette,
// so a renamed or added page can't drift between them. Grouped the way the
// Figma admin frames are: what's waiting on someone, what's in the catalog,
// who's on the platform.
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [{ title: "Dashboard", url: "/admin/dashboard", icon: SquaresFourIcon }],
  },
  {
    label: "Queues",
    items: [
      { title: "Claims", url: "/admin/claims", icon: ClipboardTextIcon, badge: "claims" },
      { title: "Review reports", url: "/admin/reviews", icon: ChatCircleTextIcon, badge: "reports" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Cafés", url: "/admin/cafes", icon: StorefrontIcon },
      { title: "Outreach", url: "/admin/outreach", icon: PaperPlaneTiltIcon },
      { title: "Tags", url: "/admin/tags", icon: TagIcon },
      ...(FEATURES.crawls
        ? [{ title: "Crawls", url: "/admin/crawls", icon: MapPinAreaIcon }]
        : []),
      { title: "Achievements", url: "/admin/achievements", icon: TrophyIcon },
    ],
  },
  {
    label: "People",
    items: [{ title: "Users", url: "/admin/users", icon: UsersIcon }],
  },
]

export function isActivePath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(url + "/")
}

export function findNavItem(pathname: string) {
  for (const group of ADMIN_NAV) {
    const item = group.items.find((i) => isActivePath(pathname, i.url))
    if (item) return { group, item }
  }
  return null
}
