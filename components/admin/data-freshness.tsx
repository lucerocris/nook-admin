"use client"

// Formatted in the browser so the stamp shows the viewer's local time, not the
// server's. suppressHydrationWarning covers the server/client timezone gap.
export function DataFreshness({ generatedAt }: { generatedAt: string }) {
  const formatted = new Date(generatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <p className="text-xs text-muted-foreground">
      Data as of{" "}
      <time dateTime={generatedAt} suppressHydrationWarning>
        {formatted}
      </time>
    </p>
  )
}
