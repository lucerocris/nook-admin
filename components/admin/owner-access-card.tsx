"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  inviteOwnerAction,
  resendInviteAction,
  revokeInviteAction,
} from "@/app/admin/cafes/invite-actions"
import type { OwnerInvite, CafeOwner } from "@/lib/queries/invites"
import { InviteStatusBadge } from "@/components/admin/invite-status-badge"
import { InviteTimeline } from "@/components/admin/invite-timeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type Props = {
  cafeId: string
  invite: OwnerInvite | null
  owners: CafeOwner[]
}

// An invite is only actionable while it is outstanding.
const PENDING_STATUSES = ["sent", "opened"] as const

export function OwnerAccessCard({ cafeId, invite, owners }: Props) {
  const [email, setEmail] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [role, setRole] = React.useState<"owner" | "manager">("owner")
  const [pending, setPending] = React.useState(false)

  const hasOwner = owners.length > 0
  const invitePending =
    invite !== null &&
    (PENDING_STATUSES as readonly string[]).includes(invite.status)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setPending(true)
    try {
      const result = await fn()
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong")
        return
      }
      toast.success(ok)
      setEmail("")
      setFullName("")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Owner Access</CardTitle>
            <CardDescription>
              {hasOwner
                ? "This cafe has an owner account."
                : invitePending
                  ? "An invite is outstanding."
                  : "No owner yet — invite one."}
            </CardDescription>
          </div>
          {invite && <InviteStatusBadge status={invite.status} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current owners — the cafe_owner_cafe link is what actually grants
            access, so it is shown separately from invite status. */}
        {hasOwner && (
          <div className="flex flex-col gap-1.5 text-sm">
            {owners.map((owner) => (
              <div key={owner.owner_id} className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0 capitalize">
                  {owner.role}
                </span>
                <span className="font-medium">
                  {owner.full_name ?? owner.email ?? owner.owner_id}
                </span>
                {owner.full_name && owner.email && (
                  <span className="text-muted-foreground">({owner.email})</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite form — only when nobody owns this cafe and nothing is pending */}
        {!hasOwner && !invitePending && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="owner@cafe.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "owner" | "manager")}
                disabled={pending}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={pending || !email.trim() || !fullName.trim()}
                onClick={() =>
                  run(
                    () => inviteOwnerAction({ cafeId, email, fullName, role }),
                    "Invite sent"
                  )
                }
              >
                {pending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        )}

        {invite && (
          <>
            {(hasOwner || invitePending) && <Separator />}
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Email</span>
                <span className="font-medium">{invite.invited_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Role</span>
                <span className="capitalize">{invite.role}</span>
              </div>
            </div>

            <Separator />

            <InviteTimeline
              sent_at={invite.sent_at}
              opened_at={invite.opened_at}
              used_at={invite.used_at}
              resent_at={invite.resent_at}
              revoked_at={invite.revoked_at}
            />

            {invitePending && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() => resendInviteAction(invite.id, cafeId), "Invite resent")
                  }
                >
                  Resend
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() =>
                    run(() => revokeInviteAction(invite.id, cafeId), "Invite revoked")
                  }
                >
                  Revoke
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
