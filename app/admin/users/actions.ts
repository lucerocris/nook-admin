"use server"

import { revalidatePath } from "next/cache"
import { suspendUser, deleteUser } from "@/lib/queries/users"
import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function suspendUserAction(userId: string, suspend: boolean) {
  await requireSuperadmin()

  await suspendUser(userId, suspend)
  revalidatePath("/admin/users")
}

export async function deleteUserAction(userId: string) {
  const { userId: callerId } = await requireSuperadmin()

  if (userId === callerId) {
    return { success: false as const, error: "You can't delete your own account" }
  }

  // Only plain app users are deletable here. Anyone with a role (superadmin,
  // cafe_owner, staff) is looked up on the auth side because app_metadata isn't
  // on profiles, and the service role is the only reader that can see it.
  const { data, error } = await createAdminClient().auth.admin.getUserById(userId)
  if (error || !data.user) {
    return { success: false as const, error: "User not found" }
  }
  if (data.user.app_metadata?.role) {
    return {
      success: false as const,
      error: "Accounts with an admin or business role can't be deleted here",
    }
  }

  await deleteUser(userId)
  revalidatePath("/admin/users")
  return { success: true as const }
}
