import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const METHOD_CONFIG = {
  qr: {
    label: "QR",
    className:
      "border-border text-muted-foreground",
  },
  manual: {
    label: "Manual",
    className:
      "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  redemption: {
    label: "Redemption",
    className:
      "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
}

export function StampMethodBadge({
  method,
}: {
  method: "qr" | "manual" | "redemption"
}) {
  const config = METHOD_CONFIG[method]
  return (
    <Badge variant="outline" className={cn(config.className, "font-mono text-xs")}>
      {config.label}
    </Badge>
  )
}
