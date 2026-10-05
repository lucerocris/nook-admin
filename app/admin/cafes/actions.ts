"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperadmin } from "@/lib/auth/require-superadmin"

export async function setCafeStatusAction(
  id: string,
  status: "draft" | "active" | "inactive"
) {
  await requireSuperadmin()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("cafes")
    .update({ status })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/cafes")
}

export async function deleteCafeAction(id: string) {
  await requireSuperadmin()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("cafes")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/cafes")
}

// Publishes a draft whose owner pressed "Submit for review" on the business
// dashboard, and tells the owner(s) it's live; the dashboard promises that
// email. Guarded on status = 'draft' so a double click can't send it twice.
export async function publishCafeAction(id: string) {
  await requireSuperadmin()

  const supabase = createAdminClient()
  const { data: published, error } = await supabase
    .from("cafes")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "draft")
    .select("name")
    .maybeSingle()

  if (error) throw error
  if (!published) return { published: false as const }

  revalidatePath("/admin/cafes")
  revalidatePath(`/admin/cafes/${id}`)

  const { data: links } = await supabase
    .from("cafe_owner_cafe")
    .select("owner_id")
    .eq("cafe_id", id)
  const ownerIds = (links ?? []).map((l) => l.owner_id)
  if (ownerIds.length === 0 || !process.env.RESEND_API_KEY) {
    return { published: true as const }
  }

  const { data: owners } = await supabase
    .from("profiles")
    .select("email")
    .in("id", ownerIds)
  const to = (owners ?? []).map((o) => o.email).filter((e): e is string => !!e)
  if (to.length === 0) return { published: true as const }

  try {
    const { Resend } = await import("resend")
    const { error: mailError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.MAIL_FROM ?? "Nook <noreply@nookph.app>",
      to,
      subject: `${published.name} is now live on Nook`,
      text: [
        `${published.name} is now public on Nook. People can find it in the app and on the web.`,
        "",
        `See it: https://www.nookph.app/cafes/${id}`,
        "",
        "Keep your hours, photos and menu up to date from your dashboard:",
        "https://business.nookph.app/owner/dashboard",
      ].join("\n"),
    })
    if (mailError) console.error("[PUBLISH] Live email rejected:", mailError.message)
  } catch (e) {
    // The cafe is published either way; the email is a courtesy.
    console.error("[PUBLISH] Live email failed:", e)
  }

  return { published: true as const }
}
