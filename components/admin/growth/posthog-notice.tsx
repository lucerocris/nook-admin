import { PlugsIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr"

import type { PostHogStatus } from "@/lib/queries/growth"

// Said once, above the numbers, instead of an error in every tile.
export function PostHogNotice({ status }: { status: PostHogStatus }) {
  const notConfigured = status.status === "not_configured"
  const Icon = notConfigured ? PlugsIcon : WarningCircleIcon
  return (
    <div role="status" className="flex gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm sm:px-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">
          {notConfigured ? "PostHog isn’t connected here" : "PostHog didn’t answer"}
        </p>
        <p className="mt-0.5 text-[13px] text-pretty text-muted-foreground">
          {notConfigured ? (
            <>
              Active people, retention, first opens and in-app events come from PostHog. Add{" "}
              <code className="font-mono text-xs">POSTHOG_PERSONAL_API_KEY</code> and{" "}
              <code className="font-mono text-xs">POSTHOG_PROJECT_ID</code> to this deployment.
              Everything from the database below is real.
            </>
          ) : (
            <>Numbers from the database are shown; PostHog ones are left blank. Refresh to try again.</>
          )}
        </p>
      </div>
    </div>
  )
}
