"use client"

import { WarningCircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

// Same treatment as the business portal's error state: the shell stays up, so
// the sidebar is still there to go somewhere else.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div
        role="alert"
        className="mx-auto flex max-w-3xl flex-col items-center rounded-xl border bg-card px-6 py-12 text-center"
      >
        <WarningCircleIcon className="size-6 text-destructive" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">We couldn’t load this page</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Try again. If it keeps happening, the error reference below helps track it down.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Ref {error.digest}</p>
        )}
        <Button variant="outline" className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
