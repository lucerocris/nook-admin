import {
  ACTIVATION_MIN_WANT_TO_TRY,
  ACTIVATION_WINDOW_HOURS,
  EXCLUSION_SUMMARY,
} from "@/lib/growth/config"

// Every number on the page traces back to one of these rules. Kept in plain
// words so anyone reading the page can check a number against its source.
export function CountingRules() {
  const rules: [string, string][] = [
    ["Who counts", EXCLUSION_SUMMARY],
    [
      "PostHog",
      "Only the production mobile app (posthog-flutter, app.nookph). The project also receives an unrelated web app and Nook’s dev builds; both are left out. People who never sign in can’t be checked against the test rule, so device counts include the team’s phones before sign-in.",
    ],
    [
      "Store installs",
      "Typed in each week from App Store Connect and Play Console (table marketing_weekly_metrics, shared with the Marketing page). The stores have no API we can call from here.",
    ],
    [
      "Activated",
      `Within ${ACTIVATION_WINDOW_HOURS} hours of signing up: ranked at least one café, or saved ${ACTIVATION_MIN_WANT_TO_TRY}+ to Want to Try. Accounts younger than ${ACTIVATION_WINDOW_HOURS} hours aren’t counted yet.`,
    ],
    [
      "Weeks and windows",
      "Weekly charts run Monday to Sunday, Manila time. “Last 7 days” is a rolling window ending now.",
    ],
    [
      "Not tracked yet",
      "Searches with no results, sign-up screen steps, where installs come from, and business portal visits. Without these, the page can’t say why people drop off or what they looked for and didn’t find.",
    ],
    ["Freshness", "Numbers are cached for 10 minutes. Refresh numbers re-runs every query."],
  ]
  return (
    <section aria-labelledby="rules-title" className="flex flex-col gap-3 border-t pt-6">
      <h2 id="rules-title" className="text-[15px] font-semibold">
        How these numbers are counted
      </h2>
      <dl className="grid gap-x-8 gap-y-4 text-[13px] sm:grid-cols-[10rem_minmax(0,1fr)]">
        {rules.map(([term, body]) => (
          <div key={term} className="contents">
            <dt className="font-medium">{term}</dt>
            <dd className="-mt-3 max-w-prose text-pretty text-muted-foreground sm:mt-0">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
