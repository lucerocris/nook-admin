"use server"

import { revalidatePath, updateTag } from "next/cache"

import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import { manilaWeekStart } from "@/lib/growth/dates"
import { GROWTH_CACHE_TAG } from "@/lib/queries/growth"
import { createAdminClient } from "@/lib/supabase/admin"

export type LogInstallsResult = { ok: true } | { ok: false; error: string }

/** Records the store install total for a week. Writes only `installs`, so a
 *  row the Marketing page filled in (WAU, followers) keeps its other numbers. */
export async function logInstallsAction(input: {
  weekOf: string
  installs: number
}): Promise<LogInstallsResult> {
  const { userId } = await requireSuperadmin()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekOf) || manilaWeekStart(`${input.weekOf}T12:00:00+08:00`) !== input.weekOf) {
    return { ok: false, error: "Pick the Monday the week starts on." }
  }
  if (!Number.isInteger(input.installs) || input.installs < 0 || input.installs > 10_000_000) {
    return { ok: false, error: "Enter the install total as a whole number." }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("marketing_weekly_metrics")
    .upsert(
      { week_of: input.weekOf, installs: input.installs, updated_by: userId },
      { onConflict: "week_of" }
    )
  if (error) {
    console.error("logInstallsAction", error)
    return { ok: false, error: "Couldn't save the installs. Try again." }
  }

  updateTag(GROWTH_CACHE_TAG)
  revalidatePath("/admin/growth")
  return { ok: true }
}

/** Drops the ten-minute cache so the next load re-runs every query. */
export async function refreshGrowthAction() {
  await requireSuperadmin()
  updateTag(GROWTH_CACHE_TAG)
  revalidatePath("/admin/growth")
}
