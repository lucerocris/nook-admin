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
    const { crawl_id, stop_id, cafe_id, user_id, verification_note, admin_id } = body

    if (!crawl_id || !stop_id || !cafe_id || !user_id || !verification_note || !admin_id) {
      return json({
        error: "Missing required fields: crawl_id, stop_id, cafe_id, user_id, verification_note, admin_id",
      }, 400)
    }

    const { data: existing } = await supabase
      .from("crawl_stamps")
      .select("id")
      .eq("stop_id", stop_id)
      .eq("user_id", user_id)
      .maybeSingle()

    if (existing) {
      return json({ error: "This stamp already exists. Refresh the page and try again." }, 409)
    }

    const { data: newStamp, error: insertError } = await supabase
      .from("crawl_stamps")
      .insert({
        crawl_id,
        stop_id,
        cafe_id,
        user_id,
        claim_method: "manual",
        is_verified: true,
        verification_note,
      })
      .select("*")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return json({ error: "This stamp already exists. Refresh the page and try again." }, 409)
      }
      return json({ error: "Failed to grant stamp" }, 500)
    }

    const { data: highestTierId, error: rpcError } = await supabase.rpc(
      "check_crawl_tier_completion",
      { p_user_id: user_id, p_crawl_id: crawl_id },
    )

    if (rpcError) {
      console.error("check_crawl_tier_completion error:", rpcError)
    }

    const highestTier = highestTierId as string | null

    let tierName: string | null = null
    if (highestTier) {
      const { data: tier } = await supabase
        .from("crawl_tiers")
        .select("name")
        .eq("id", highestTier)
        .single()
      tierName = tier?.name ?? null
    }

    const { error: regError } = await supabase
      .from("crawl_registrations")
      .update({
        highest_tier_id: highestTier,
        total_stamps: (
          await supabase
            .from("crawl_stamps")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user_id)
            .eq("crawl_id", crawl_id)
            .eq("is_verified", true)
        ).count ?? 0,
        last_stamp_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("crawl_id", crawl_id)

    if (regError) {
      console.error("crawl_registrations update error:", regError)
    }

    return json({
      stamp: newStamp,
      highest_tier_id: highestTier,
      tier_name: tierName,
    }, 200)
  } catch (err) {
    console.error("admin-grant-stamp error:", err)
    return json({ error: "Internal server error" }, 500)
  }
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
