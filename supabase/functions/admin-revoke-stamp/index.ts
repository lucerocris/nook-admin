import { createClient } from "jsr:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401)
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user: caller }, error: authError } =
      await userClient.auth.getUser()

    if (authError || !caller) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (caller.app_metadata?.role !== "superadmin") {
      return json({ error: "Forbidden: superadmin only" }, 403)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const body = await req.json()
    const { stamp_id, verification_note, admin_id } = body

    if (!stamp_id || !verification_note || !admin_id) {
      return json({ error: "Missing required fields: stamp_id, verification_note, admin_id" }, 400)
    }

    const { data: stamp, error: stampError } = await supabase
      .from("crawl_stamps")
      .select("id, user_id, crawl_id, is_verified")
      .eq("id", stamp_id)
      .single()

    if (stampError || !stamp) {
      return json({ error: "Stamp not found" }, 404)
    }

    if (!stamp.is_verified) {
      return json({ error: "Stamp is already unverified" }, 409)
    }

    const { error: updateError } = await supabase
      .from("crawl_stamps")
      .update({ is_verified: false, verification_note })
      .eq("id", stamp_id)

    if (updateError) {
      return json({ error: "Failed to revoke stamp" }, 500)
    }

    const { data: highestTierId, error: rpcError } = await supabase.rpc(
      "check_crawl_tier_completion",
      { p_user_id: stamp.user_id, p_crawl_id: stamp.crawl_id },
    )

    if (rpcError) {
      console.error("check_crawl_tier_completion error:", rpcError)
    }

    const highestTier = highestTierId as string | null

    const { error: regError } = await supabase
      .from("crawl_registrations")
      .update({
        highest_tier_id: highestTier,
        total_stamps: (
          await supabase
            .from("crawl_stamps")
            .select("id", { count: "exact", head: true })
            .eq("user_id", stamp.user_id)
            .eq("crawl_id", stamp.crawl_id)
            .eq("is_verified", true)
        ).count ?? 0,
      })
      .eq("user_id", stamp.user_id)
      .eq("crawl_id", stamp.crawl_id)

    if (regError) {
      console.error("crawl_registrations update error:", regError)
    }

    const { data: updatedStamp, error: fetchError } = await supabase
      .from("crawl_stamps")
      .select("*")
      .eq("id", stamp_id)
      .single()

    if (fetchError) {
      return json({ error: "Stamp updated but failed to fetch" }, 500)
    }

    return json({ stamp: updatedStamp, highest_tier_id: highestTier }, 200)
  } catch (err) {
    console.error("admin-revoke-stamp error:", err)
    return json({ error: "Internal server error" }, 500)
  }
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
