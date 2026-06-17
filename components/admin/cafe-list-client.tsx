"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus,
  MagnifyingGlass,
  Star,
  DotsThree,
  PencilSimple,
  Eye,
  ArrowLineDown,
  ArrowLineUp,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { setCafeStatusAction, deleteCafeAction } from "@/app/admin/cafes/actions"
import { type Cafe } from "@/lib/queries/cafes"

type CafeRow = Cafe & { cafe_owner_cafe: { owner_id: string }[] | null }
type TagOption = { id: string; name: string; category: string }

function StatusBadge({ status }: { status: Cafe["status"] }) {
  if (status === "active") {
    return (
      <Badge variant="outline">
        <span className="inline-block size-1.5 rounded-full bg-green-500 mr-1.5" />
        Active
      </Badge>
    )
  }
  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  )
}

function OwnerBadge({ claimed }: { claimed: boolean }) {
  if (claimed) {
    return (
      <Badge
        variant="outline"
        className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
      >
        Claimed
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
    >
      Unclaimed
    </Badge>
  )
}

function CafeActions({ cafe }: { cafe: CafeRow }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function handleStatusChange(status: "active" | "inactive") {
    startTransition(async () => {
      try {
        await setCafeStatusAction(cafe.id, status)
        toast.success(status === "active" ? "Cafe activated" : "Cafe deactivated")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update cafe status"
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCafeAction(cafe.id)
        toast.success("Cafe deleted")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete cafe"
        toast.error(message)
      }
    })
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <DotsThree weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/admin/cafes/${cafe.id}/edit`)}>
            <PencilSimple />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/admin/cafes/${cafe.id}/preview`)}>
            <Eye />
            Preview
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {cafe.status === "active" && (
            <DropdownMenuItem
              onClick={() => handleStatusChange("inactive")}
            >
              <ArrowLineDown />
              Deactivate
            </DropdownMenuItem>
          )}
          {cafe.status === "inactive" && (
            <DropdownMenuItem
              onClick={() => handleStatusChange("active")}
            >
              <ArrowLineUp />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete cafe?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CafeListClient({
  cafes,
  tagOptions,
  page,
  total,
  totalPages,
}: {
  cafes: CafeRow[]
  tagOptions: TagOption[]
  page: number
  total: number
  totalPages: number
}) {
  const router = useRouter()
  const params = useSearchParams()

  function pushWithParams(nextParams: URLSearchParams) {
    const query = nextParams.toString()
    router.push(query ? `/admin/cafes?${query}` : "/admin/cafes")
  }

  function updateFilterParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value && value !== "all") {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    p.set("page", "1")
    pushWithParams(p)
  }

  function handleSearch(value: string) {
    updateFilterParam("search", value)
  }

  function handleStatus(value: string) {
    updateFilterParam("status", value)
  }

  function handleNeighborhood(value: string) {
    updateFilterParam("neighborhood", value)
  }

  function handleTag(value: string) {
    updateFilterParam("tag", value)
  }

  function handlePage(nextPage: number) {
    const p = new URLSearchParams(params.toString())
    if (nextPage <= 1) {
      p.delete("page")
    } else {
      p.set("page", String(nextPage))
    }
    pushWithParams(p)
  }

  const hasResults = cafes.length > 0
  const startItem = hasResults ? (page - 1) * 10 + 1 : 0
  const endItem = hasResults ? startItem + cafes.length - 1 : 0

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Section 1 — Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cafes</h1>
          <p className="text-muted-foreground text-sm">Manage all cafe listings</p>
        </div>
        <Button asChild>
          <Link href="/admin/cafes/new">
            <Plus />
            Add Cafe
          </Link>
        </Button>
      </div>

      {/* Section 2 — Filters and search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search cafes..."
            defaultValue={params.get("search") ?? ""}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Select
          defaultValue={params.get("status") ?? "all"}
          onValueChange={handleStatus}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={params.get("neighborhood") ?? "all"}
          onValueChange={handleNeighborhood}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="it-park">IT Park</SelectItem>
            <SelectItem value="ayala">Ayala</SelectItem>
            <SelectItem value="lahug">Lahug</SelectItem>
            <SelectItem value="talamban">Talamban</SelectItem>
            <SelectItem value="mango">Mango</SelectItem>
            <SelectItem value="mandaue">Mandaue</SelectItem>
            <SelectItem value="south-cebu">South Cebu</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={params.get("tag") ?? "all"}
          onValueChange={handleTag}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {tagOptions.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Added</SelectItem>
            <SelectItem value="az">A–Z</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="unclaimed">Unclaimed First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section 3 — Cafe table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cafe</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cafes.map((cafe) => {
            const claimed = (cafe.cafe_owner_cafe?.length ?? 0) > 0
            return (
              <TableRow key={cafe.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {cafe.featured_image_url ? (
                      <div
                        className="size-10 rounded-md bg-muted shrink-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${cafe.featured_image_url})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="size-10 rounded-md bg-muted shrink-0" aria-hidden="true" />
                    )}
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/cafes/${cafe.id}`}
                        className="font-medium text-sm hover:underline underline-offset-2"
                      >
                        {cafe.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {cafe.neighborhood ?? cafe.city}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{cafe.neighborhood ?? cafe.city}</TableCell>
                <TableCell>
                  <StatusBadge status={cafe.status} />
                </TableCell>
                <TableCell>
                  <OwnerBadge claimed={claimed} />
                </TableCell>
                <TableCell>
                  {cafe.rating !== null ? (
                    <span className="flex items-center gap-1">
                      <Star weight="fill" className="text-yellow-400 size-3.5" />
                      <span className="text-sm">{cafe.rating}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <CafeActions cafe={cafe} />
                </TableCell>
              </TableRow>
            )
          })}
          {!hasResults && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No cafes found for the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(page + 1)}
            disabled={totalPages === 0 || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
