"use server"

import { revalidatePath } from "next/cache"

import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import { suspendUser } from "@/lib/queries/users"

// Writes for gallery moderation. Each one calls a SECURITY DEFINER RPC with the
// signed-in admin's session (not the service role), so the database checks the
// superadmin role itself and records auth.uid() as the moderator in
// user_photos.moderated_by, photo_reports.resolved_by and audit_logs.
// RPCs: nook-supabase migration 20261008130000_admin_photo_moderation.

export type GalleryActionResult = { success: true } | { success: false; error: string }

const ERRORS: Record<string, string> = {
  P0002: "That photo no longer exists. The owner may have deleted it.",
  "42501": "Only admins can moderate photos.",
  // The function isn't in the schema cache: the migration hasn't been applied.
  PGRST202: "Photo moderation isn’t set up in the database yet. Apply migration 20261008130000_admin_photo_moderation.",
}

function fail(e: unknown, code?: string): GalleryActionResult {
  if (code && ERRORS[code]) return { success: false, error: ERRORS[code] }
  if (e instanceof Error && e.message === "not_authorized") return { success: false, error: ERRORS["42501"] }
  if (e instanceof Error && e.message === "auth_required") {
    return { success: false, error: "Your session ended. Sign in again." }
  }
  return { success: false, error: "The moderation action failed. Try again." }
}

function revalidate(photoId: string) {
  revalidatePath("/admin/gallery")
  revalidatePath(`/admin/gallery/${photoId}`)
  revalidatePath("/admin/dashboard")
}

async function callRpc(fn: string, args: Record<string, unknown>, photoId: string): Promise<GalleryActionResult> {
  try {
    if (!photoId) return { success: false, error: "Photo id is required." }
    const { supabase } = await requireSuperadmin()
    const { error } = await supabase.rpc(fn, args)
    if (error) return fail(error, error.code)
    revalidate(photoId)
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

/** Takes the photo off the owner's profile and grid; resolves its open reports. */
export async function removePhotoAction(photoId: string, reason?: string) {
  return callRpc("mod_remove_photo", { p_photo_id: photoId, p_reason: reason?.trim() || null }, photoId)
}

/** Puts a removed photo back. Closed reports stay closed. */
export async function restorePhotoAction(photoId: string, reason?: string) {
  return callRpc("mod_restore_photo", { p_photo_id: photoId, p_reason: reason?.trim() || null }, photoId)
}

/** Closes the photo's open reports and leaves the photo up. */
export async function dismissPhotoReportsAction(photoId: string, note?: string) {
  return callRpc("mod_dismiss_photo_reports", { p_photo_id: photoId, p_note: note?.trim() || null }, photoId)
}

/** Same suspension as the Users page (profiles.is_suspended). */
export async function setOwnerSuspendedAction(
  userId: string,
  suspend: boolean,
  photoId: string
): Promise<GalleryActionResult> {
  try {
    if (!userId) return { success: false, error: "User id is required." }
    await requireSuperadmin()
    await suspendUser(userId, suspend)
    revalidate(photoId)
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}
