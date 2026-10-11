"use server"

import { revalidatePath } from "next/cache"

import { requireSuperadmin } from "@/lib/auth/require-superadmin"
import { getDraftImportIds } from "@/lib/queries/imports"
import { createAdminClient } from "@/lib/supabase/admin"

// Writes for the Imports page. Publish and unpublish call SECURITY DEFINER
// RPCs with the signed-in admin's session, so the database checks the
// superadmin role itself and records auth.uid() as cafe_imports.published_by.
// RPCs: nook-supabase migration 20261011100100_admin_publish_cafe_imports.

export type ImportActionResult =
  | { success: true; done: number; skippedDuplicates: number; skipped: number }
  | { success: false; error: string }

const ERRORS: Record<string, string> = {
  "42501": "Only admins can publish imported cafés.",
  PGRST202: "Publishing imports isn’t set up in the database yet. Apply migration 20261011100100_admin_publish_cafe_imports.",
}

function fail(e: unknown, code?: string): ImportActionResult {
  if (code && ERRORS[code]) return { success: false, error: ERRORS[code] }
  if (e instanceof Error && e.message === "not_authorized") return { success: false, error: ERRORS["42501"] }
  if (e instanceof Error && e.message === "auth_required") {
    return { success: false, error: "Your session ended. Sign in again." }
  }
  return { success: false, error: "That didn’t go through. Try again." }
}

function revalidate() {
  revalidatePath("/admin/imports")
  revalidatePath("/admin/cafes")
  revalidatePath("/admin/dashboard")
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BATCH = 2000 // the RPCs' per-call limit

async function run(fn: "admin_publish_cafe_imports" | "admin_unpublish_cafe_imports", ids: string[]): Promise<ImportActionResult> {
  try {
    const clean = [...new Set(ids)].filter((id) => UUID.test(id))
    if (clean.length === 0) return { success: false, error: "Select at least one café." }
    const { supabase } = await requireSuperadmin()
    let done = 0
    let skippedDuplicates = 0
    let skipped = 0
    for (let i = 0; i < clean.length; i += BATCH) {
      const { data, error } = await supabase.rpc(fn, { p_cafe_ids: clean.slice(i, i + BATCH) })
      if (error) return fail(error, error.code)
      const r = data as { published?: number; unpublished?: number; skipped_duplicate_ids?: string[]; skipped_other?: number; skipped?: number }
      done += r.published ?? r.unpublished ?? 0
      skippedDuplicates += r.skipped_duplicate_ids?.length ?? 0
      skipped += r.skipped_other ?? r.skipped ?? 0
    }
    revalidate()
    return { success: true, done, skippedDuplicates, skipped }
  } catch (e) {
    return fail(e)
  }
}

/** Puts draft imports live. Skips anything not a draft and likely duplicates. */
export async function publishImportsAction(ids: string[]) {
  return run("admin_publish_cafe_imports", ids)
}

/** Takes published imports back to draft. Skips claimed or owned cafés. */
export async function unpublishImportsAction(ids: string[]) {
  return run("admin_unpublish_cafe_imports", ids)
}

/** "Publish all tier A in <city>": every draft import of that tier and city. */
export async function publishTierInCityAction(city: string, tier: string) {
  try {
    await requireSuperadmin()
    if (!city || !["A", "B", "C"].includes(tier)) return { success: false as const, error: "Pick a city and a tier." }
    const ids = await getDraftImportIds(city, tier)
    if (ids.length === 0) return { success: true as const, done: 0, skippedDuplicates: 0, skipped: 0 }
    return run("admin_publish_cafe_imports", ids)
  } catch (e) {
    return fail(e)
  }
}

const MAX_NAME = 120
const MAX_AREA = 80

/** Quick fixes before publishing: name and neighborhood. Imports only. */
export async function updateImportedCafeAction(
  id: string,
  fields: { name: string; neighborhood: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSuperadmin()
    if (!UUID.test(id)) return { success: false, error: "Unknown café." }
    const name = (fields.name ?? "").trim()
    const neighborhood = (fields.neighborhood ?? "").trim()
    if (name.length < 2 || name.length > MAX_NAME) return { success: false, error: "Enter a name (2–120 characters)." }
    if (neighborhood.length > MAX_AREA) return { success: false, error: "Keep the area under 80 characters." }

    const supabase = createAdminClient()
    const { data: imp, error: impError } = await supabase.from("cafe_imports").select("cafe_id").eq("cafe_id", id).maybeSingle()
    if (impError) throw impError
    if (!imp) return { success: false, error: "That café isn’t an import. Edit it from Cafés." }

    const { error } = await supabase
      .from("cafes")
      .update({ name, neighborhood: neighborhood || null })
      .eq("id", id)
    if (error) throw error
    revalidate()
    revalidatePath(`/admin/cafes/${id}`)
    return { success: true }
  } catch (e) {
    const r = fail(e)
    return r.success ? { success: true } : r
  }
}
