"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  ProhibitIcon,
  TrashIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
import { Label } from "@/components/ui/label"
import type {
  ReportStatus,
  ReviewStatus,
} from "@/lib/types/reports"
import { cn } from "@/lib/utils"
import {
  hideReviewAction,
  markUnderReviewAction,
  rejectReportAction,
  removeReviewAction,
  resolveReportAction,
  restoreReviewAction,
  suspendUserAction,
  warnUserAction,
} from "@/app/admin/reviews/actions"

type ActionKey =
  | "hide"
  | "remove"
  | "restore"
  | "reject"
  | "warn"
  | "suspend"
  | "resolve"

type DialogState = {
  action: ActionKey
  note: string
} | null

interface ModerationActionsProps {
  reportId: string
  reportStatus: ReportStatus
  reviewStatus: ReviewStatus
}

export function ModerationActions({
  reportId,
  reportStatus,
  reviewStatus,
}: ModerationActionsProps) {
  const router = useRouter()
  const [dialog, setDialog] = React.useState<DialogState>(null)
  const [isPending, startTransition] = React.useTransition()

  const isClosed = reportStatus === "resolved" || reportStatus === "rejected"
  const isReadOnly = isClosed

  function openDialog(action: ActionKey) {
    setDialog({ action, note: "" })
  }

  function closeDialog() {
    setDialog(null)
  }

  function handleConfirm() {
    if (!dialog) return
    const note = dialog.note.trim() || undefined
    const messages: Record<ActionKey, string> = {
      hide: "Review hidden",
      remove: "Review removed",
      restore: "Review restored",
      reject: "Report rejected",
      warn: "Warning sent",
      suspend: "User suspended",
      resolve: "Report resolved",
    }

    startTransition(async () => {
      let result
      switch (dialog.action) {
        case "hide":
          result = await hideReviewAction(reportId, note)
          break
        case "remove":
          result = await removeReviewAction(reportId, note)
          break
        case "restore":
          result = await restoreReviewAction(reportId, note)
          break
        case "reject":
          result = await rejectReportAction(reportId, dialog.note.trim())
          break
        case "warn":
          result = await warnUserAction(reportId, dialog.note.trim())
          break
        case "suspend":
          result = await suspendUserAction(reportId, dialog.note.trim())
          break
        case "resolve":
          result = await resolveReportAction(reportId, note)
          break
      }

      if (!result) return

      if (result.success) {
        toast.success(messages[dialog.action], {
          description: note
            ? `“${note.slice(0, 80)}${note.length > 80 ? "…" : ""}”`
            : `Action recorded for report ${reportId}`,
        })
        setDialog(null)
        router.refresh()
      } else {
        toast.error(messages[dialog.action], {
          description: result.error,
        })
      }
    })
  }

  const requiresNote =
    dialog?.action === "reject" ||
    dialog?.action === "warn" ||
    dialog?.action === "suspend"

  const noteLabel: Record<string, string> = {
    reject: "Rejection reason",
    warn: "Warning message",
    suspend: "Reason for suspension",
    hide: "Why are you hiding this? (optional)",
    remove: "Why are you removing this? (optional)",
    restore: "Optional note",
    resolve: "Resolution notes (optional)",
  }

  const dialogCopy: Record<
    ActionKey,
    { title: string; description: string; confirm: string; variant: "default" | "destructive" }
  > = {
    hide: {
      title: "Hide this review?",
      description:
        "The review will no longer be visible in the app. The author can still see it on their profile. You can restore it later.",
      confirm: "Hide review",
      variant: "default",
    },
    remove: {
      title: "Remove this review permanently?",
      description:
        "The review will be permanently removed from Nook. This cannot be undone. Use this for spam, abuse, or content that violates Nook guidelines.",
      confirm: "Remove review",
      variant: "destructive",
    },
    restore: {
      title: "Restore this review?",
      description:
        "The review will become visible again in the app and the cafe's public profile.",
      confirm: "Restore review",
      variant: "default",
    },
    reject: {
      title: "Reject this report?",
      description:
        "Let the reporter know why this report was dismissed. The original review will remain visible.",
      confirm: "Reject report",
      variant: "destructive",
    },
    warn: {
      title: "Send a warning to this user?",
      description:
        "The user will receive an in-app notification explaining what they did wrong. Their reviews remain visible.",
      confirm: "Send warning",
      variant: "destructive",
    },
    suspend: {
      title: "Suspend this user?",
      description:
        "The user will be locked out of Nook and all their reviews will be hidden. You can unsuspend them later from the Users page.",
      confirm: "Suspend user",
      variant: "destructive",
    },
    resolve: {
      title: "Resolve this report?",
      description:
        "Mark this report as resolved without taking action on the review. Use this when no policy violation was found.",
      confirm: "Resolve report",
      variant: "default",
    },
  }

  const currentCopy = dialog ? dialogCopy[dialog.action] : null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Moderation actions</CardTitle>
          <CardDescription>
            {isReadOnly
              ? "This report is closed. No further actions are available."
              : "Choose how to handle this report."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isReadOnly ? (
            <p className="text-sm text-muted-foreground py-2">
              No further action required.
            </p>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={
                  isPending || reportStatus !== "pending"
                }
                onClick={() => {
                  startTransition(async () => {
                    const result = await markUnderReviewAction(reportId)
                    if (result.success) {
                      toast.success("Marked under review", {
                        description: `Action recorded for report ${reportId}`,
                      })
                      router.refresh()
                    } else {
                      toast.error("Could not mark under review", {
                        description: result.error,
                      })
                    }
                  })
                }}
              >
                <EyeSlashIcon className="size-3.5" />
                Mark under review
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={
                  isPending ||
                  reviewStatus === "hidden" ||
                  reviewStatus === "removed"
                }
                onClick={() => openDialog("hide")}
              >
                <EyeSlashIcon className="size-3.5" />
                Hide review
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isPending || reviewStatus === "removed"}
                onClick={() => openDialog("remove")}
              >
                <TrashIcon className="size-3.5" />
                Remove review
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isPending || reviewStatus === "visible"}
                onClick={() => openDialog("restore")}
              >
                <ArrowCounterClockwiseIcon className="size-3.5" />
                Restore review
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isPending}
                onClick={() => openDialog("warn")}
              >
                <WarningIcon className="size-3.5" />
                Warn user
              </Button>

              <Separator />

              <Button
                variant="destructive"
                size="sm"
                className="justify-start"
                disabled={isPending}
                onClick={() => openDialog("suspend")}
              >
                <ProhibitIcon className="size-3.5" />
                Suspend user
              </Button>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isPending || reportStatus === "pending"}
                onClick={() => openDialog("reject")}
              >
                <XCircleIcon className="size-3.5" />
                Reject report
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isPending || reportStatus === "pending"}
                onClick={() => openDialog("resolve")}
              >
                <CheckCircleIcon className="size-3.5" />
                Resolve report
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        {dialog && currentCopy && (
          <AlertDialogContent size="default">
            <AlertDialogHeader>
              <AlertDialogTitle>{currentCopy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {currentCopy.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={`note-${dialog.action}-${reportId}`}
                className="text-xs font-medium"
              >
                {noteLabel[dialog.action]}
              </Label>
              <Textarea
                id={`note-${dialog.action}-${reportId}`}
                value={dialog.note}
                onChange={(e) =>
                  setDialog({ ...dialog, note: e.target.value })
                }
                placeholder="Add context for the audit log…"
                rows={3}
                className={cn(requiresNote && "min-h-20")}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant={currentCopy.variant}
                disabled={
                  isPending ||
                  (requiresNote && dialog.note.trim().length === 0)
                }
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirm()
                }}
              >
                {isPending ? "Working…" : currentCopy.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
