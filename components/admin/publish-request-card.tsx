"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowUUpLeft, RocketLaunch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { publishCafeAction, sendBackCafeAction } from "@/app/admin/cafes/actions"

// Shown on a draft cafe's page once its owner has pressed "Submit for review"
// on the business dashboard. Publish makes it live and emails the owner; Send
// back stores a note, emails it, and lets the owner submit again.
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
  const [sendingBack, startSendBack] = React.useTransition()
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [noteError, setNoteError] = React.useState<string | null>(null)

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

  const sendBack = () => {
    setNoteError(null)
    startSendBack(async () => {
      try {
        const result = await sendBackCafeAction(cafeId, note)
        if (!result.sentBack) {
          setNoteError(result.error)
          return
        }
        setOpen(false)
        setNote("")
        toast.success(
          result.emailed
            ? `Sent back. The owner has your note by email.`
            : `Sent back. The note is on their dashboard, but the email didn't go out.`
        )
        router.refresh()
      } catch {
        setNoteError("Couldn't send it back. Please try again.")
      }
    })
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Owner submitted this listing for review</p>
        <p className="text-xs text-muted-foreground">
          {new Date(requestedAt).toLocaleString()} · Check the details, photos and map pin,
          then publish or send it back with what to fix. The owner gets an email either way.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={pending}>
          <ArrowUUpLeft />
          Send back
        </Button>
        <Button size="sm" onClick={publish} disabled={pending || sendingBack}>
          <RocketLaunch />
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !sendingBack && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {cafeName} back</DialogTitle>
            <DialogDescription>
              Tell the owner what to change. They see this on their dashboard and by email,
              and can submit again once it&apos;s fixed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="e.g. The cover photo is a logo. Please use a photo of the inside of the cafe."
            aria-label="What should the owner change?"
            aria-invalid={!!noteError}
            aria-describedby={noteError ? "send-back-error" : undefined}
          />
          {noteError && (
            <p id="send-back-error" role="alert" className="text-sm text-destructive">
              {noteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sendingBack}>
              Cancel
            </Button>
            <Button onClick={sendBack} disabled={sendingBack || !note.trim()}>
              {sendingBack ? "Sending…" : "Send back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// A draft that was sent back and not yet resubmitted: shows the admin what
// was asked, so the next reviewer has the history.
export function SentBackNote({ note }: { note: string }) {
  return (
    <div className="mb-6 rounded-lg border bg-card px-4 py-3">
      <p className="text-sm font-medium">Sent back to the owner</p>
      <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{note}</p>
    </div>
  )
}
