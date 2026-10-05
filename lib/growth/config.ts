// Every rule the Growth page counts by, in one place. Change a rule here and
// every number on the page (Supabase and PostHog alike) follows it.
//
// Why so strict: most accounts in the database are the team's own and test
// accounts, and the café list was generated, so raw totals overstate traction
// (nook-supabase/docs/STICKY_FEATURES.md, "What changed"). The page counts
// people who are not us.

/** Accounts with one of these roles (auth app_metadata.role) are never counted
 *  as app users: superadmins are the team, café owners are the supply side and
 *  are reported separately under "Cafés and owners". */
export const EXCLUDED_ROLES = ["superadmin", "cafe_owner"] as const

/** Email domains that only the team and app-store reviewers use. */
export const EXCLUDED_EMAIL_DOMAINS = ["example.com", "nookph.app", "nook.ph", "engin8.io"]

/** Matched against the part of the email before the @, case-insensitive.
 *  "lucero" covers the founder's own and family test accounts; "+" covers
 *  plus-addressed aliases, which only testers use. */
export const EXCLUDED_EMAIL_LOCAL_PATTERN = /(test|demo|dummy|fake|sample|superadmin|lucero|\+)/i

/** Specific accounts to leave out that no rule above catches (auth user ids).
 *  Add one when someone on the team signs up with an ordinary address. */
export const EXCLUDED_USER_IDS: string[] = []

/** One sentence for the page, so the rule is visible where the numbers are. */
export const EXCLUSION_SUMMARY =
  "Leaves out superadmins, café owners, team and reviewer domains (example.com, nookph.app, nook.ph, engin8.io), " +
  "and addresses containing test, demo, dummy, fake, sample, lucero or a + alias. Edit lib/growth/config.ts to change it."

export type AccountLike = {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown> | null
}

/** Left out of app-user numbers: a test account or a role that isn't a user. */
export function isExcludedAccount(user: AccountLike): boolean {
  const role = user.app_metadata?.role
  if (typeof role === "string" && (EXCLUDED_ROLES as readonly string[]).includes(role)) return true
  return isTestAccount(user)
}

/** A team, reviewer or test account by id or email, whatever its role. Used
 *  alone for the owner numbers, where the cafe_owner role is the point. */
export function isTestAccount(user: AccountLike): boolean {
  if (EXCLUDED_USER_IDS.includes(user.id)) return true
  const email = user.email?.toLowerCase().trim()
  if (!email) return false
  const [local, domain] = email.split("@")
  if (domain && EXCLUDED_EMAIL_DOMAINS.includes(domain)) return true
  return EXCLUDED_EMAIL_LOCAL_PATTERN.test(local ?? "")
}

// ---------------------------------------------------------------------------
// Definitions (STICKY_FEATURES.md › Suggested sequence, phase 0)

/** A new account is activated when, within this many hours of signing up, it
 *  ranks at least one café or saves this many to Want to Try. */
export const ACTIVATION_WINDOW_HOURS = 24
export const ACTIVATION_MIN_WANT_TO_TRY = 3

/** Benchmarks the page compares against (STICKY_FEATURES.md › Benchmarks). */
export const BENCHMARKS = {
  week1RetentionTarget: { low: 0.25, high: 0.3 },
  week1RetentionCategory: { low: 0.11, high: 0.13 },
  week4RetentionTarget: { low: 0.05, high: 0.1 },
  stickinessGood: 0.2,
  stickinessStrong: 0.25,
} as const

// ---------------------------------------------------------------------------
// PostHog

/** The Nook PostHog project also receives events from an unrelated web app
 *  (studyhub). Only the production Flutter app counts: dev builds use the
 *  app.nookph.dev namespace and are left out too. */
export const POSTHOG_APP_FILTER =
  "properties.$lib = 'posthog-flutter' AND properties.$app_namespace = 'app.nookph'"

/** Events that don't mean a person used the app (identity bookkeeping, the
 *  app going to the background, an auto-update). */
export const POSTHOG_PASSIVE_EVENTS = [
  "$set",
  "$identify",
  "$create_alias",
  "Application Backgrounded",
  "Application Updated",
]

export const REPORT_TZ = "Asia/Manila"

/** Weeks shown in the trend charts and cohort grid. */
export const TREND_WEEKS = 12
export const COHORT_WEEKS = 8
export const RETENTION_HORIZON = 4
