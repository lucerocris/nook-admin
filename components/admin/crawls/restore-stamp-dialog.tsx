"use client"

import * as React from "react"
import { toast } from "sonner"

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
import type { MockStamp } from "@/components/admin/crawls/stamps-mock-data"

export function RestoreStampDialog({
  stamp,
  open,
  onOpenChange,
  onRestore,
}: {
  stamp: MockStamp | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (stampId: string, note?: string) => void
}) {
  const [note, setNote] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function handleRestore() {
    if (!stamp) return
    startTransition(async () => {
      onRestore(stamp.id, note.trim() || undefined)
      setNote("")
      onOpenChange(false)
      toast.success("Stamp restored. Tier completion will be re-evaluated.")
    })
  }

  function handleClose() {
    setNote("")
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
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleRestore}
          >
            Restore Stamp
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
