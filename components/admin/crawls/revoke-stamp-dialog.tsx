"use client"

import * as React from "react"
import { WarningCircle } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { StampMethodBadge } from "@/components/admin/crawls/stamp-method-badge"
import type { StampLogEntry } from "@/lib/types/crawls"

export function RevokeStampDialog({
  stamp,
  open,
  onOpenChange,
  onRevoke,
}: {
  stamp: StampLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevoke: (stampId: string, note: string) => Promise<string | null>
}) {
  const [auditNote, setAuditNote] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  async function handleRevoke() {
    if (!stamp || !auditNote.trim()) return
    setError(null)
    startTransition(async () => {
      const err = await onRevoke(stamp.id, auditNote.trim())
      if (err) {
        setError(err)
      } else {
        setAuditNote("")
        setError(null)
        onOpenChange(false)
      }
    })
  }

  function handleClose() {
    setAuditNote("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Stamp</AlertDialogTitle>
        </AlertDialogHeader>

        {stamp && (
          <div className="flex flex-col gap-3 text-xs">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <WarningCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{stamp.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stop</span>
                <span className="font-medium">{stamp.stop_order} · {stamp.cafe_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Originally claimed
                </span>
                <span className="font-medium">
                  {new Date(stamp.claimed_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Claim method
                </span>
                <StampMethodBadge method={stamp.claim_method} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Distance at claim
                </span>
                <span className="font-medium">
                  {stamp.distance_meters != null
                    ? `${stamp.distance_meters}m`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <WarningCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <AlertDialogDescription className="text-amber-900 dark:text-amber-100 text-xs">
                This will mark the stamp as unverified. The user's tier
                completion will be re-evaluated and any tier they no
                longer qualify for will be removed from their record.
              </AlertDialogDescription>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Audit Note{" "}
                <span className="text-muted-foreground font-normal">
                  (required)
                </span>
              </label>
              <Textarea
                placeholder="Revoked: GPS coordinates inconsistent with cafe location. Admin: [your name]"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!auditNote.trim() || isPending}
            onClick={handleRevoke}
          >
            {isPending ? "Revoking..." : "Revoke Stamp"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
