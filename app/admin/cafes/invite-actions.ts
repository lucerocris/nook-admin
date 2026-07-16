"use server"

import { revalidatePath } from "next/cache"
import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import {
  sendOwnerInvite,
  resendOwnerInvite,
  revokeOwnerInvite,
} from "@/lib/queries/invites"

export type InviteActionResult = { ok: true } | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The invite edge functions check the caller themselves, so this guard is
// defence in depth rather than the only gate — but it keeps every server action
// in this app consistent, and fails fast without a network round trip.
export async function inviteOwnerAction(input: {
  cafeId: string
  email: string
  fullName: string
  role: "owner" | "manager"
}): Promise<InviteActionResult> {
  await requireSuperadmin()

  const email = input.email.trim()
  const fullName = input.fullName.trim()

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." }
  if (!fullName) return { ok: false, error: "Enter the owner's name." }
  if (input.role !== "owner" && input.role !== "manager") {
    return { ok: false, error: "Role must be owner or manager." }
  }

  try {
    await sendOwnerInvite({ ...input, email, fullName })
  } catch (error) {
    // Returned as data, not thrown: Next redacts the message of anything thrown
    // from a server action in production, and these messages are actionable
    // ("A user with this email already exists").
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send invite.",
    }
  }

  revalidatePath(`/admin/cafes/${input.cafeId}`)
  revalidatePath("/admin/cafes")
  return { ok: true }
}

export async function resendInviteAction(
  inviteId: string,
  cafeId: string
): Promise<InviteActionResult> {
  await requireSuperadmin()

  try {
    await resendOwnerInvite(inviteId)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to resend invite.",
    }
  }

  revalidatePath(`/admin/cafes/${cafeId}`)
  return { ok: true }
}

export async function revokeInviteAction(
  inviteId: string,
  cafeId: string
): Promise<InviteActionResult> {
  await requireSuperadmin()

  try {
    await revokeOwnerInvite(inviteId)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to revoke invite.",
    }
  }

  revalidatePath(`/admin/cafes/${cafeId}`)
  revalidatePath("/admin/cafes")
  return { ok: true }
}
