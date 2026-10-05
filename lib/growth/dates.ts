import { REPORT_TZ } from "@/lib/growth/config"

// Weeks run Monday to Sunday on Manila's clock. Manila has no daylight saving
// (UTC+8 all year), which keeps the arithmetic below exact.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** "2026-10-05" for the Manila calendar day the instant falls on. */
export function manilaDay(at: Date | string | number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TZ }).format(new Date(at))
}

/** Monday (Manila) of the week the instant falls on, as "YYYY-MM-DD". */
export function manilaWeekStart(at: Date | string | number): string {
  const local = new Date(new Date(at).getTime() + MANILA_OFFSET_MS)
  const dow = (local.getUTCDay() + 6) % 7 // Monday = 0
  const monday = new Date(local.getTime() - dow * DAY_MS)
  return monday.toISOString().slice(0, 10)
}

/** The `count` Mondays ending with this week's, oldest first. */
export function recentWeeks(count: number, now: Date = new Date()): string[] {
  const current = manilaWeekStart(now)
  const base = Date.parse(`${current}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) =>
    new Date(base - (count - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10)
  )
}

/** Whole weeks between two Mondays. */
export function weeksBetween(fromMonday: string, toMonday: string): number {
  return Math.round((Date.parse(toMonday) - Date.parse(fromMonday)) / (7 * DAY_MS))
}

/** "Sep 29" */
export function shortWeekLabel(monday: string): string {
  return new Date(`${monday}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export const DAY = DAY_MS
