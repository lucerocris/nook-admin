"use client"

// Manual award (design.md › Page skeletons › Short task form): one centred
// column of numbered steps — user, achievement, note — then a summary line and
// the action button. No rail and no save bar; it's a one-shot task.

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  CaretUpDown,
  Check,
  CheckCircle,
  ImageSquare,
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
import { Field, FormPageHeader } from "@/components/admin/form-kit"
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type DuplicateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "clean" }
  | { kind: "duplicate"; earnedAt: string }
  | { kind: "error"; message: string }

const PAGE = "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
const COLUMN = "mx-auto w-full max-w-2xl"
// Combobox triggers: 44px on phones, matching inputs on desktop.
const TRIGGER =
  "h-11 w-full justify-between px-3 font-normal sm:h-10 aria-invalid:border-destructive"

/** One numbered block in the column. A hairline separates it from the one above. */
function Step({
  n,
  id,
  title,
  description,
  children,
}: {
  n: number
  id: string
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 border-t py-8 first:border-t-0 first:pt-2"
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground"
        >
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-[15px] leading-6 font-semibold">
            <span className="sr-only">Step {n}: </span>
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:pl-9">{children}</div>
    </section>
  )
}

function UserAvatar({ profile, size }: { profile: Profile; size: "sm" | "md" }) {
  const box = size === "sm" ? "size-6" : "size-7"
  return (
    <span
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
      )}
    >
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className={cn(box, "rounded-full object-cover")} />
      ) : (
        <User className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      )}
    </span>
  )
}

function BadgeThumb({ achievement, size }: { achievement: AchievementDef; size: "sm" | "md" }) {
  const box = size === "sm" ? "size-6" : "size-7"
  return (
    <span
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground/40",
      )}
    >
      {achievement.badge_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={achievement.badge_image_url} alt="" className={cn(box, "rounded object-cover")} />
      ) : (
        <ImageSquare className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      )}
    </span>
  )
}

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
  // Set on the first award attempt; from then on missing fields show errors
  // under themselves instead of waiting quietly.
  const [attempted, setAttempted] = React.useState(false)

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

  // Whenever both a user and an achievement are chosen, ask the server whether
  // that user already has it — an achievement can only be awarded once.
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

  // ---- Validation -------------------------------------------------------
  // Per-field errors. "Missing" errors wait for the first attempt; problems
  // the admin can't see otherwise (duplicate, future date) show straight away.

  const earnedAtInFuture = !!earnedAt && new Date(earnedAt) > new Date()

  const userError = attempted && !selectedUser ? "Choose a user." : null

  const achievementError = !selectedAchievement
    ? attempted
      ? "Choose an achievement."
      : null
    : duplicateStatus.kind === "duplicate" && selectedUser
      ? `${selectedUser.username} already earned this on ${formatDate(duplicateStatus.earnedAt)}. An achievement can only be awarded once.`
      : duplicateStatus.kind === "error"
        ? `Couldn’t check whether they already have it: ${duplicateStatus.message}`
        : null

  const earnedAtError = !earnedAt
    ? attempted
      ? "Pick when it was earned."
      : null
    : earnedAtInFuture
      ? "The date can’t be in the future."
      : null

  /** First thing stopping the award, in step order, or null when ready. */
  const blocker: { message: string; focusId: string } | null = !selectedUser
    ? { message: "Choose a user in step 1.", focusId: "award-user" }
    : !selectedAchievement
      ? { message: "Choose an achievement in step 2.", focusId: "award-achievement" }
      : duplicateStatus.kind === "checking" || duplicateStatus.kind === "idle"
        ? { message: "Checking whether they already have it…", focusId: "award-achievement" }
        : duplicateStatus.kind === "duplicate"
          ? { message: "They already have this achievement.", focusId: "award-achievement" }
          : duplicateStatus.kind === "error"
            ? { message: "Couldn’t check for an existing award.", focusId: "award-achievement" }
            : !earnedAt
              ? { message: "Pick when it was earned in step 3.", focusId: "award-earned-at" }
              : earnedAtInFuture
                ? { message: "The date in step 3 can’t be in the future.", focusId: "award-earned-at" }
                : null

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
    setAttempted(false)
    setDuplicateStatus({ kind: "idle" })
  }

  async function handleSubmit() {
    // The button stays enabled so it can explain what's missing: show the
    // field errors and move focus to the first problem instead of awarding.
    if (!canSubmit || !selectedUser || !selectedAchievement) {
      setAttempted(true)
      if (blocker && duplicateStatus.kind !== "checking") {
        document.getElementById(blocker.focusId)?.focus()
      }
      return
    }

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

  // ---- Success ----------------------------------------------------------

  if (submitted && selectedUser && selectedAchievement) {
    return (
      <div className={PAGE}>
        <FormPageHeader
          backHref="/admin/achievements"
          backLabel="Achievements"
          title="Award an achievement"
        />
        <div className={COLUMN}>
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-xl border px-6 py-12 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="size-6 text-emerald-700" aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Achievement awarded</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedUser.username}</span>{" "}
                now has{" "}
                <span className="font-medium text-foreground">{selectedAchievement.name}</span>.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={handleAwardAnother}>
                Award another
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/achievements">Back to achievements</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Form -------------------------------------------------------------

  return (
    <div className={PAGE}>
      <FormPageHeader
        backHref="/admin/achievements"
        backLabel="Achievements"
        title="Award an achievement"
      />

      <div className={COLUMN}>
        <p className="mb-6 text-sm text-muted-foreground">
          Give someone an achievement by hand. It’s recorded with source{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs">manual</span>.
        </p>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* 1 · User */}
          <Step n={1} id="step-user" title="Choose the user">
            <Field label="User" htmlFor="award-user" error={userError}>
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="award-user"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={userOpen}
                    aria-invalid={!!userError || undefined}
                    aria-describedby={userError ? "award-user-hint" : undefined}
                    className={TRIGGER}
                  >
                    {selectedUser ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <UserAvatar profile={selectedUser} size="sm" />
                        <span className="truncate text-sm">{selectedUser.username}</span>
                        {selectedUser.full_name && (
                          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                            {selectedUser.full_name}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Search by username or email
                      </span>
                    )}
                    <CaretUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) min-w-[min(320px,calc(100vw-2rem))] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search users"
                      value={searchQuery}
                      onValueChange={handleUserSearch}
                      className="h-11 text-base sm:h-10 sm:text-sm"
                    />
                    <CommandList>
                      {searching && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Searching…
                        </div>
                      )}
                      {!searching && users.length === 0 && searchQuery.length >= 2 && (
                        <CommandEmpty>No users match that.</CommandEmpty>
                      )}
                      {!searching && searchQuery.length < 2 && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Type at least 2 characters to search.
                        </div>
                      )}
                      <CommandGroup>
                        {users.map((profile) => (
                          <CommandItem
                            key={profile.id}
                            value={profile.id}
                            className="min-h-11"
                            onSelect={() => {
                              setSelectedUser(profile)
                              setUserOpen(false)
                            }}
                          >
                            <UserAvatar profile={profile} size="md" />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-sm font-medium">
                                {profile.username}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {profile.full_name ?? profile.email}
                              </span>
                            </span>
                            <Check
                              aria-hidden
                              className={cn(
                                "ml-auto size-4 shrink-0",
                                selectedUser?.id === profile.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>
          </Step>

          {/* 2 · Achievement */}
          <Step n={2} id="step-achievement" title="Choose the achievement">
            <Field
              label="Achievement"
              htmlFor="award-achievement"
              error={achievementError}
              hint={
                selectedUser && selectedAchievement ? (
                  duplicateStatus.kind === "checking" ? (
                    "Checking whether they already have it…"
                  ) : duplicateStatus.kind === "clean" ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="size-3.5 shrink-0 text-emerald-700" aria-hidden />
                      {selectedUser.username} doesn’t have this yet.
                    </span>
                  ) : null
                ) : null
              }
            >
              <Popover open={achievementOpen} onOpenChange={setAchievementOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="award-achievement"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={achievementOpen}
                    aria-invalid={!!achievementError || undefined}
                    aria-describedby={achievementError || (selectedUser && selectedAchievement) ? "award-achievement-hint" : undefined}
                    className={TRIGGER}
                  >
                    {selectedAchievement ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <BadgeThumb achievement={selectedAchievement} size="sm" />
                        <span className="truncate text-sm">{selectedAchievement.name}</span>
                        <CategoryBadge
                          category={selectedAchievement.category}
                          className="hidden sm:inline-flex"
                        />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Search by name or slug
                      </span>
                    )}
                    <CaretUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) min-w-[min(320px,calc(100vw-2rem))] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search achievements"
                      className="h-11 text-base sm:h-10 sm:text-sm"
                    />
                    <CommandList>
                      <CommandEmpty>No achievements match that.</CommandEmpty>
                      <CommandGroup>
                        {initialAchievements.map((achievement) => (
                          <CommandItem
                            key={achievement.id}
                            value={`${achievement.name} ${achievement.slug}`}
                            className="min-h-11"
                            onSelect={() => {
                              setSelectedAchievement(achievement)
                              setAchievementOpen(false)
                            }}
                          >
                            <BadgeThumb achievement={achievement} size="md" />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium">
                                {achievement.name}
                              </span>
                              <span className="truncate font-mono text-xs text-muted-foreground">
                                {achievement.slug}
                              </span>
                            </span>
                            <CategoryBadge category={achievement.category} />
                            <Check
                              aria-hidden
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
            </Field>

            {/* What the chosen achievement is, so the admin can confirm it's the right one. */}
            {selectedAchievement && (
              <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{selectedAchievement.name}</span>
                  <CategoryBadge category={selectedAchievement.category} />
                  {selectedAchievement.is_limited_edition && (
                    <span className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Limited edition
                    </span>
                  )}
                </div>
                {selectedAchievement.description && (
                  <p className="text-[13px] text-muted-foreground">
                    {selectedAchievement.description}
                  </p>
                )}
              </div>
            )}
          </Step>

          {/* 3 · Note and date */}
          <Step
            n={3}
            id="step-note"
            title="Add a note"
            description="Say why, for whoever reads the history later."
          >
            <Field label="Note" htmlFor="award-note" optional>
              <Textarea
                id="award-note"
                placeholder="Reason for the manual award"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[88px] resize-none text-base sm:text-sm"
              />
            </Field>
            <Field
              label="Earned on"
              htmlFor="award-earned-at"
              error={earnedAtError}
              hint="Defaults to now. Can’t be in the future."
            >
              <Input
                id="award-earned-at"
                type="datetime-local"
                value={earnedAt}
                onChange={(e) => setEarnedAt(e.target.value)}
                max={nowLocalISO()}
                aria-invalid={!!earnedAtError || undefined}
                aria-describedby="award-earned-at-hint"
                className="h-11 text-base sm:h-9 sm:max-w-xs sm:text-sm"
              />
            </Field>
          </Step>

          {/* Summary + action */}
          <div className="flex flex-col gap-4 border-t pt-6">
            <p className="text-sm" aria-live="polite">
              {selectedUser && selectedAchievement ? (
                <>
                  You’re awarding{" "}
                  <span className="font-medium">{selectedAchievement.name}</span> to{" "}
                  <span className="font-medium">{selectedUser.username}</span>.
                </>
              ) : (
                <span className="text-muted-foreground">
                  Choose a user and an achievement to continue.
                </span>
              )}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                loading={saving}
                loadingText="Awarding…"
                aria-describedby={blocker && attempted ? "award-blocker" : undefined}
                className="w-full sm:w-auto"
              >
                Award achievement
              </Button>
              {blocker && attempted && (
                <p
                  id="award-blocker"
                  role="status"
                  className={cn(
                    "text-[13px]",
                    duplicateStatus.kind === "checking" && selectedUser && selectedAchievement
                      ? "text-muted-foreground"
                      : "text-destructive",
                  )}
                >
                  {blocker.message}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
