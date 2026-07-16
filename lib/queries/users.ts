import { createAdminClient } from "@/lib/supabase/admin"
import type { User } from "@supabase/supabase-js"

// listUsers is paginated (default 50) — without paging, the Users page
// silently truncates once the user base grows past one page.
async function listAllUsers() {
  const supabase = createAdminClient()
  const perPage = 1000
  const users: User[] = []

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
  }

  return users
}

export async function getUsers() {
  const supabase = createAdminClient()

  const [
    users,
    profilesResult,
    reviewCountsResult,
  ] = await Promise.all([
    listAllUsers(),
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_suspended, created_at"),
    supabase.from("reviews").select("user_id"),
  ])

  const { data: profiles, error: profilesError } = profilesResult
  if (profilesError) throw profilesError

  const { data: reviewCounts, error: reviewCountsError } = reviewCountsResult
  if (reviewCountsError) throw reviewCountsError

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const reviewCountMap = new Map<string, number>()

  for (const review of reviewCounts ?? []) {
    reviewCountMap.set(review.user_id, (reviewCountMap.get(review.user_id) ?? 0) + 1)
  }

  const appUsers = users.filter((u) => !u.app_metadata?.role)

  return appUsers.map((user) => {
    const profile = profileMap.get(user.id)
    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      is_suspended: profile?.is_suspended ?? false,
      created_at: user.created_at,
      review_count: reviewCountMap.get(user.id) ?? 0,
      fav_count: 0,
    }
  })
}

export async function suspendUser(userId: string, suspend: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: suspend })
    .eq("id", userId)

  if (error) throw error
}

export async function deleteUser(userId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
}
