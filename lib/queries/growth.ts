import { unstable_cache } from "next/cache"
import type { User } from "@supabase/supabase-js"

import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import {
  ACTIVATION_MIN_WANT_TO_TRY,
  ACTIVATION_WINDOW_HOURS,
  COHORT_WEEKS,
  POSTHOG_APP_FILTER,
  POSTHOG_PASSIVE_EVENTS,
  RETENTION_HORIZON,
  TREND_WEEKS,
  isExcludedAccount,
  isTestAccount,
} from "@/lib/growth/config"
import { DAY, manilaWeekStart, recentWeeks, weeksBetween } from "@/lib/growth/dates"
import { hogql, hogqlString, isPostHogConfigured } from "@/lib/posthog"
import { createAdminClient } from "@/lib/supabase/admin"

// ---------------------------------------------------------------------------
// Shapes

export type Source = "Supabase" | "PostHog" | "Logged by hand"

export type MetricRow = {
  key: string
  label: string
  definition: string
  source: Source
  /** "ok" has numbers; the others explain why a row is empty. */
  status: "ok" | "not_tracked" | "needs_posthog"
  last7: number | null
  prev7: number | null
  /** One value per week in `weeks`, oldest first. */
  weekly: number[] | null
  /** A standing total, for rows where "how many now" matters more than the week. */
  total?: number | null
  note?: string
}

export type Cohort = {
  week: string
  size: number
  /** Index 0 is week 1. null = that week hasn't finished yet. */
  retained: (number | null)[]
}

export type PostHogStatus = { status: "ok" | "not_configured" | "error"; message?: string }

export type GrowthReport = {
  generatedAt: string
  weeks: string[]
  posthog: PostHogStatus
  accounts: { total: number; excluded: number; counted: number }
  installs: {
    status: "ok" | "empty" | "unavailable"
    /** Cumulative store installs as logged, newest last. */
    log: { weekOf: string; total: number }[]
  }
  signups: { last7: number; prev7: number; weekly: number[] }
  active: {
    last7: number
    prev7: number
    mau: number
    avgDau: number
    ios: number
    android: number
    weekly: number[]
    firstOpens7: number
    firstOpensPrev7: number
    firstOpensWeekly: number[]
  } | null
  activation: {
    eligible: number
    activated: number
    byRanking: number
    byWantToTry: number
    prevEligible: number
    prevActivated: number
  }
  retention: Cohort[] | null
  funnel: {
    from: string
    to: string
    firstOpens: number | null
    signups: number
    activated: number
    returned: number | null
  }
  loops: MetricRow[]
  supply: MetricRow[]
}

// ---------------------------------------------------------------------------
// Entry point

/** Superadmin only. The assembled report is cached for ten minutes across
 *  requests (it is the same for every superadmin); the auth check is not. */
export async function getGrowthReport(): Promise<GrowthReport> {
  await requireSuperadmin()
  return cachedReport()
}

export const GROWTH_CACHE_TAG = "growth-report"

const cachedReport = unstable_cache(() => buildGrowthReport(), ["growth-report-v1"], {
  revalidate: 600,
  tags: [GROWTH_CACHE_TAG],
})

// Exported for scripts and tests; never call it from a client-reachable path
// without requireSuperadmin() first.
export async function buildGrowthReport(now = new Date()): Promise<GrowthReport> {
  const weeks = recentWeeks(TREND_WEEKS, now)
  const since = new Date(Date.parse(`${weeks[0]}T00:00:00+08:00`) - 2 * DAY).toISOString()

  const db = await loadSupabase(since)
  const excludedIds = db.users.filter(isExcludedAccount).map((u) => u.id)
  const counted = new Map(
    db.users.filter((u) => !isExcludedAccount(u)).map((u) => [u.id, u] as const)
  )

  const nowMs = now.getTime()
  const win = windows(nowMs)

  // --- Sign-ups (Supabase auth, counted accounts only)
  const signupTimes = [...counted.values()].map((u) => u.created_at)
  const signups = { ...win.count(signupTimes), weekly: weekly(signupTimes, weeks) }

  // --- Activation: day-1 rank ≥1 or ≥3 Want to Try saves
  const firstRank = new Map<string, number[]>()
  for (const r of db.rankings) push(firstRank, r.user_id, Date.parse(r.created_at))
  const wttSaves = new Map<string, number[]>()
  for (const s of db.listSaves)
    if (s.list_type === "want_to_try" && s.owner_id) push(wttSaves, s.owner_id, Date.parse(s.added_at))

  const windowMs = ACTIVATION_WINDOW_HOURS * 60 * 60 * 1000
  function activationOf(u: User) {
    const t = Date.parse(u.created_at)
    const inWindow = (x: number) => x >= t && x < t + windowMs
    const ranked = (firstRank.get(u.id) ?? []).some(inWindow)
    const saved = (wttSaves.get(u.id) ?? []).filter(inWindow).length >= ACTIVATION_MIN_WANT_TO_TRY
    return { ranked, saved, activated: ranked || saved }
  }
  // Eligible = had the full window already; someone who joined an hour ago
  // can't be counted as not activated.
  const eligibleIn = (fromMs: number, toMs: number) =>
    [...counted.values()].filter((u) => {
      const t = Date.parse(u.created_at)
      return t >= fromMs && t < toMs && t + windowMs <= nowMs
    })
  const actNow = eligibleIn(nowMs - 28 * DAY - windowMs, nowMs).map(activationOf)
  const actPrev = eligibleIn(nowMs - 56 * DAY - windowMs, nowMs - 28 * DAY - windowMs).map(activationOf)
  const activation = {
    eligible: actNow.length,
    activated: actNow.filter((a) => a.activated).length,
    byRanking: actNow.filter((a) => a.ranked).length,
    byWantToTry: actNow.filter((a) => a.saved).length,
    prevEligible: actPrev.length,
    prevActivated: actPrev.filter((a) => a.activated).length,
  }

  // --- Funnel cohort: arrived 15–42 days ago, so day 7–13 is over for all.
  const funnelFrom = nowMs - 42 * DAY
  const funnelTo = nowMs - 14 * DAY
  const funnelUsers = [...counted.values()].filter((u) => {
    const t = Date.parse(u.created_at)
    return t >= funnelFrom && t < funnelTo
  })

  // --- Engagement loops (Supabase, counted accounts only)
  const isCounted = (id: string | null | undefined) => !!id && counted.has(id)
  const loopRow = (
    key: string,
    label: string,
    definition: string,
    times: string[]
  ): MetricRow => ({
    key,
    label,
    definition,
    source: "Supabase",
    status: "ok",
    ...win.count(times),
    weekly: weekly(times, weeks),
  })
  const loops: MetricRow[] = [
    loopRow(
      "rankings",
      "Cafés ranked",
      "A café placed in someone's ranked list (liked / fine / didn't like).",
      db.rankings.filter((r) => isCounted(r.user_id)).map((r) => r.created_at)
    ),
    loopRow(
      "comparisons",
      "Head-to-head answers",
      "“Which was better?” comparisons answered while ranking.",
      db.comparisons.filter((r) => isCounted(r.user_id)).map((r) => r.created_at)
    ),
    loopRow(
      "want_to_try",
      "Saved to Want to Try",
      "Cafés added to someone's Want to Try list.",
      db.listSaves
        .filter((s) => s.list_type === "want_to_try" && isCounted(s.owner_id))
        .map((s) => s.added_at)
    ),
    loopRow(
      "been",
      "Marked Been",
      "Cafés added to someone's Been list.",
      db.listSaves.filter((s) => s.list_type === "been" && isCounted(s.owner_id)).map((s) => s.added_at)
    ),
    loopRow(
      "reviews",
      "Reviews written",
      "New reviews, any moderation status.",
      db.reviews.filter((r) => isCounted(r.user_id)).map((r) => r.created_at)
    ),
    loopRow(
      "crawls_joined",
      "Crawl runs joined",
      "People joining a community crawl run, including the one who started it.",
      db.crawlMembers.filter((m) => isCounted(m.user_id)).map((m) => m.joined_at)
    ),
  ]

  // --- Supply side
  const owners = db.users.filter((u) => u.app_metadata?.role === "cafe_owner" && !isTestAccount(u))
  const ownerIds = new Set(owners.map((o) => o.id))
  const linkedOwners = new Set(db.ownerLinks.map((l) => l.owner_id).filter((id) => ownerIds.has(id)))
  const ownerSignIns = owners.map((o) => o.last_sign_in_at).filter((x): x is string => !!x)
  const activeCafes = db.cafes.filter((c) => c.status === "active")
  const supply: MetricRow[] = [
    {
      key: "cafes_live",
      label: "Cafés live",
      definition: "Listed and visible in the app (status active). New ones counted by date added.",
      source: "Supabase",
      status: "ok",
      total: activeCafes.length,
      ...win.count(activeCafes.map((c) => c.created_at)),
      weekly: weekly(activeCafes.map((c) => c.created_at), weeks),
    },
    {
      key: "cafes_claimed",
      label: "Claimed by owners",
      definition: "Live cafés an owner has claimed, by date claimed.",
      source: "Supabase",
      status: "ok",
      total: activeCafes.filter((c) => c.is_claimed).length,
      ...win.count(activeCafes.filter((c) => c.claimed_at).map((c) => c.claimed_at!)),
      weekly: weekly(activeCafes.filter((c) => c.claimed_at).map((c) => c.claimed_at!), weeks),
    },
    {
      key: "claims",
      label: "Claim requests",
      definition: "Owner claim requests received. Total shows how many are waiting now.",
      source: "Supabase",
      status: "ok",
      total: db.claims.filter((c) => c.status === "pending").length,
      ...win.count(db.claims.map((c) => c.created_at)),
      weekly: weekly(db.claims.map((c) => c.created_at), weeks),
      note: "Total = pending",
    },
    {
      key: "owners",
      label: "Owners signed in",
      definition:
        "Owner accounts (test accounts left out) whose latest sign-in falls in the window. Only the latest sign-in is stored, so earlier weeks undercount.",
      source: "Supabase",
      status: "ok",
      total: linkedOwners.size,
      ...win.count(ownerSignIns),
      weekly: null,
      note: "Total = owners linked to a café",
    },
    {
      key: "owner_portal",
      label: "Owner portal visits",
      definition: "The business portal sends no analytics, so visits and edits aren't counted.",
      source: "PostHog",
      status: "not_tracked",
      last7: null,
      prev7: null,
      weekly: null,
    },
  ]

  // --- PostHog
  let posthog: PostHogStatus = { status: "ok" }
  let active: GrowthReport["active"] = null
  let retention: Cohort[] | null = null
  let returned: number | null = null
  let funnelFirstOpens: number | null = null
  let lookups: Record<string, { last7: number; prev7: number; weekly: number[] }> | null = null

  if (!isPostHogConfigured()) {
    posthog = { status: "not_configured" }
  } else {
    try {
      const ph = await loadPostHog({ weeks, excludedIds, funnelUsers, funnelFrom, funnelTo, now })
      active = ph.active
      retention = ph.retention
      returned = ph.returned
      funnelFirstOpens = ph.funnelFirstOpens
      lookups = ph.lookups
    } catch (e) {
      console.error("Growth: PostHog queries failed", e)
      posthog = { status: "error", message: e instanceof Error ? e.message : String(e) }
    }
  }

  const phRow = (key: string, label: string, definition: string): MetricRow => {
    const data = lookups?.[key]
    return {
      key,
      label,
      definition,
      source: "PostHog",
      status: data ? "ok" : "needs_posthog",
      last7: data?.last7 ?? null,
      prev7: data?.prev7 ?? null,
      weekly: data?.weekly ?? null,
    }
  }
  loops.push(
    phRow("cafe_detail_viewed", "Café pages opened", "cafe_detail_viewed in the app."),
    phRow("directions_tapped", "Directions taps", "directions_tapped: someone heading to a café."),
    phRow("check_hours", "Hours checked", "check_hours on a café page."),
    phRow("share_cafe", "Cafés shared", "share_cafe from a café page."),
    {
      key: "empty_search",
      label: "Searches with no results",
      definition:
        "Not tracked yet. The app sends no search events, so demand for missing cafés is invisible.",
      source: "PostHog",
      status: "not_tracked",
      last7: null,
      prev7: null,
      weekly: null,
    }
  )

  return {
    generatedAt: now.toISOString(),
    weeks,
    posthog,
    accounts: { total: db.users.length, excluded: excludedIds.length, counted: counted.size },
    installs: db.installs,
    signups,
    active,
    activation,
    retention,
    funnel: {
      from: new Date(funnelFrom).toISOString(),
      to: new Date(funnelTo).toISOString(),
      firstOpens: funnelFirstOpens,
      signups: funnelUsers.length,
      activated: funnelUsers.filter((u) => activationOf(u).activated).length,
      returned,
    },
    loops,
    supply,
  }
}

// ---------------------------------------------------------------------------
// Supabase

async function loadSupabase(since: string) {
  const supabase = createAdminClient()

  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }

  // PostgREST caps a response at 1,000 rows; page until a short page.
  async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await build(from, from + 999)
      if (error) throw error
      out.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    return out
  }

  type Ranking = { user_id: string; created_at: string }
  // Typed as possibly an array: without generated types supabase-js can't tell
  // the embed is many-to-one.
  type ListRef = { list_type: string; owner_id: string | null }
  type ListSaveRow = { added_at: string; lists: ListRef | ListRef[] | null }

  const [rankings, comparisons, listSaveRows, reviews, crawlMembers, cafes, claims, ownerLinks, installs] =
    await Promise.all([
      // All rankings, not just recent ones: activation needs each person's
      // first, and the table is small.
      all<Ranking>((a, b) =>
        supabase.from("cafe_rankings").select("user_id, created_at").order("created_at").range(a, b)
      ),
      all<Ranking>((a, b) =>
        supabase
          .from("cafe_comparisons")
          .select("user_id, created_at")
          .gte("created_at", since)
          .order("created_at")
          .range(a, b)
      ),
      all<ListSaveRow>((a, b) =>
        supabase
          .from("list_cafes")
          .select("added_at, lists!inner(list_type, owner_id)")
          .in("lists.list_type", ["want_to_try", "been"])
          .order("added_at")
          .range(a, b)
      ),
      all<{ user_id: string; created_at: string }>((a, b) =>
        supabase
          .from("reviews")
          .select("user_id, created_at")
          .gte("created_at", since)
          .order("created_at")
          .range(a, b)
      ),
      all<{ user_id: string; joined_at: string }>((a, b) =>
        supabase
          .from("community_crawl_run_members")
          .select("user_id, joined_at")
          .gte("joined_at", since)
          .order("joined_at")
          .range(a, b)
      ),
      all<{ status: string; is_claimed: boolean; claimed_at: string | null; created_at: string }>((a, b) =>
        supabase.from("cafes").select("status, is_claimed, claimed_at, created_at").order("created_at").range(a, b)
      ),
      all<{ status: string; created_at: string }>((a, b) =>
        supabase.from("cafe_claims").select("status, created_at").order("created_at").range(a, b)
      ),
      all<{ owner_id: string }>((a, b) =>
        supabase.from("cafe_owner_cafe").select("owner_id").order("owner_id").range(a, b)
      ),
      loadInstalls(),
    ])

  const listSaves = listSaveRows.map((r) => {
    const list = Array.isArray(r.lists) ? r.lists[0] : r.lists
    return { added_at: r.added_at, list_type: list?.list_type ?? null, owner_id: list?.owner_id ?? null }
  })

  return { users, rankings, comparisons, listSaves, reviews, crawlMembers, cafes, claims, ownerLinks, installs }
}

/** Store installs logged by hand each week (marketing_weekly_metrics, shared
 *  with the Marketing page's Targets tab). A missing table must not take the
 *  whole page down, so failures come back as "unavailable". */
async function loadInstalls(): Promise<GrowthReport["installs"]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("marketing_weekly_metrics")
    .select("week_of, installs")
    .not("installs", "is", null)
    .order("week_of", { ascending: true })
  if (error) {
    console.error("Growth: marketing_weekly_metrics unavailable", error)
    return { status: "unavailable", log: [] }
  }
  const log = (data ?? []).map((r) => ({ weekOf: r.week_of as string, total: r.installs as number }))
  return { status: log.length ? "ok" : "empty", log }
}

// ---------------------------------------------------------------------------
// PostHog

async function loadPostHog(args: {
  weeks: string[]
  excludedIds: string[]
  funnelUsers: User[]
  funnelFrom: number
  funnelTo: number
  now: Date
}) {
  const { weeks, excludedIds, funnelUsers, funnelFrom, funnelTo, now } = args
  const ids = excludedIds.length ? excludedIds : ["00000000-0000-0000-0000-000000000000"]
  const notExcluded = `person_id NOT IN (SELECT person_id FROM person_distinct_ids WHERE distinct_id IN (${ids
    .map(hogqlString)
    .join(", ")}))`
  const used = `event NOT IN (${POSTHOG_PASSIVE_EVENTS.map(hogqlString).join(", ")})`
  const base = `${POSTHOG_APP_FILTER} AND ${used} AND ${notExcluded}`
  const week = "toStartOfWeek(toTimeZone(timestamp, 'Asia/Manila'), 1)"
  const lookupEvents = ["cafe_detail_viewed", "directions_tapped", "check_hours", "share_cafe"]

  const firstWeek = weeks[0]
  const cohortStart = weeks[weeks.length - COHORT_WEEKS - 1]

  const [weeklyQ, rollingQ, dailyQ, cohortQ, funnelOpensQ, returnedQ] = await Promise.all([
    hogql(`
      SELECT ${week} AS week,
        uniq(person_id) AS active,
        uniqIf(person_id, event = 'Application Installed') AS first_opens,
        ${lookupEvents.map((e) => `countIf(event = '${e}') AS ${e}`).join(",\n        ")}
      FROM events
      WHERE timestamp >= toDateTime('${firstWeek} 00:00:00', 'Asia/Manila') AND ${base}
      GROUP BY week ORDER BY week`),
    hogql(`
      SELECT
        uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY) AS last7,
        uniqIf(person_id, timestamp < now() - INTERVAL 7 DAY AND timestamp >= now() - INTERVAL 14 DAY) AS prev7,
        uniqIf(person_id, timestamp >= now() - INTERVAL 28 DAY) AS mau,
        uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY AND properties.$os IN ('iOS', 'iPadOS')) AS ios,
        uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY AND properties.$os = 'Android') AS android,
        uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY AND event = 'Application Installed') AS first_opens7,
        uniqIf(person_id, timestamp < now() - INTERVAL 7 DAY AND timestamp >= now() - INTERVAL 14 DAY AND event = 'Application Installed') AS first_opens_prev7,
        ${lookupEvents
          .map(
            (e) =>
              `countIf(event = '${e}' AND timestamp >= now() - INTERVAL 7 DAY) AS ${e}_7, countIf(event = '${e}' AND timestamp < now() - INTERVAL 7 DAY AND timestamp >= now() - INTERVAL 14 DAY) AS ${e}_p7`
          )
          .join(",\n        ")}
      FROM events
      WHERE timestamp >= now() - INTERVAL 28 DAY AND ${base}`),
    hogql(`
      SELECT toDate(toTimeZone(timestamp, 'Asia/Manila')) AS day, uniq(person_id) AS dau
      FROM events
      WHERE timestamp >= now() - INTERVAL 28 DAY AND ${base}
      GROUP BY day`),
    // Cohort = the Manila week of a person's first use; scanned from the
    // start of the trend window so "first" is first in that window.
    hogql(`
      SELECT first_week, dateDiff('week', first_week, week) AS k, uniq(pid) AS people
      FROM (
        SELECT person_id AS pid, ${week} AS week,
          min(${week}) OVER (PARTITION BY person_id) AS first_week
        FROM events
        WHERE timestamp >= toDateTime('${firstWeek} 00:00:00', 'Asia/Manila') - INTERVAL 8 WEEK AND ${base}
      )
      WHERE first_week >= toDate('${cohortStart}')
      GROUP BY first_week, k
      HAVING k BETWEEN 0 AND ${RETENTION_HORIZON}
      ORDER BY first_week, k`),
    hogql(`
      SELECT uniq(person_id) AS first_opens
      FROM events
      WHERE event = 'Application Installed'
        AND timestamp >= toDateTime('${isoForHogql(funnelFrom)}', 'UTC')
        AND timestamp < toDateTime('${isoForHogql(funnelTo)}', 'UTC')
        AND ${base}`),
    funnelUsers.length
      ? hogql(`
          SELECT distinct_id, groupUniqArray(toStartOfHour(timestamp)) AS hours
          FROM events
          WHERE timestamp >= toDateTime('${isoForHogql(funnelFrom)}', 'UTC')
            AND distinct_id IN (${funnelUsers.map((u) => hogqlString(u.id)).join(", ")})
            AND ${POSTHOG_APP_FILTER} AND ${used}
          GROUP BY distinct_id`)
      : Promise.resolve({ columns: [], rows: [] }),
  ])

  const n = (v: unknown) => Number(v ?? 0) || 0
  const byWeek = new Map(weeklyQ.rows.map((r) => [String(r.week).slice(0, 10), r]))
  const series = (col: string) => weeks.map((w) => n(byWeek.get(w)?.[col]))
  const r = rollingQ.rows[0] ?? {}

  const daily = dailyQ.rows.map((d) => n(d.dau))
  const active = {
    last7: n(r.last7),
    prev7: n(r.prev7),
    mau: n(r.mau),
    avgDau: daily.length ? daily.reduce((a, b) => a + b, 0) / 28 : 0,
    ios: n(r.ios),
    android: n(r.android),
    weekly: series("active"),
    firstOpens7: n(r.first_opens7),
    firstOpensPrev7: n(r.first_opens_prev7),
    firstOpensWeekly: series("first_opens"),
  }

  const lookups = Object.fromEntries(
    lookupEvents.map((e) => [e, { last7: n(r[`${e}_7`]), prev7: n(r[`${e}_p7`]), weekly: series(e) }])
  )

  // Retention grid
  const currentWeek = manilaWeekStart(now)
  const cells = new Map<string, Map<number, number>>()
  for (const row of cohortQ.rows) {
    const w = String(row.first_week).slice(0, 10)
    if (!cells.has(w)) cells.set(w, new Map())
    cells.get(w)!.set(n(row.k), n(row.people))
  }
  // The current week's arrivals have no finished week yet, so they start the
  // grid next week.
  const retention: Cohort[] = weeks.slice(-COHORT_WEEKS - 1, -1).map((w) => {
    const c = cells.get(w)
    const size = c?.get(0) ?? 0
    const elapsed = weeksBetween(w, currentWeek)
    return {
      week: w,
      size,
      retained: Array.from({ length: RETENTION_HORIZON }, (_, i) =>
        i + 1 < elapsed ? (c?.get(i + 1) ?? 0) : null
      ),
    }
  })

  // Came back on day 7–13 after signing up
  const hoursById = new Map(
    returnedQ.rows.map((row) => [String(row.distinct_id), (row.hours as string[]).map((h) => Date.parse(toIso(h)))])
  )
  const returned = funnelUsers.filter((u) => {
    const t = Date.parse(u.created_at)
    return (hoursById.get(u.id) ?? []).some((h) => h >= t + 7 * DAY - 60 * 60 * 1000 && h < t + 14 * DAY)
  }).length

  return {
    active,
    lookups,
    retention,
    returned,
    funnelFirstOpens: n(funnelOpensQ.rows[0]?.first_opens),
  }
}

// ---------------------------------------------------------------------------
// Helpers

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function windows(nowMs: number) {
  return {
    count(times: string[]) {
      let last7 = 0
      let prev7 = 0
      for (const t of times) {
        const ms = Date.parse(t)
        if (ms > nowMs) continue
        if (ms >= nowMs - 7 * DAY) last7++
        else if (ms >= nowMs - 14 * DAY) prev7++
      }
      return { last7, prev7 }
    },
  }
}

function weekly(times: string[], weeks: string[]) {
  const index = new Map(weeks.map((w, i) => [w, i]))
  const out = weeks.map(() => 0)
  for (const t of times) {
    const i = index.get(manilaWeekStart(t))
    if (i !== undefined) out[i]++
  }
  return out
}

/** "2026-10-05 03:00:00" in UTC, the form HogQL's toDateTime() parses. */
function isoForHogql(ms: number) {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ")
}

/** HogQL returns DateTimes as "2026-10-05T03:00:00Z" or with an offset. */
function toIso(v: string) {
  return /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v.replace(" ", "T")}Z`
}
