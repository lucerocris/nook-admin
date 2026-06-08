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
import { MOCK_USERS, MOCK_STAMPS } from "@/components/admin/crawls/stamps-mock-data"
import type { MockCrawlStop } from "@/components/admin/crawls/mock-data"

export function GrantManualStampDialog({
  open,
  onOpenChange,
  stops,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stops: MockCrawlStop[]
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [selectedStopId, setSelectedStopId] = React.useState<string | null>(null)
  const [verificationNote, setVerificationNote] = React.useState("")
  const [successState, setSuccessState] = React.useState<{
    username: string
    tierName: string
  } | null>(null)

  const [userSearchOpen, setUserSearchOpen] = React.useState(false)
  const [stopSearchOpen, setStopSearchOpen] = React.useState(false)

  const selectedUser = MOCK_USERS.find((u) => u.id === selectedUserId)
  const selectedStop = stops.find((s) => s.id === selectedStopId)

  const MIN_NOTE_LENGTH = 15

  const duplicateStamp = React.useMemo(() => {
    if (!selectedUserId || !selectedStopId) return null
    return (
      MOCK_STAMPS.find(
        (s) => s.user_id === selectedUserId && s.stop_id === selectedStopId
      ) ?? null
    )
  }, [selectedUserId, selectedStopId])

  const isFormValid =
    selectedUserId &&
    selectedStopId &&
    verificationNote.trim().length >= MIN_NOTE_LENGTH &&
    !duplicateStamp

  function resetForm() {
    setSelectedUserId(null)
    setSelectedStopId(null)
    setVerificationNote("")
    setSuccessState(null)
  }

  function handleSubmit() {
    if (!isFormValid || !selectedUser || !selectedStop) return
    const tierName =
      stops.find((s) => s.id === selectedStop.id)?.tier ?? "City Explorer"
    setSuccessState({
      username: selectedUser.username,
      tierName,
    })
    toast.success("Manual stamp granted")
  }

  function handleClose() {
    resetForm()
    onOpenChange(false)
  }

  const activeStops = stops.filter((s) => s.is_active)

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
                holds: {successState.tierName}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* User selector */}
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
                      !selectedUserId && "text-muted-foreground"
                    )}
                  >
                    {selectedUser
                      ? `@${selectedUser.username}`
                      : "Search by username or email..."}
                    <CaretDown className="size-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {MOCK_USERS.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.username}
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
                                  : "opacity-0"
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

            {/* Stop selector */}
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
                      !selectedStopId && "text-muted-foreground"
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
                        {activeStops.map((stop) => (
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
                                  : "opacity-0"
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

            {/* Verification note */}
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

            {/* Duplicate warning */}
            {duplicateStamp && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950">
                <WarningCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-900 dark:text-amber-100">
                  This user has already claimed this stop on{" "}
                  {new Date(
                    duplicateStamp.claimed_at
                  ).toLocaleDateString()}
                  . Submitting will fail.
                </p>
              </div>
            )}

            {/* Confirmation summary */}
            {selectedUserId && selectedStopId && !duplicateStamp && (
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
            <Button disabled={!isFormValid} onClick={handleSubmit}>
              Grant Stamp & Check Tiers
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
