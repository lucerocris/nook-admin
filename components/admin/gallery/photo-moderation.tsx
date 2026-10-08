"use client"

// Shared by the Gallery queue rows and the photo page: the status chips, the
// photo's display title, and one confirm dialog for every moderation action
// (design.md: confirmations are a small dialog).

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusChip } from "@/components/admin/table-kit"
import type { GalleryPhoto, PersonMini } from "@/lib/types/gallery"
import {
  dismissPhotoReportsAction,
  removePhotoAction,
  restorePhotoAction,
  setOwnerSuspendedAction,
  type GalleryActionResult,
} from "@/app/admin/gallery/actions"

// ---------------------------------------------------------------------------
// Display helpers

export function handle(person: PersonMini) {
  return person.username ? `@${person.username}` : person.full_name ?? "Unknown user"
}

/** What to call a photo in a row: the drink, else its note, else the café. */
export function photoTitle(photo: Pick<GalleryPhoto, "drink_name" | "caption" | "cafe">) {
  if (photo.drink_name) return photo.drink_name
  if (photo.caption) return `“${photo.caption}”`
  return `Photo at ${photo.cafe.name}`
}

export function PhotoStatusChips({
  photo,
  showOpenReports = true,
  className,
}: {
  photo: Pick<GalleryPhoto, "moderation_status" | "is_hidden" | "open_reports">
  showOpenReports?: boolean
  className?: string
}) {
  return (
    <span className={className ?? "flex flex-wrap items-center gap-1.5"}>
      {photo.moderation_status === "visible" ? (
        <StatusChip tone="success">Visible</StatusChip>
      ) : photo.moderation_status === "removed" ? (
        <StatusChip tone="danger">Removed</StatusChip>
      ) : (
        <StatusChip tone="danger">Hidden by Nook</StatusChip>
      )}
      {photo.is_hidden && <StatusChip tone="neutral">Hidden by owner</StatusChip>}
      {showOpenReports && photo.open_reports > 0 && (
        <StatusChip tone="warning">
          {photo.open_reports} open {photo.open_reports === 1 ? "report" : "reports"}
        </StatusChip>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Actions

export type PhotoActionKey = "remove" | "restore" | "dismiss" | "suspend" | "unsuspend"

type Target = {
  photoId: string
  ownerId: string
  ownerHandle: string
  openReports: number
}

const COPY: Record<
  PhotoActionKey,
  {
    title: (t: Target) => string
    body: (t: Target) => string
    confirm: string
    done: string
    note?: string
    destructive?: boolean
  }
> = {
  remove: {
    title: () => "Remove this photo?",
    body: (t) =>
      `It disappears from ${t.ownerHandle}’s public profile and from their own gallery.` +
      (t.openReports > 0
        ? ` ${t.openReports === 1 ? "Its open report is" : `Its ${t.openReports} open reports are`} marked resolved.`
        : "") +
      " You can restore it later.",
    confirm: "Remove photo",
    done: "Photo removed",
    note: "Why are you removing it? (optional)",
    destructive: true,
  },
  restore: {
    title: () => "Restore this photo?",
    body: (t) => `It shows on ${t.ownerHandle}’s profile and in their gallery again. Closed reports stay closed.`,
    confirm: "Restore photo",
    done: "Photo restored",
    note: "Note (optional)",
  },
  dismiss: {
    title: (t) => (t.openReports === 1 ? "Dismiss this report?" : `Dismiss ${t.openReports} reports?`),
    body: () => "The photo stays up. Use this when it breaks no rule.",
    confirm: "Dismiss",
    done: "Reports dismissed",
    note: "Why is it fine? (optional)",
  },
  suspend: {
    title: (t) => `Suspend ${t.ownerHandle}?`,
    body: () =>
      "Their public profile and gallery stop showing. Same as suspending from the Users page, where you can lift it.",
    confirm: "Suspend user",
    done: "User suspended",
    destructive: true,
  },
  unsuspend: {
    title: (t) => `Lift ${t.ownerHandle}’s suspension?`,
    body: () => "Their public profile and gallery show again.",
    confirm: "Lift suspension",
    done: "Suspension lifted",
  },
}

async function run(action: PhotoActionKey, t: Target, note: string): Promise<GalleryActionResult> {
  switch (action) {
    case "remove":
      return removePhotoAction(t.photoId, note)
    case "restore":
      return restorePhotoAction(t.photoId, note)
    case "dismiss":
      return dismissPhotoReportsAction(t.photoId, note)
    case "suspend":
      return setOwnerSuspendedAction(t.ownerId, true, t.photoId)
    case "unsuspend":
      return setOwnerSuspendedAction(t.ownerId, false, t.photoId)
  }
}

/** One dialog per page. `ask(action, target)` opens it. */
export function usePhotoModeration() {
  const router = useRouter()
  const [state, setState] = React.useState<{ action: PhotoActionKey; target: Target; note: string } | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const ask = React.useCallback((action: PhotoActionKey, photo: GalleryPhoto) => {
    setState({
      action,
      note: "",
      target: {
        photoId: photo.id,
        ownerId: photo.owner.id,
        ownerHandle: handle(photo.owner),
        openReports: photo.open_reports,
      },
    })
  }, [])

  function confirm() {
    if (!state) return
    const { action, target, note } = state
    startTransition(async () => {
      const result = await run(action, target, note)
      if (result.success) {
        toast.success(COPY[action].done)
        setState(null)
        router.refresh()
      } else {
        toast.error(`Couldn’t ${COPY[action].confirm.toLowerCase()}`, { description: result.error })
      }
    })
  }

  const copy = state ? COPY[state.action] : null

  const dialog = (
    <AlertDialog open={state !== null} onOpenChange={(open) => !open && !isPending && setState(null)}>
      {state && copy && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title(state.target)}</AlertDialogTitle>
            <AlertDialogDescription>{copy.body(state.target)}</AlertDialogDescription>
          </AlertDialogHeader>
          {copy.note && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="photo-moderation-note" className="text-xs font-medium">
                {copy.note}
              </Label>
              <Textarea
                id="photo-moderation-note"
                value={state.note}
                maxLength={500}
                rows={3}
                onChange={(e) => setState({ ...state, note: e.target.value })}
                placeholder="Kept in the photo’s history"
                className="text-base sm:text-sm"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={copy.destructive ? "destructive" : "default"}
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                confirm()
              }}
            >
              {isPending ? "Working…" : copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )

  return { ask, dialog, busyPhotoId: isPending ? state?.target.photoId ?? null : null }
}
