import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// `\`, `%` and `_` are wildcards/escapes inside an ilike pattern, so a search
// for "100% arabica" would otherwise match far more than it should.
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

// Builds a PostgREST `.or()` expression that matches `search` as a substring of
// any of `columns`. `.or()` takes a raw string, so unescaped user text containing
// `,` `(` or `)` would add or break filter clauses. The pattern is LIKE-escaped,
// then double-quoted per PostgREST's grammar so those characters stay literal.
export function buildIlikeOrFilter(columns: string[], search: string) {
  const pattern = `%${escapeLikePattern(search)}%`
  const quoted = `"${pattern.replace(/[\\"]/g, (char) => `\\${char}`)}"`
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",")
}

// Compact "3d ago" style age for queue items.
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
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
