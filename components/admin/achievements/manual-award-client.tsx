"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  CaretUpDown,
  Check,
  MagnifyingGlass,
  WarningCircle,
  CheckCircle,
  ImageSquare,
  ArrowLeft,
  User,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CategoryBadge } from "./achievement-badges"
import type { AchievementDef, Profile } from "@/lib/types/achievements"
import {
  searchUsersAction,
  checkDuplicateAwardAction,
  awardAchievementAction,
} from "@/lib/actions/achievements"

function nowLocalISO() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

type DuplicateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "clean" }
  | { kind: "duplicate"; earnedAt: string }
  | { kind: "error"; message: string }

export function ManualAwardClient({
  initialAchievements,
}: {
  initialAchievements: AchievementDef[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("achievement_id")

  const [selectedUser, setSelectedUser] = React.useState<Profile | null>(null)
  const [selectedAchievement, setSelectedAchievement] =
    React.useState<AchievementDef | null>(null)
  const [note, setNote] = React.useState("")
  const [earnedAt, setEarnedAt] = React.useState(nowLocalISO)
  const [submitted, setSubmitted] = React.useState(false)

  const [userOpen, setUserOpen] = React.useState(false)
  const [achievementOpen, setAchievementOpen] = React.useState(false)

  const [users, setUsers] = React.useState<Profile[]>([])
  const [searching, setSearching] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [duplicateStatus, setDuplicateStatus] = React.useState<DuplicateStatus>({
    kind: "idle",
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (preselectedId) {
      const found = initialAchievements.find((a) => a.id === preselectedId)
      if (found) setSelectedAchievement(found)
    }
  }, [preselectedId, initialAchievements])

  React.useEffect(() => {
    if (!selectedUser || !selectedAchievement) {
      setDuplicateStatus({ kind: "idle" })
      return
    }
    setDuplicateStatus({ kind: "checking" })

    checkDuplicateAwardAction(selectedUser.id, selectedAchievement.id).then(
      (result) => {
        if (!result.success) {
          setDuplicateStatus({ kind: "error", message: result.error })
          return
        }
        if (result.data) {
          setDuplicateStatus({
            kind: "duplicate",
            earnedAt: result.data.earned_at,
          })
        } else {
          setDuplicateStatus({ kind: "clean" })
        }
      },
    )
  }, [selectedUser, selectedAchievement])

  async function handleUserSearch(query: string) {
    setSearchQuery(query)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (query.length < 2) {
      setUsers([])
      return
    }

    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const result = await searchUsersAction(query)
      if (result.success) {
        setUsers(result.data ?? [])
      }
      setSearching(false)
    }, 300)
  }

  const canSubmit =
    selectedUser &&
    selectedAchievement &&
    duplicateStatus.kind === "clean" &&
    earnedAt &&
    new Date(earnedAt) <= new Date() &&
    !saving

  function handleAwardAnother() {
    setSelectedUser(null)
    setSelectedAchievement(null)
    setNote("")
    setEarnedAt(nowLocalISO())
    setSubmitted(false)
    setDuplicateStatus({ kind: "idle" })
  }

  async function handleSubmit() {
    if (!canSubmit || !selectedUser || !selectedAchievement) return

    setSaving(true)
    try {
      const result = await awardAchievementAction({
        user_id: selectedUser.id,
        achievement_id: selectedAchievement.id,
        earned_at: new Date(earnedAt).toISOString(),
        source_type: "manual",
        metadata: note ? { note } : null,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setSubmitted(true)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (submitted && selectedUser && selectedAchievement) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Achievement Awarded</h2>
            <p className="text-muted-foreground text-sm mt-1">
              <span className="font-medium text-foreground">
                {selectedUser.username}
              </span>{" "}
              has been awarded{" "}
              <span className="font-medium text-foreground">
                {selectedAchievement.name}
              </span>
              .
            </p>
          </div>
          <Button variant="outline" onClick={handleAwardAnother}>
            Award Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground"
          onClick={() => window.history.back()}
        >
          <ArrowLeft />
          Back
        </Button>
        <h1 className="text-xl font-semibold">Award Achievement</h1>
        <p className="text-muted-foreground text-sm">
          Manually grant an achievement to a user with{" "}
          <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
            source_type = &quot;manual&quot;
          </span>
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-5">
          {/* User selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium leading-none">User</label>
            <Popover open={userOpen} onOpenChange={setUserOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userOpen}
                  className="justify-between"
                >
                  {selectedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                        {selectedUser.avatar_url ? (
                          <img
                            src={selectedUser.avatar_url}
                            alt=""
                            className="size-6 rounded-full object-cover"
                          />
                        ) : (
                          <User className="size-3" />
                        )}
                      </div>
                      <span className="text-sm">{selectedUser.username}</span>
                      {selectedUser.full_name && (
                        <span className="text-xs text-muted-foreground">
                          ({selectedUser.full_name})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Search by username or email...
                    </span>
                  )}
                  <CaretUpDown className="size-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search users..."
                    value={searchQuery}
                    onValueChange={handleUserSearch}
                  />
                  <CommandList>
                    {searching && (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Searching...
                      </div>
                    )}
                    {!searching && users.length === 0 && searchQuery.length >= 2 && (
                      <CommandEmpty>No users found.</CommandEmpty>
                    )}
                    {!searching && searchQuery.length < 2 && (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Type at least 2 characters to search
                      </div>
                    )}
                    <CommandGroup>
                      {users.map((profile) => (
                        <CommandItem
                          key={profile.id}
                          value={profile.id}
                          onSelect={() => {
                            setSelectedUser(profile)
                            setUserOpen(false)
                          }}
                        >
                          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="size-7 rounded-full object-cover"
                              />
                            ) : (
                              <User className="size-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {profile.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {profile.full_name ?? profile.email}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto size-4",
                              selectedUser?.id === profile.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Achievement selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium leading-none">
              Achievement
            </label>
            <Popover
              open={achievementOpen}
              onOpenChange={setAchievementOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={achievementOpen}
                  className="justify-between"
                >
                  {selectedAchievement ? (
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded border bg-muted flex items-center justify-center text-muted-foreground/40 shrink-0">
                        {selectedAchievement.badge_image_url ? (
                          <img
                            src={selectedAchievement.badge_image_url}
                            alt=""
                            className="size-6 rounded object-cover"
                          />
                        ) : (
                          <ImageSquare className="size-3" />
                        )}
                      </div>
                      <span className="text-sm">
                        {selectedAchievement.name}
                      </span>
                      <CategoryBadge
                        category={selectedAchievement.category}
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Search by name or slug...
                    </span>
                  )}
                  <CaretUpDown className="size-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search achievements..." />
                  <CommandList>
                    <CommandEmpty>
                      No achievements found.
                    </CommandEmpty>
                    <CommandGroup>
                      {initialAchievements.map((achievement) => (
                        <CommandItem
                          key={achievement.id}
                          value={`${achievement.name} ${achievement.slug}`}
                          onSelect={() => {
                            setSelectedAchievement(achievement)
                            setAchievementOpen(false)
                          }}
                        >
                          <div className="size-7 rounded border bg-muted flex items-center justify-center text-muted-foreground/40 shrink-0">
                            {achievement.badge_image_url ? (
                              <img
                                src={achievement.badge_image_url}
                                alt=""
                                className="size-7 rounded object-cover"
                              />
                            ) : (
                              <ImageSquare className="size-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {achievement.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate font-mono">
                              {achievement.slug}
                            </span>
                          </div>
                          <CategoryBadge
                            category={achievement.category}
                          />
                          <Check
                            className={cn(
                              "ml-2 size-4 shrink-0",
                              selectedAchievement?.id === achievement.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected achievement detail card */}
          {selectedAchievement && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedAchievement.name}
                </span>
                <CategoryBadge category={selectedAchievement.category} />
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedAchievement.description}
              </p>
              {selectedAchievement.is_limited_edition && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Limited Edition
                </span>
              )}
            </div>
          )}

          {/* Duplicate check */}
          {selectedUser && selectedAchievement && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
                duplicateStatus.kind === "clean"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                  : duplicateStatus.kind === "duplicate"
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : duplicateStatus.kind === "checking"
                      ? "border-muted bg-muted/30"
                      : "hidden",
              )}
            >
              {duplicateStatus.kind === "checking" ? (
                <span className="text-muted-foreground text-sm">
                  Checking...
                </span>
              ) : duplicateStatus.kind === "clean" ? (
                <>
                  <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-800 dark:text-emerald-200">
                    Ready to award — this user does not yet have this
                    achievement.
                  </span>
                </>
              ) : duplicateStatus.kind === "duplicate" ? (
                <>
                  <WarningCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <span className="text-red-800 dark:text-red-200">
                    Already earned — {selectedUser.username} earned{" "}
                    {selectedAchievement.name} on{" "}
                    {new Date(
                      duplicateStatus.earnedAt,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    . Awarding again is not possible.
                  </span>
                </>
              ) : duplicateStatus.kind === "error" ? (
                <span className="text-red-800 dark:text-red-200 text-sm">
                  {duplicateStatus.message}
                </span>
              ) : null}
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium leading-none">
              Note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="Reason for manual award..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none min-h-[60px]"
            />
          </div>

          {/* Earned At */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium leading-none">
              Earned At
            </label>
            <Input
              type="datetime-local"
              value={earnedAt}
              onChange={(e) => setEarnedAt(e.target.value)}
              max={nowLocalISO()}
            />
          </div>

          {/* Submit */}
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {saving ? "Awarding..." : "Award Achievement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
