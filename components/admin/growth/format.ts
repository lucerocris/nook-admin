/** Below this many people a rate is noise, and the page says so. */
export const SMALL_N = 10

export function pct(part: number, whole: number) {
  if (!whole) return null
  return part / whole
}

export function formatPct(rate: number | null, digits = 0) {
  if (rate === null || Number.isNaN(rate)) return "—"
  return `${(rate * 100).toFixed(digits)}%`
}

export function formatCount(n: number | null | undefined) {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US")
}

export type Direction = "up" | "down" | "flat" | "none"

export function direction(current: number | null, previous: number | null): Direction {
  if (current === null || previous === null) return "none"
  if (current > previous) return "up"
  if (current < previous) return "down"
  return "flat"
}

/** "+18", "−3", "±0" with a real minus sign. */
export function signed(n: number, unit = "") {
  if (n > 0) return `+${n.toLocaleString("en-US")}${unit}`
  if (n < 0) return `−${Math.abs(n).toLocaleString("en-US")}${unit}`
  return `±0${unit}`
}

/** Change between two rates in percentage points. */
export function signedPoints(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null
  const pts = Math.round((current - previous) * 100)
  return signed(pts, " pts")
}
