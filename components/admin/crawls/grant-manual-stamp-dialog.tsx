"use client"

import * as React from "react"
import {
  Check,
  CaretDown,
  WarningCircle,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { StopOption, StampLogEntry, ProfileSearchResult } from "@/lib/types/crawls"
import { searchProfilesAction, checkDuplicateStampAction } from "@/app/admin/crawls/actions"
import { createClient } from "@/lib/supabase/client"

export function GrantManualStampDialog({
  open,
  onOpenChange,
  crawlId,
  stopOptions,
  onGrant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  crawlId: string
  stopOptions: StopOption[]
  onGrant: (stamp: StampLogEntry) => void
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [selectedStopId, setSelectedStopId] = React.useState<string | null>(null)
  const [verificationNote, setVerificationNote] = React.useState("")
  const [successState, setSuccessState] = React.useState<{
    username: string
    tierName: string | null
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [userSearchOpen, setUserSearchOpen] = React.useState(false)
  const [stopSearchOpen, setStopSearchOpen] = React.useState(false)

  const [searchResults, setSearchResults] = React.useState<ProfileSearchResult[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)

  const [duplicateWarning, setDuplicateWarning] = React.useState<{
    id: string
    claimed_at: string
  } | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = React.useState(false)

  const selectedUser = searchResults.find((u) => u.id === selectedUserId) ?? null
  const selectedStop = stopOptions.find((s) => s.id === selectedStopId) ?? null

  const MIN_NOTE_LENGTH = 15

  const isFormValid =
    selectedUserId &&
    selectedStopId &&
    verificationNote.trim().length >= MIN_NOTE_LENGTH &&
    !duplicateWarning

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleSearchInput(value: string) {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchProfilesAction(value.trim())
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (selectedUserId && selectedStopId) {
      setCheckingDuplicate(true)
      setDuplicateWarning(null)
      checkDuplicateStampAction(selectedStopId, selectedUserId)
        .then((result) => {
          setDuplicateWarning(result)
        })
        .catch(() => {
          setDuplicateWarning(null)
        })
        .finally(() => {
          setCheckingDuplicate(false)
        })
    } else {
      setDuplicateWarning(null)
    }
  }, [selectedUserId, selectedStopId])

  function resetForm() {
    setSelectedUserId(null)
    setSelectedStopId(null)
    setVerificationNote("")
    setSuccessState(null)
    setError(null)
    setDuplicateWarning(null)
    setSearchQuery("")
    setSearchResults([])
  }

  async function handleSubmit() {
    if (!isFormValid || !selectedUser || !selectedStop) return
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const adminId = session?.user.id

    if (!token || !adminId) {
      setError("Not authenticated")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-grant-stamp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crawl_id: crawlId,
            stop_id: selectedStopId,
            cafe_id: selectedStop.cafe_id,
            user_id: selectedUserId,
            verification_note: verificationNote.trim(),
            admin_id: adminId,
          }),
        },
      )

      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? "Failed to grant stamp")
        setSubmitting(false)
        return
      }

      const newStamp: StampLogEntry = {
        ...body.stamp,
        username: selectedUser.username,
        avatar_url: selectedUser.avatar_url,
        cafe_name: selectedStop.cafe_name,
        cafe_lat: 0,
        cafe_lng: 0,
        stop_order: selectedStop.stop_order,
        stop_label: selectedStop.label,
        tier: selectedStop.tier,
      }

      setSuccessState({
        username: selectedUser.username,
        tierName: body.tier_name ?? null,
      })

      onGrant(newStamp)
      setSubmitting(false)
    } catch {
      setError("Something went wrong")
      setSubmitting(false)
    }
  }

  function handleClose() {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose()
        else onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant Manual Stamp</DialogTitle>
        </DialogHeader>

        {successState ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Check className="size-6 text-green-600" weight="bold" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Stamp granted</p>
              <p className="text-xs text-muted-foreground">
                Tier completion checked. @{successState.username} currently
                holds: {successState.tierName ?? "No tier yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <WarningCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">User</label>
              <Popover
                open={userSearchOpen}
                onOpenChange={setUserSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className={cn(
                      "justify-between text-xs font-normal",
                      !selectedUserId && "text-muted-foreground",
                    )}
                  >
                    {selectedUser
                      ? `@${selectedUser.username}`
                      : "Search by username or email..."}
                    <CaretDown className="size-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search users..."
                      value={searchQuery}
                      onValueChange={handleSearchInput}
                    />
                    <CommandList>
                      {searching ? (
                        <CommandEmpty>Searching...</CommandEmpty>
                      ) : (
                        <CommandEmpty>No users found.</CommandEmpty>
                      )}
                      <CommandGroup>
                        {searchResults.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={() => {
                              setSelectedUserId(user.id)
                              setUserSearchOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "size-3",
                                selectedUserId === user.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            @{user.username}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Stop</label>
              <Popover
                open={stopSearchOpen}
                onOpenChange={setStopSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={stopSearchOpen}
                    className={cn(
                      "justify-between text-xs font-normal",
                      !selectedStopId && "text-muted-foreground",
                    )}
                  >
                    {selectedStop
                      ? `Stop ${selectedStop.stop_order} · ${selectedStop.cafe_name} (${selectedStop.tier})`
                      : "Select a stop..."}
                    <CaretDown className="size-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search stops..." />
                    <CommandList>
                      <CommandEmpty>No stops found.</CommandEmpty>
                      <CommandGroup>
                        {stopOptions.map((stop) => (
                          <CommandItem
                            key={stop.id}
                            value={`${stop.cafe_name} ${stop.stop_order}`}
                            onSelect={() => {
                              setSelectedStopId(stop.id)
                              setStopSearchOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "size-3",
                                selectedStopId === stop.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Stop {stop.stop_order} · {stop.cafe_name} (
                            {stop.tier})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {checkingDuplicate && (
              <p className="text-xs text-muted-foreground">
                Checking for duplicates...
              </p>
            )}
            {duplicateWarning && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <WarningCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-100">
                  <p className="font-medium">Duplicate stamp detected</p>
                  <p className="mt-1">
                    This user already has a stamp for this stop (claimed{" "}
                    {new Date(
                      duplicateWarning.claimed_at,
                    ).toLocaleDateString()}
                    ). Granting another will fail.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Verification Note{" "}
                <span className="text-muted-foreground font-normal">
                  (required)
                </span>
              </label>
              <Textarea
                placeholder="QR standee damaged. Owner confirmed visit via DM. Admin: [your name]"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {verificationNote.trim().length < MIN_NOTE_LENGTH
                  ? `Be specific — include proof source and your name (min ${MIN_NOTE_LENGTH} chars)`
                  : "Note looks good"}
              </p>
            </div>

            {selectedUserId && selectedStopId && (
              <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                You are granting a manual stamp to{" "}
                <span className="font-medium text-foreground">
                  @{selectedUser?.username}
                </span>{" "}
                for{" "}
                <span className="font-medium text-foreground">
                  Stop {selectedStop?.stop_order} ·{" "}
                  {selectedStop?.cafe_name}
                </span>
                . This action will be logged and their tier completion will
                be re-evaluated.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {successState ? "Close" : "Cancel"}
          </Button>
          {!successState && (
            <Button
              disabled={!isFormValid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Granting..." : "Grant Stamp & Check Tiers"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
