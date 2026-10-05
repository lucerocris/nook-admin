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
    .update({ status: "active", review_note: null })
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

// Owner emails for a cafe, for the publish and send-back notices.
async function ownerEmails(supabase: ReturnType<typeof createAdminClient>, cafeId: string) {
  const { data: links } = await supabase
    .from("cafe_owner_cafe")
    .select("owner_id")
    .eq("cafe_id", cafeId)
  const ownerIds = (links ?? []).map((l) => l.owner_id)
  if (ownerIds.length === 0) return []
  const { data: owners } = await supabase.from("profiles").select("email").in("id", ownerIds)
  return (owners ?? []).map((o) => o.email).filter((e): e is string => !!e)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const MAX_NOTE = 2000

// The other answer to "Submit for review": the draft isn't ready, here's what
// to fix. Clears review_requested_at so the owner's dashboard offers Submit
// again, stores the note there, and emails it. Guarded on the draft still
// being submitted, so two admins can't both send it back.
export async function sendBackCafeAction(id: string, note: string) {
  await requireSuperadmin()

  const trimmed = typeof note === "string" ? note.trim() : ""
  if (!trimmed) return { sentBack: false as const, error: "Write what the owner should change." }
  if (trimmed.length > MAX_NOTE) {
    return { sentBack: false as const, error: `Keep the note under ${MAX_NOTE} characters.` }
  }

  const supabase = createAdminClient()
  const { data: cafe, error } = await supabase
    .from("cafes")
    .update({ review_requested_at: null, review_note: trimmed })
    .eq("id", id)
    .eq("status", "draft")
    .not("review_requested_at", "is", null)
    .select("name")
    .maybeSingle()

  if (error) throw error
  if (!cafe) return { sentBack: false as const, error: "This café isn't waiting for review any more." }

  revalidatePath("/admin/cafes")
  revalidatePath(`/admin/cafes/${id}`)

  const apiKey = process.env.RESEND_API_KEY
  const to = await ownerEmails(supabase, id)
  if (!apiKey || to.length === 0) {
    if (!apiKey) console.error("[SEND_BACK] RESEND_API_KEY is not set; owner not emailed.")
    return { sentBack: true as const, emailed: false }
  }

  const dashboardUrl = `${(process.env.BUSINESS_SITE_URL ?? "https://business.nookph.app").replace(/\/+$/, "")}/owner/dashboard`
  try {
    const { Resend } = await import("resend")
    const { error: mailError } = await new Resend(apiKey).emails.send({
      from: process.env.MAIL_FROM ?? "Nook <noreply@nookph.app>",
      to,
      subject: `A few changes before ${cafe.name} goes live`,
      text: [
        `We looked at ${cafe.name} and it's nearly ready. Before we publish it, please:`,
        "",
        trimmed,
        "",
        "Make the changes, then press Submit again on your dashboard:",
        dashboardUrl,
        "",
        "Questions? Message us on Instagram at @nook_cafefinder.",
      ].join("\n"),
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:15px;line-height:1.6">We looked at <strong>${escapeHtml(cafe.name)}</strong> and it's nearly ready. Before we publish it, please:</p>
<p style="font-size:15px;line-height:1.6;white-space:pre-line;background:#FFF4DC;border-radius:12px;padding:12px 16px">${escapeHtml(trimmed)}</p>
<p style="font-size:15px;line-height:1.6">Make the changes, then press <strong>Submit again</strong> on your dashboard.</p>
<p style="margin:24px 0;text-align:center"><a href="${dashboardUrl}" style="display:inline-block;background:#3A5A40;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:15px;font-weight:600">Open your dashboard</a></p>
<p style="font-size:12px;color:#9ca3af">Questions? Message us on Instagram at @nook_cafefinder.</p>
</div>`,
    })
    if (mailError) {
      console.error("[SEND_BACK] Owner email rejected:", mailError.message)
      return { sentBack: true as const, emailed: false }
    }
  } catch (e) {
    // The note is saved and shows on the dashboard either way.
    console.error("[SEND_BACK] Owner email failed:", e)
    return { sentBack: true as const, emailed: false }
  }

  return { sentBack: true as const, emailed: true }
}
