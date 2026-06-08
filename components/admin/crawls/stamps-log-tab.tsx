"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MagnifyingGlass,
  MapPin,
  Flag,
  FlagBanner,
  ArrowCounterClockwise,
  Prohibit,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { CrawlStopWithCafe, StampLogEntry, StopOption } from "@/lib/types/crawls"
import { StampMethodBadge } from "@/components/admin/crawls/stamp-method-badge"
import { StampVerifiedIndicator } from "@/components/admin/crawls/stamp-verified-indicator"
import { GrantManualStampDialog } from "@/components/admin/crawls/grant-manual-stamp-dialog"
import { RevokeStampDialog } from "@/components/admin/crawls/revoke-stamp-dialog"
import { RestoreStampDialog } from "@/components/admin/crawls/restore-stamp-dialog"
import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 8

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStopLabel(stopId: string, stops: CrawlStopWithCafe[]) {
  const stop = stops.find((s) => s.id === stopId)
  if (!stop) return "Unknown"
  return `Stop ${stop.stop_order} · ${stop.cafe_name}`
}

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase()
}

export function StampsLogTab({
  crawlId,
  stops,
  initialStampLogs,
  stopOptions,
}: {
  crawlId: string
  stops: CrawlStopWithCafe[]
  initialStampLogs: StampLogEntry[]
  stopOptions: StopOption[]
}) {
  const router = useRouter()
  const params = useSearchParams()

  const search = params.get("search") ?? ""
  const stopFilter = params.get("stop") ?? "all"
  const methodFilter = params.get("method") ?? "all"
  const verifiedFilter = params.get("verified") ?? "all"
  const dateFrom = params.get("from") ?? ""
  const dateTo = params.get("to") ?? ""

  const [stamps, setStamps] = React.useState<StampLogEntry[]>(initialStampLogs)

  const [flaggedIds, setFlaggedIds] = React.useState<Set<string>>(new Set())

  const [grantOpen, setGrantOpen] = React.useState(false)
  const [revokingStamp, setRevokingStamp] =
    React.useState<StampLogEntry | null>(null)
  const [restoringStamp, setRestoringStamp] =
    React.useState<StampLogEntry | null>(null)

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value && value !== "all") {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    router.push(`/admin/crawls/${crawlId}?${p.toString()}`, { scroll: false })
  }

  const filtered = React.useMemo(() => {
    let result = [...stamps]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.username.toLowerCase().includes(q) ||
          s.cafe_name.toLowerCase().includes(q),
      )
    }

    if (stopFilter !== "all") {
      result = result.filter((s) => s.stop_id === stopFilter)
    }

    if (methodFilter !== "all") {
      result = result.filter((s) => s.claim_method === methodFilter)
    }

    if (verifiedFilter !== "all") {
      if (verifiedFilter === "verified") {
        result = result.filter((s) => s.is_verified)
      } else if (verifiedFilter === "unverified") {
        result = result.filter((s) => !s.is_verified)
      } else if (verifiedFilter === "flagged") {
        result = result.filter((s) => flaggedIds.has(s.id))
      }
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((s) => new Date(s.claimed_at) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((s) => new Date(s.claimed_at) <= to)
    }

    return result
  }, [stamps, search, stopFilter, methodFilter, verifiedFilter, dateFrom, dateTo, flaggedIds])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(Number(params.get("page") ?? "1"), totalPages)
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const hasActiveFilters =
    search || stopFilter !== "all" || methodFilter !== "all" ||
    verifiedFilter !== "all" || dateFrom || dateTo

  function clearFilters() {
    router.push(`/admin/crawls/${crawlId}`, { scroll: false })
  }

  function setPage(page: number) {
    const p = new URLSearchParams(params.toString())
    if (page > 1) p.set("page", String(page))
    else p.delete("page")
    router.push(`/admin/crawls/${crawlId}?${p.toString()}`, { scroll: false })
  }

  async function getAccessToken(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function handleRevoke(
    stampId: string,
    note: string,
  ): Promise<string | null> {
    const token = await getAccessToken()
    if (!token) {
      toast.error("Not authenticated")
      return null
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-revoke-stamp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stamp_id: stampId,
            verification_note: note,
            admin_id: (await createClient().auth.getSession()).data.session?.user.id,
          }),
        },
      )

      const body = await res.json()

      if (!res.ok) {
        return body.error ?? "Failed to revoke stamp"
      }

      const stampRow = stamps.find((s) => s.id === stampId)
      const username = stampRow?.username ?? "Unknown"

      setStamps((prev) =>
        prev.map((s) =>
          s.id === stampId
            ? { ...s, is_verified: false, verification_note: note }
            : s,
        ),
      )

      toast.success(
        `Stamp revoked. ${username}'s tier has been re-evaluated.`,
      )
      return null
    } catch {
      toast.error("Something went wrong")
      return "Something went wrong"
    }
  }

  async function handleRestore(
    stampId: string,
    note?: string,
  ): Promise<string | null> {
    const token = await getAccessToken()
    if (!token) {
      toast.error("Not authenticated")
      return null
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-restore-stamp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stamp_id: stampId,
            verification_note: note ?? null,
            admin_id: (await createClient().auth.getSession()).data.session?.user.id,
          }),
        },
      )

      const body = await res.json()

      if (!res.ok) {
        return body.error ?? "Failed to restore stamp"
      }

      const stampRow = stamps.find((s) => s.id === stampId)
      const username = stampRow?.username ?? "Unknown"

      setStamps((prev) =>
        prev.map((s) =>
          s.id === stampId
            ? {
                ...s,
                is_verified: true,
                verification_note: note ?? s.verification_note,
              }
            : s,
        ),
      )

      toast.success(
        `Stamp restored. ${username}'s tier has been re-evaluated.`,
      )
      return null
    } catch {
      toast.error("Something went wrong")
      return "Something went wrong"
    }
  }

  function handleGrant(newStamp: StampLogEntry) {
    setStamps((prev) => [newStamp, ...prev])
  }

  function toggleFlag(stampId: string) {
    setFlaggedIds((prev) => {
      const next = new Set(prev)
      if (next.has(stampId)) {
        next.delete(stampId)
      } else {
        next.add(stampId)
      }
      return next
    })
  }

  const hasResults = paginated.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stamps Log</h2>
        <Button size="sm" onClick={() => setGrantOpen(true)}>
          Grant Manual Stamp
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by username or cafe..."
            value={search}
            onChange={(e) => {
              setParam("search", e.target.value)
              setPage(1)
            }}
          />
        </div>

        <Select
          value={stopFilter}
          onValueChange={(v) => {
            setParam("stop", v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All stops" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stops</SelectItem>
            {stopOptions.map((stop) => (
              <SelectItem key={stop.id} value={stop.id}>
                Stop {stop.stop_order} · {stop.cafe_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={methodFilter}
          onValueChange={(v) => {
            setParam("method", v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="qr">QR</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="redemption">Redemption</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={verifiedFilter}
          onValueChange={(v) => {
            setParam("verified", v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setParam("from", e.target.value)
            setPage(1)
          }}
          className="w-[140px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setParam("to", e.target.value)
            setPage(1)
          }}
          className="w-[140px]"
          aria-label="To date"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">User</TableHead>
            <TableHead>Stop</TableHead>
            <TableHead>Claimed At</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>GPS</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Verification Note</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasResults ? (
            paginated.map((stamp) => {
              const isSuspicious =
                stamp.distance_meters > 200 ||
                (stamp.distance_meters == null &&
                  stamp.claim_method === "qr")
              const isFlagged = flaggedIds.has(stamp.id)
              return (
                <TableRow
                  key={stamp.id}
                  className={cn(
                    isSuspicious &&
                      "bg-amber-50/50 dark:bg-amber-950/20",
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        {stamp.avatar_url ? (
                          <img
                            src={stamp.avatar_url}
                            alt={stamp.username}
                            className="size-full rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-[10px]">
                            {getInitials(stamp.username)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm font-medium">
                        {stamp.username}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {getStopLabel(stamp.stop_id, stops)}
                  </TableCell>

                  <TableCell className="text-xs whitespace-nowrap">
                    {formatTimestamp(stamp.claimed_at)}
                  </TableCell>

                  <TableCell>
                    <StampMethodBadge method={stamp.claim_method} />
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isSuspicious && "text-destructive",
                      )}
                    >
                      {stamp.distance_meters != null
                        ? `${stamp.distance_meters}m`
                        : "—"}
                      {isSuspicious && (
                        <span
                          className="ml-1 text-destructive"
                          title="Suspicious distance"
                        >
                          ⚠
                        </span>
                      )}
                    </span>
                  </TableCell>

                  <TableCell>
                    {stamp.claim_lat != null && stamp.claim_lng != null ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {stamp.claim_lat.toFixed(4)},{" "}
                            {stamp.claim_lng.toFixed(4)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>
                            Claim: {stamp.claim_lat.toFixed(4)},{" "}
                            {stamp.claim_lng.toFixed(4)}
                          </p>
                          <p>
                            Cafe: {stamp.cafe_lat.toFixed(4)},{" "}
                            {stamp.cafe_lng.toFixed(4)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <StampVerifiedIndicator
                      isVerified={stamp.is_verified}
                    />
                  </TableCell>

                  <TableCell>
                    {stamp.verification_note ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[180px] truncate text-xs cursor-help">
                            {stamp.verification_note}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          align="start"
                          className="max-w-xs text-xs"
                        >
                          {stamp.verification_note}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {stamp.is_verified ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRevokingStamp(stamp)}
                            >
                              <Prohibit className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="size-7 text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={() => setRestoringStamp(stamp)}
                            >
                              <ArrowCounterClockwise className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restore</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className={cn(
                              "size-7",
                              isFlagged
                                ? "text-amber-600"
                                : "text-muted-foreground",
                            )}
                            onClick={() => toggleFlag(stamp.id)}
                          >
                            {isFlagged ? (
                              <FlagBanner
                                className="size-3.5"
                                weight="fill"
                              />
                            ) : (
                              <Flag className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isFlagged
                            ? "Remove flag"
                            : "Flag as suspicious"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground py-12"
              >
                <div className="flex flex-col items-center gap-2">
                  {stamps.length === 0 ? (
                    <p>No stamps claimed yet.</p>
                  ) : (
                    <>
                      <p>No stamps match your filters.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {hasResults ? (safePage - 1) * PAGE_SIZE + 1 : 0}
          -
          {hasResults
            ? Math.min(
                (safePage - 1) * PAGE_SIZE + paginated.length,
                filtered.length,
              )
            : 0}{" "}
          of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : safePage} of{" "}
            {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(safePage + 1)}
            disabled={totalPages === 0 || safePage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <GrantManualStampDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        crawlId={crawlId}
        stopOptions={stopOptions}
        onGrant={handleGrant}
      />

      <RevokeStampDialog
        stamp={revokingStamp}
        open={revokingStamp !== null}
        onOpenChange={() => setRevokingStamp(null)}
        onRevoke={handleRevoke}
      />

      <RestoreStampDialog
        stamp={restoringStamp}
        open={restoringStamp !== null}
        onOpenChange={() => setRestoringStamp(null)}
        onRestore={handleRestore}
      />
    </div>
  )
}
