"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RocketLaunch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { publishCafeAction } from "@/app/admin/cafes/actions"

// Shown on a draft cafe's page once its owner has pressed "Submit for review"
// on the business dashboard. Publishing emails the owner that it's live.
export function PublishRequestCard({
  cafeId,
  cafeName,
  requestedAt,
}: {
  cafeId: string
  cafeName: string
  requestedAt: string
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const publish = () => {
    startTransition(async () => {
      try {
        const result = await publishCafeAction(cafeId)
        if (result.published) {
          toast.success(`${cafeName} is live`)
        } else {
          toast.info(`${cafeName} isn't a draft any more`)
        }
        router.refresh()
      } catch {
        toast.error("Couldn't publish. Please try again.")
      }
    })
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Owner submitted this listing for review</p>
        <p className="text-xs text-muted-foreground">
          {new Date(requestedAt).toLocaleString()} · Check the details, photos and map pin,
          then publish. The owner gets an email when it&apos;s live.
        </p>
      </div>
      <Button size="sm" onClick={publish} disabled={pending} className="shrink-0">
        <RocketLaunch />
        {pending ? "Publishing…" : "Publish"}
      </Button>
    </div>
  )
}
