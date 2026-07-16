import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type OwnerInvite = {
  id: string
  cafe_id: string
  invited_profile_id: string | null
  invited_email: string
  status: "sent" | "opened" | "accepted" | "expired" | "revoked" | "failed"
  role: "owner" | "manager"
  expires_at: string | null
  sent_at: string | null
  opened_at: string | null
  used_at: string | null
  resent_at: string | null
  revoked_at: string | null
  created_at: string
}

/**
 * Returns the most recent invite for a given cafe, or null if none exists.
 * Uses the admin client so it works from server components without RLS restrictions.
 */
export async function getInviteForCafe(cafeId: string): Promise<OwnerInvite | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("owner_invites")
    .select(
      "id, cafe_id, invited_profile_id, invited_email, status, role, expires_at, sent_at, opened_at, used_at, resent_at, revoked_at, created_at"
    )
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as OwnerInvite | null
}

export type CafeOwner = {
  owner_id: string
  role: string
  full_name: string | null
  email: string | null
}

/**
 * Who currently owns this cafe, if anyone. An invite row is not proof of
 * access — the cafe_owner_cafe link is what nook-business actually gates on.
 */
export async function getOwnersForCafe(cafeId: string): Promise<CafeOwner[]> {
  const admin = createAdminClient()

  const { data: links, error } = await admin
    .from("cafe_owner_cafe")
    .select("owner_id, role")
    .eq("cafe_id", cafeId)

  if (error) throw error
  if (!links || links.length === 0) return []

  // Fetched separately rather than embedded: cafe_owner_cafe.owner_id has a FK
  // to auth.users, not to profiles, so PostgREST cannot infer the relationship.
  const ownerIds = links.map((link) => link.owner_id as string)
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ownerIds)

  if (profilesError) throw profilesError

  const byId = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, profile])
  )

  return links.map((link) => {
    const profile = byId.get(link.owner_id as string)
    return {
      owner_id: link.owner_id as string,
      role: link.role as string,
      full_name: (profile?.full_name as string | null) ?? null,
      email: (profile?.email as string | null) ?? null,
    }
  })
}

/**
 * Calls one of the invite edge functions with the caller's own JWT.
 *
 * The functions run with verify_jwt = false and check the caller themselves
 * (auth.getUser + app_metadata.role === "superadmin"), so they need the real
 * user token — the service-role key would be rejected. Same transport as the
 * stamp dialogs, but issued server-side so the token never reaches the browser.
 */
async function callInviteFunction<T>(
  fn: "invite-owner" | "resend-invite" | "revoke-invite",
  body: Record<string, unknown>
): Promise<T> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error("Not authenticated")

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fn}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  } & T

  if (!response.ok) {
    throw new Error(payload.error ?? `Invite request failed (${response.status})`)
  }

  return payload
}

export async function sendOwnerInvite(input: {
  cafeId: string
  email: string
  fullName: string
  role: "owner" | "manager"
}) {
  return callInviteFunction<{ invite_id: string; user_id: string }>(
    "invite-owner",
    {
      cafe_id: input.cafeId,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
    }
  )
}

export async function resendOwnerInvite(inviteId: string) {
  return callInviteFunction<{ invite_id: string }>("resend-invite", {
    invite_id: inviteId,
  })
}

export async function revokeOwnerInvite(inviteId: string) {
  return callInviteFunction<{ invite_id: string }>("revoke-invite", {
    invite_id: inviteId,
  })
}
