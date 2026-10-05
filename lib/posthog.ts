// Server-side HogQL access to the Nook PostHog project. Same pattern as
// nook-business/app/api/analytics-sync/route.ts: a personal API key (never the
// public project key the app ships with), only ever read on the server.
//
// Env (server only, never NEXT_PUBLIC_):
//   POSTHOG_PERSONAL_API_KEY  personal key with the "query:read" scope
//   POSTHOG_PROJECT_ID        473868 for the Nook project
//   POSTHOG_HOST              optional, defaults to https://us.posthog.com

export type HogQLResult = { columns: string[]; rows: Record<string, unknown>[] }

export class PostHogNotConfiguredError extends Error {
  constructor() {
    super("PostHog is not configured: set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID")
    this.name = "PostHogNotConfiguredError"
  }
}

export function isPostHogConfigured() {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID)
}

export async function hogql(query: string): Promise<HogQLResult> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY
  const project = process.env.POSTHOG_PROJECT_ID
  if (!key || !project) throw new PostHogNotConfiguredError()
  const host = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "")

  const res = await fetch(`${host}/api/projects/${encodeURIComponent(project)}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    // The page caches the assembled report itself; never cache a raw response.
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`PostHog query failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as { columns?: string[]; results?: unknown[][] }
  const columns = json.columns ?? []
  const rows = (json.results ?? []).map((r) =>
    Object.fromEntries(columns.map((c, i) => [c, r[i]]))
  )
  return { columns, rows }
}

/** Quote a value for a HogQL string literal. Only ever used on ids we
 *  produced ourselves, but escape anyway. */
export function hogqlString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}
