"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MagnifyingGlass,
  DotsThree,
  Eye,
  Prohibit,
  ArrowCounterClockwise,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  suspendUserAction,
  deleteUserAction,
} from "@/app/admin/users/actions"
import type { AppUser, UserSort, UserStatusFilter } from "@/lib/queries/users"

type UserStatus = "Active" | "Suspended"

function getInitials(user: AppUser) {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }
  return user.email?.[0].toUpperCase() ?? "?"
}

function getDisplayName(user: AppUser) {
  return user.full_name ?? user.username ?? user.email ?? "—"
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "Active") {
    return (
      <Badge
        variant="outline"
        className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
      >
        Active
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
    >
      Suspended
    </Badge>
  )
}

function DeleteAccountDialog({
  user,
  onClose,
}: {
  user: AppUser
  onClose: () => void
}) {
  const [confirmValue, setConfirmValue] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete account?</AlertDialogTitle>
        <AlertDialogDescription>
          Type DELETE to confirm. This removes all reviews, favorites, and
          cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Input
        placeholder="Type DELETE"
        value={confirmValue}
        onChange={(e) => setConfirmValue(e.target.value)}
      />
      <AlertDialogFooter>
        <AlertDialogCancel
          onClick={() => {
            setConfirmValue("")
            onClose()
          }}
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={confirmValue !== "DELETE" || isPending}
          onClick={() => {
            startTransition(async () => {
              try {
                await deleteUserAction(user.id)
                toast.success("User deleted")
                setConfirmValue("")
                onClose()
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to delete user"
                toast.error(message)
              }
            })
          }}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

function SuspendDialog({
  user,
  onClose,
}: {
  user: AppUser
  onClose: () => void
}) {
  const [isPending, startTransition] = React.useTransition()

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Suspend user?</AlertDialogTitle>
        <AlertDialogDescription>
          This user will be locked out and all their reviews will be hidden.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              try {
                await suspendUserAction(user.id, true)
                toast.success("User suspended")
                onClose()
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to suspend user"
                toast.error(message)
              }
            })
          }}
        >
          Suspend
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

type DialogMode = "suspend" | "delete" | null

function UserActions({ user }: { user: AppUser }) {
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null)
  const [isPending, startTransition] = React.useTransition()

  return (
    <AlertDialog
      open={dialogMode !== null}
      onOpenChange={(open) => {
        if (!open) setDialogMode(null)
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              console.log(`Viewing reviews for ${getDisplayName(user)}`)
            }}
          >
            <Eye />
            View Reviews
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!user.is_suspended && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                setDialogMode("suspend")
              }}
            >
              <Prohibit />
              Suspend User
            </DropdownMenuItem>
          )}
          {user.is_suspended && (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => {
                startTransition(async () => {
                  try {
                    await suspendUserAction(user.id, false)
                    toast.success("User unsuspended")
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to unsuspend user"
                    toast.error(message)
                  }
                })
              }}
            >
              <ArrowCounterClockwise />
              Unsuspend User
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setDialogMode("delete")
            }}
          >
            <Trash />
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogMode === "suspend" && (
        <SuspendDialog user={user} onClose={() => setDialogMode(null)} />
      )}
      {dialogMode === "delete" && (
        <DeleteAccountDialog user={user} onClose={() => setDialogMode(null)} />
      )}
    </AlertDialog>
  )
}

export function UsersClient({
  users,
  total,
  page,
  pageSize,
  hasMore,
  search,
  status,
  sort,
}: {
  users: AppUser[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  search: string
  status: UserStatusFilter
  sort: UserSort
}) {
  const router = useRouter()
  const params = useSearchParams()

  // Search/filter/sort/paging are resolved by the server now, so they live in
  // the URL rather than component state. `users` is already the current page.
  const updateParam = React.useCallback(
    (key: string, value: string, resetPage = true) => {
      const next = new URLSearchParams(params.toString())
      if (value && value !== "all" && value !== "recent") {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      if (resetPage) next.delete("page")
      const query = next.toString()
      router.push(query ? `/admin/users?${query}` : "/admin/users")
    },
    [params, router]
  )

  // Debounced so a keystroke does not fire a query per character. The server
  // now does the filtering, so each change is a real round trip.
  const [searchDraft, setSearchDraft] = React.useState(search)
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    setSearchDraft(search)
  }, [search])

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (searchDraft === search) return
    const timer = setTimeout(() => updateParam("search", searchDraft), 300)
    return () => clearTimeout(timer)
  }, [searchDraft, search, updateParam])

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params.toString())
    if (nextPage > 1) next.set("page", String(nextPage))
    else next.delete("page")
    const query = next.toString()
    router.push(query ? `/admin/users?${query}` : "/admin/users")
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Section 1 — Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">
            All registered app users
          </p>
        </div>
      </div>

      {/* Section 2 — Search bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by name or email..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => updateParam("status", v)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Joined</SelectItem>
            <SelectItem value="reviews">Most Reviews</SelectItem>
            <SelectItem value="az">A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section 3 — Users table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-center">Reviews</TableHead>
              <TableHead className="text-center">Favorites</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                      {getInitials(user)}
                    </div>
                    <span className="text-sm font-medium">
                      {getDisplayName(user)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {user.email ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm tabular-nums">
                    {user.review_count}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm tabular-nums">{user.fav_count}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={user.is_suspended ? "Suspended" : "Active"}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Section 4 — Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {total === 0
            ? "No users found"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
