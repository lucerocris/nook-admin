"use server"

import { revalidatePath } from "next/cache"
import {
  createAchievement as dbCreateAchievement,
  updateAchievement as dbUpdateAchievement,
  checkAchievementSlugExists,
  awardAchievement as dbAwardAchievement,
  checkDuplicateAward,
  searchProfiles,
} from "@/lib/queries/achievements"
import type { AchievementInsert, AchievementUpdate } from "@/lib/types/achievements"

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function createAchievementAction(
  input: AchievementInsert,
): Promise<ActionResult> {
  try {
    await dbCreateAchievement(input)
    revalidatePath("/admin/achievements")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create achievement",
    }
  }
}

export async function updateAchievementAction(
  id: string,
  input: AchievementUpdate,
): Promise<ActionResult> {
  try {
    await dbUpdateAchievement(id, input)
    revalidatePath("/admin/achievements")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update achievement",
    }
  }
}

export async function checkSlugAction(
  slug: string,
  excludeId?: string,
): Promise<ActionResult<{ exists: boolean }>> {
  try {
    const exists = await checkAchievementSlugExists(slug, excludeId)
    return { success: true, data: { exists } }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to check slug",
    }
  }
}

export async function awardAchievementAction(input: {
  user_id: string
  achievement_id: string
  earned_at: string
  source_type: string
  source_ref_id?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<ActionResult> {
  try {
    await dbAwardAchievement(input)
    revalidatePath("/admin/achievements")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to award achievement",
    }
  }
}

export async function checkDuplicateAwardAction(
  userId: string,
  achievementId: string,
): Promise<ActionResult<{ earned_at: string } | null>> {
  try {
    const result = await checkDuplicateAward(userId, achievementId)
    return { success: true, data: result }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to check duplicate",
    }
  }
}

export async function searchUsersAction(
  query: string,
): Promise<
  ActionResult<
    Array<{
      id: string
      username: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }>
  >
> {
  try {
    const users = await searchProfiles(query)
    return { success: true, data: users }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to search users",
    }
  }
}
