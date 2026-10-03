import { cn } from "@/lib/utils"
import { SpinnerIcon } from "@phosphor-icons/react/dist/ssr"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <SpinnerIcon
      role="status"
      aria-label="Loading"
      // motion-safe: keeps the icon visible as a busy cue but stops it spinning
      // for users who have asked for reduced motion.
      className={cn("size-4 motion-safe:animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
