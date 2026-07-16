import type { Metadata } from "next"
import { getUsers, type UserSort, type UserStatusFilter } from "@/lib/queries/users"
import { UsersClient } from "@/components/admin/users-client"

export const metadata: Metadata = { title: "Users" }

const STATUSES: UserStatusFilter[] = ["all", "active", "suspended"]
const SORTS: UserSort[] = ["recent", "reviews", "az"]

function parseStatus(value: string | undefined): UserStatusFilter {
  return STATUSES.includes(value as UserStatusFilter)
    ? (value as UserStatusFilter)
    : "all"
}

function parseSort(value: string | undefined): UserSort {
  return SORTS.includes(value as UserSort) ? (value as UserSort) : "recent"
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    sort?: string
    page?: string
  }>
}) {
  const { search, status, sort, page } = await searchParams

  // Search, filter, sort and paging are resolved server-side now. They used to
  // run in the browser over the whole user table, so the page could not grow
  // past what a single payload could carry.
  const result = await getUsers({
    q: search,
    status: parseStatus(status),
    sort: parseSort(sort),
    page: Number(page) || 1,
  })

  return (
    <UsersClient
      users={result.users}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      hasMore={result.hasMore}
      search={search ?? ""}
      status={parseStatus(status)}
      sort={parseSort(sort)}
    />
  )
}
