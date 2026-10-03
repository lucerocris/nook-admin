"use server"

import { requireSuperadmin } from "@/lib/auth/require-superadmin"

import { revalidatePath, revalidateTag } from "next/cache"
import {
  createTag,
  updateTag,
  deleteTag,
} from "@/lib/queries/tags"

export async function createTagAction(payload: {
  name: string
  category: string
  icon_name?: string
}) {
  await requireSuperadmin()

  try {
    await createTag(payload)
    revalidateTag("admin-tags", "max")
    revalidatePath("/admin/tags")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create tag",
    }
  }
}

export async function toggleTagActiveAction(id: string, is_active: boolean) {
  await requireSuperadmin()

  try {
    await updateTag(id, { is_active })
    revalidateTag("admin-tags", "max")
    revalidatePath("/admin/tags")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tag",
    }
  }
}

export async function updateTagAction(
  id: string,
  payload: { name?: string; icon_name?: string | null }
) {
  await requireSuperadmin()

  try {
    await updateTag(id, payload)
    revalidateTag("admin-tags", "max")
    revalidatePath("/admin/tags")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tag",
    }
  }
}

export async function deleteTagAction(id: string) {
  await requireSuperadmin()

  try {
    await deleteTag(id)
    revalidateTag("admin-tags", "max")
    revalidatePath("/admin/tags")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tag",
    }
  }
}
