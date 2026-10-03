import { createAdminClient } from "@/lib/supabase/admin"

export const USERS_PAGE_SIZE = 25

export type UserStatusFilter = "all" | "active" | "suspended"
export type UserSort = "recent" | "reviews" | "az"

export type AppUser = {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  is_suspended: boolean
  created_at: string
  review_count: number
  fav_count: number
}

export type GetUsersParams = {
  q?: string
  status?: UserStatusFilter
  sort?: UserSort
  page?: number
}

export type GetUsersResult = {
  users: AppUser[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Shape of the get_admin_users_page jsonb payload. The admin client is not
// parameterised with <Database>, so .rpc() returns `any` — this interface is
// the only description of the payload and is not compiler-checked against SQL.
type UsersPageRpc = {
  users: Array<Omit<AppUser, "fav_count">>
  total: number
  has_more: boolean
}

// Was: every auth user (via a paging loop over the GoTrue admin API), every
// profile, and every row of the reviews table — then filtered, joined and
// counted in JS. get_admin_users_page does the search, status filter, sort,
// review counts and pagination in one query.
export async function getUsers({
  q = "",
  status = "all",
  sort = "recent",
  page = 1,
}: GetUsersParams = {}): Promise<GetUsersResult> {
  const supabase = createAdminClient()
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

  const { data, error } = await supabase.rpc("get_admin_users_page", {
    p_q: q.trim() || null,
    p_limit: USERS_PAGE_SIZE,
    p_offset: (safePage - 1) * USERS_PAGE_SIZE,
    p_status: status,
    p_sort: sort,
  })

  if (error) throw error

  const result = data as UsersPageRpc

  return {
    // fav_count has no source: there is no favourites table in the schema. It
    // was hardcoded to 0 before this change and still is — the Favorites
    // column shows a placeholder, not real data.
    users: result.users.map((user) => ({ ...user, fav_count: 0 })),
    total: result.total,
    page: safePage,
    pageSize: USERS_PAGE_SIZE,
    hasMore: result.has_more,
  }
}

// Tab counts for the Users page. Asked of the same RPC as the table (limit 1,
// only `total` is read) so a count always matches what its tab lists: app
// users only, staff accounts excluded. Unaffected by search, like the tabs.
export async function getUserStatusCounts() {
  const supabase = createAdminClient()
  const count = async (status: "active" | "suspended") => {
    const { data, error } = await supabase.rpc("get_admin_users_page", {
      p_q: null,
      p_limit: 1,
      p_offset: 0,
      p_status: status,
      p_sort: "recent",
    })
    if (error) throw error
    return (data as UsersPageRpc).total
  }
  const [active, suspended] = await Promise.all([count("active"), count("suspended")])
  return { all: active + suspended, active, suspended }
}

export type UserStatusCounts = Awaited<ReturnType<typeof getUserStatusCounts>>

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
