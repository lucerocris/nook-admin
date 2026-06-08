import { CheckCircle, XCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function StampVerifiedIndicator({
  isVerified,
}: {
  isVerified: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        isVerified ? "text-green-600" : "text-destructive"
      )}
    >
      {isVerified ? (
        <CheckCircle weight="fill" className="size-4" />
      ) : (
        <XCircle weight="fill" className="size-4" />
      )}
      <span>{isVerified ? "Verified" : "Unverified"}</span>
    </span>
  )
}
