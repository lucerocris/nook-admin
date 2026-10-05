"use client"

import * as React from "react"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { refreshGrowthAction } from "@/app/admin/growth/actions"

export function RefreshButton() {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          await refreshGrowthAction()
          router.refresh()
        })
      }
    >
      {!pending && <ArrowClockwiseIcon className="size-4" aria-hidden />}
      Refresh numbers
    </Button>
  )
}
