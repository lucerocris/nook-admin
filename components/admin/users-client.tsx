"use client"

import * as React from "react"
import {
  ArrowCounterClockwise,
  DotsThree,
  Prohibit,
  Trash,
  Users as UsersIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  BulkBar,
  FilterChips,
  FilterSelect,
  PageHeader,
  SearchField,
  SelectAllCheckbox,
  StatusChip,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Toolbar,
  TR,
  shortDate,
  useDebouncedSearch,
  useUrlState,
  type ActiveFilter,
} from "@/components/admin/table-kit"
import { suspendUserAction, deleteUserAction } from "@/app/admin/users/actions"
import type { AppUser, UserSort, UserStatusCounts, UserStatusFilter } from "@/lib/queries/users"

const SORTS = [
  { value: "recent", label: "Recently joined" },
  { value: "reviews", label: "Most reviews" },
  { value: "az", label: "Name A–Z" },
]

const FILTER_KEYS = ["search", "sort"]

function getInitials(user: AppUser) {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }
  return user.email?.[0].toUpperCase() ?? "?"
}

function getDisplayName(user: AppUser) {
  return user.full_name ?? user.username ?? user.email ?? "—"
}

function UserAvatar({ user }: { user: AppUser }) {
  return (
    <Avatar>
      {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
      <AvatarFallback className="text-xs font-medium">{getInitials(user)}</AvatarFallback>
    </Avatar>
  )
}

function UserStatusChip({ user }: { user: AppUser }) {
  return user.is_suspended ? (
    <StatusChip tone="danger">Suspended</StatusChip>
  ) : (
    <StatusChip tone="success">Active</StatusChip>
  )
}

function reviewCount(n: number) {
  return `${n.toLocaleString()} ${n === 1 ? "review" : "reviews"}`
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
  const name = getDisplayName(user)

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {name}’s account?</AlertDialogTitle>
        <AlertDialogDescription>
          Their reviews and favorites are removed with it. This can’t be undone. Type DELETE to
          confirm.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Input
        aria-label="Type DELETE to confirm"
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
          onClick={(e) => {
            // Stay open while the delete runs; close on success.
            e.preventDefault()
            startTransition(async () => {
              try {
                await deleteUserAction(user.id)
                toast.success(`${name}’s account deleted`)
                setConfirmValue("")
                onClose()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn’t delete the account")
              }
            })
          }}
        >
          {isPending ? "Deleting…" : "Delete account"}
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
  const name = getDisplayName(user)

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Suspend {name}?</AlertDialogTitle>
        <AlertDialogDescription>
          They’re locked out of the app and all their reviews are hidden until you unsuspend them.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault()
            startTransition(async () => {
              try {
                await suspendUserAction(user.id, true)
                toast.success(`${name} suspended`)
                onClose()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn’t suspend the user")
              }
            })
          }}
        >
          {isPending ? "Suspending…" : "Suspend user"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

type DialogMode = "suspend" | "delete" | null

function UserActions({ user }: { user: AppUser }) {
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null)
  const [isPending, startTransition] = React.useTransition()
  const name = getDisplayName(user)

  return (
    <AlertDialog
      open={dialogMode !== null}
      onOpenChange={(open) => {
        if (!open) setDialogMode(null)
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Actions for ${name}`}>
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {user.is_suspended ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => {
                startTransition(async () => {
                  try {
                    await suspendUserAction(user.id, false)
                    toast.success(`${name} unsuspended`)
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Couldn’t unsuspend the user")
                  }
                })
              }}
            >
              <ArrowCounterClockwise />
              Unsuspend user
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setDialogMode("suspend")
              }}
            >
              <Prohibit />
              Suspend user
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
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogMode === "suspend" && <SuspendDialog user={user} onClose={() => setDialogMode(null)} />}
      {dialogMode === "delete" && <DeleteAccountDialog user={user} onClose={() => setDialogMode(null)} />}
    </AlertDialog>
  )
}

export function UsersClient({
  users,
  total,
  page,
  pageSize,
  totalPages,
  status,
  sort,
  statusCounts,
}: {
  users: AppUser[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  status: UserStatusFilter
  sort: UserSort
  statusCounts: UserStatusCounts
}) {
  // Search/filter/sort/paging are resolved by the server, so they live in the
  // URL rather than component state. `users` is already the current page.
  // The search box is debounced so a keystroke does not fire a query per
  // character: each change is a real round trip.
  const url = useUrlState()
  const search = useDebouncedSearch()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkPending, startBulk] = React.useTransition()
  const [confirmBulkSuspend, setConfirmBulkSuspend] = React.useState(false)

  // Selection is per page: a new page or filter is a new set of rows.
  const rowKey = users.map((u) => u.id).join(",")
  React.useEffect(() => setSelected(new Set()), [rowKey])

  const filters: ActiveFilter[] = []
  if (url.get("search"))
    filters.push({ key: "search", label: "Search", value: `“${url.get("search")}”`, onRemove: () => url.set("search", "") })

  const allOnPage = users.length > 0 && users.every((u) => selected.has(u.id))
  const someOnPage = users.some((u) => selected.has(u.id))

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toSuspend = users.filter((u) => selected.has(u.id) && !u.is_suspended)
  const toUnsuspend = users.filter((u) => selected.has(u.id) && u.is_suspended)

  // suspendUserAction takes one id, so a bulk change is one call per user.
  // Deleting stays one account at a time, behind its typed confirmation.
  function bulkSuspend(suspend: boolean) {
    const targets = suspend ? toSuspend : toUnsuspend
    if (targets.length === 0) {
      toast.info(suspend ? "Everyone selected is already suspended" : "No one selected is suspended")
      return
    }
    startBulk(async () => {
      const results = await Promise.allSettled(targets.map((u) => suspendUserAction(u.id, suspend)))
      const failed = results.filter((r) => r.status === "rejected").length
      const done = targets.length - failed
      if (done > 0) toast.success(`${done} ${done === 1 ? "user" : "users"} ${suspend ? "suspended" : "unsuspended"}`)
      if (failed > 0) toast.error(`${failed} couldn’t be changed. Try them again.`)
      setSelected(new Set())
      setConfirmBulkSuspend(false)
    })
  }

  const hasFilters = filters.length > 0
  const empty =
    users.length === 0 ? (
      hasFilters || status !== "all" ? (
        <TableEmpty
          icon={UsersIcon}
          title={status === "suspended" && !hasFilters ? "No one is suspended" : "No users match"}
          body={
            status === "suspended" && !hasFilters
              ? "Suspended users show up here until you unsuspend them."
              : "Try a different search or another tab."
          }
          action={
            <Button variant="outline" size="sm" onClick={() => url.clear([...FILTER_KEYS, "status"])}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          icon={UsersIcon}
          title="No users yet"
          body="People who sign up in the Nook app show up here."
        />
      )
    ) : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Users"
        summary={`${statusCounts.all.toLocaleString()} people use the Nook app · ${statusCounts.suspended.toLocaleString()} suspended`}
      />

      <StatusTabs
        value={status}
        onChange={(v) => url.set("status", v, "all")}
        tabs={[
          { value: "all", label: "All", count: statusCounts.all },
          { value: "active", label: "Active", count: statusCounts.active },
          { value: "suspended", label: "Suspended", count: statusCounts.suspended },
        ]}
      />

      {selected.size > 0 ? (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="outline" size="sm" loading={bulkPending} onClick={() => bulkSuspend(false)}>
            <ArrowCounterClockwise aria-hidden />
            Unsuspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={bulkPending}
            onClick={() => {
              if (toSuspend.length === 0) bulkSuspend(true)
              else setConfirmBulkSuspend(true)
            }}
          >
            <Prohibit aria-hidden />
            Suspend
          </Button>
        </BulkBar>
      ) : (
        <Toolbar>
          <SearchField value={search.value} onChange={search.onChange} placeholder="Search by name or email" />
          <FilterSelect
            label="Sort"
            value={sort}
            allValue="recent"
            allLabel="Recently joined"
            onChange={(v) => url.set("sort", v, "recent")}
            options={SORTS.filter((s) => s.value !== "recent")}
          />
        </Toolbar>
      )}

      <FilterChips filters={filters} onClearAll={() => url.clear(FILTER_KEYS)} />

      <TableCard
        busy={url.isPending}
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={`${TH} w-10`}>
                  <SelectAllCheckbox
                    checked={allOnPage}
                    indeterminate={someOnPage && !allOnPage}
                    onChange={(on) => setSelected(on ? new Set(users.map((u) => u.id)) : new Set())}
                  />
                </TableHead>
                <TableHead className={TH}>User</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={`${TH} text-right`}>Reviews</TableHead>
                <TableHead className={TH}>Joined</TableHead>
                <TableHead className={`${TH} w-12`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelected = selected.has(user.id)
                const name = getDisplayName(user)
                return (
                  <TableRow key={user.id} data-state={isSelected ? "selected" : undefined} className={TR}>
                    <TableCell className={TD}>
                      <Checkbox
                        aria-label={`Select ${name}`}
                        checked={isSelected}
                        onCheckedChange={(v) => toggle(user.id, v === true)}
                      />
                    </TableCell>
                    <TableCell className={`${TD} max-w-[24rem]`}>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div className="grid min-w-0 leading-tight">
                          <span className="truncate font-medium">{name}</span>
                          {user.email && user.email !== name && (
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <UserStatusChip user={user} />
                    </TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>
                      {user.review_count.toLocaleString()}
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground tabular-nums`}>
                      {shortDate(user.created_at)}
                    </TableCell>
                    <TableCell className={`${TD} text-right`}>
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
        list={users.map((user) => {
          const name = getDisplayName(user)
          return (
            <li key={user.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                aria-label={`Select ${name}`}
                checked={selected.has(user.id)}
                onCheckedChange={(v) => toggle(user.id, v === true)}
                className="mt-2"
              />
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <UserStatusChip user={user} />
                </div>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {[user.email !== name ? user.email : null, reviewCount(user.review_count), `Joined ${shortDate(user.created_at)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <UserActions user={user} />
            </li>
          )
        })}
        footer={
          <TableFooter
            page={page}
            pageSize={pageSize}
            shown={users.length}
            total={total}
            totalPages={totalPages}
            onPage={(p) => url.set("page", p > 1 ? String(p) : "")}
            noun="users"
          />
        }
      />

      <AlertDialog open={confirmBulkSuspend} onOpenChange={(open) => !bulkPending && setConfirmBulkSuspend(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend {toSuspend.length} {toSuspend.length === 1 ? "user" : "users"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They’re locked out of the app and all their reviews are hidden until you unsuspend them.
              {toUnsuspend.length > 0 &&
                ` ${toUnsuspend.length} already suspended ${toUnsuspend.length === 1 ? "is" : "are"} left as is.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={bulkPending}
              onClick={(e) => {
                e.preventDefault()
                bulkSuspend(true)
              }}
            >
              {bulkPending ? "Suspending…" : toSuspend.length === 1 ? "Suspend user" : "Suspend users"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
