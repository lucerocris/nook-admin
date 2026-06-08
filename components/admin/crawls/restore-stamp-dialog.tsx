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
import type { StampLogEntry } from "@/lib/types/crawls"

export function RestoreStampDialog({
  stamp,
  open,
  onOpenChange,
  onRestore,
}: {
  stamp: StampLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (stampId: string, note?: string) => Promise<string | null>
}) {
  const [note, setNote] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  async function handleRestore() {
    if (!stamp) return
    setError(null)
    startTransition(async () => {
      const err = await onRestore(stamp.id, note.trim() || undefined)
      if (err) {
        setError(err)
      } else {
        setNote("")
        setError(null)
        onOpenChange(false)
      }
    })
  }

  function handleClose() {
    setNote("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this stamp?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the stamp as verified again and re-evaluate
            tier completion.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {stamp && (
          <div className="flex flex-col gap-3 text-xs">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <WarningCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Note{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Reason for restoration..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleRestore}
          >
            {isPending ? "Restoring..." : "Restore Stamp"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
