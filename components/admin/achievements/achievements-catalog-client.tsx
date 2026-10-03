"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DotsThree, PencilSimple, Plus, Star, Trophy, UserFocus } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  FilterChips,
  FilterSelect,
  PageHeader,
  SearchField,
  StatusChip,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Thumb,
  Toolbar,
  TR,
  shortDate,
  type ActiveFilter,
} from "@/components/admin/table-kit"
import { CategoryBadge, SourceTypeBadge, categoryLabel, sourceTypeLabel } from "./achievement-badges"
import { AchievementForm } from "./achievement-form"
import type { AchievementDef, AchievementCategory, SourceType } from "@/lib/types/achievements"
import {
  createAchievementAction,
  updateAchievementAction,
} from "@/lib/actions/achievements"

// Category values stay as stored ("crawl" included) even while Crawls are
// hidden from this portal: existing badges still reference them.
const CATEGORIES: AchievementCategory[] = ["crawl", "drops", "social", "milestones", "hidden"]
const SOURCE_TYPES: SourceType[] = ["crawl_tier", "drop_redemption", "manual", "streak", "milestone"]

type Visibility = "all" | "shown" | "hidden"

function awardHref(achievement: AchievementDef) {
  return `/admin/achievements/award?achievement_id=${achievement.id}`
}

function VisibilityChip({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <StatusChip tone="neutral">Hidden until earned</StatusChip>
  ) : (
    <StatusChip tone="success">Shown</StatusChip>
  )
}

function LimitedPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] font-medium">
      <Star weight="fill" className="size-2.5" aria-hidden />
      Limited
    </span>
  )
}

function AchievementActions({
  achievement,
  onEdit,
}: {
  achievement: AchievementDef
  onEdit: (achievement: AchievementDef) => void
}) {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${achievement.name}`}>
          <DotsThree weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(achievement)}>
          <PencilSimple />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(awardHref(achievement))}>
          <UserFocus />
          Award to a user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AchievementsCatalogClient({
  initialAchievements,
}: {
  initialAchievements: AchievementDef[]
}) {
  const router = useRouter()
  // Read the prop directly rather than copying it into state, so the
  // router.refresh() after a save shows the new or edited row.
  const achievements = initialAchievements
  const [visibility, setVisibility] = React.useState<Visibility>("all")
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [sourceTypeFilter, setSourceTypeFilter] = React.useState("all")
  const [limitedFilter, setLimitedFilter] = React.useState("all")

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingAchievement, setEditingAchievement] = React.useState<AchievementDef | null>(null)
  const [saving, setSaving] = React.useState(false)

  const counts = {
    all: achievements.length,
    shown: achievements.filter((a) => !a.is_hidden).length,
    hidden: achievements.filter((a) => a.is_hidden).length,
    limited: achievements.filter((a) => a.is_limited_edition).length,
  }

  const query = search.trim().toLowerCase()
  const filtered = achievements.filter((a) => {
    if (visibility === "shown" && a.is_hidden) return false
    if (visibility === "hidden" && !a.is_hidden) return false
    if (query && !a.name.toLowerCase().includes(query) && !a.slug.toLowerCase().includes(query)) {
      return false
    }
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false
    if (sourceTypeFilter !== "all" && a.source_type !== sourceTypeFilter) return false
    if (limitedFilter === "limited" && !a.is_limited_edition) return false
    if (limitedFilter === "standard" && a.is_limited_edition) return false
    return true
  })

  const filters: ActiveFilter[] = []
  if (query) filters.push({ key: "search", label: "Search", value: `“${search.trim()}”`, onRemove: () => setSearch("") })
  if (categoryFilter !== "all")
    filters.push({ key: "category", label: "Category is", value: categoryLabel(categoryFilter as AchievementCategory), onRemove: () => setCategoryFilter("all") })
  if (sourceTypeFilter !== "all")
    filters.push({ key: "source", label: "Source is", value: sourceTypeLabel(sourceTypeFilter as SourceType), onRemove: () => setSourceTypeFilter("all") })
  if (limitedFilter !== "all")
    filters.push({ key: "limited", label: "Edition", value: limitedFilter === "limited" ? "Limited" : "Standard", onRemove: () => setLimitedFilter("all") })

  function clearFilters() {
    setSearch("")
    setCategoryFilter("all")
    setSourceTypeFilter("all")
    setLimitedFilter("all")
  }

  function openCreate() {
    setEditingAchievement(null)
    setSheetOpen(true)
  }

  function openEdit(achievement: AchievementDef) {
    setEditingAchievement(achievement)
    setSheetOpen(true)
  }

  async function handleSave(formData: {
    name: string
    slug: string
    description: string
    category: AchievementCategory | ""
    source_type: SourceType | ""
    source_id: string
    badge_image_url: string
    is_limited_edition: boolean
    is_hidden: boolean
  }) {
    setSaving(true)
    try {
      const insert = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category as AchievementCategory,
        source_type: formData.source_type as SourceType,
        source_id: formData.source_id || null,
        badge_image_url: formData.badge_image_url || null,
        is_limited_edition: formData.is_limited_edition,
        is_hidden: formData.is_hidden,
      }

      if (editingAchievement) {
        const result = await updateAchievementAction(
          editingAchievement.id,
          insert,
        )
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`${insert.name} saved`)
      } else {
        const result = await createAchievementAction(insert)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`${insert.name} added`)
      }
      setSheetOpen(false)
      router.refresh()
    } catch {
      toast.error("Couldn’t save the achievement. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const empty =
    filtered.length === 0 ? (
      achievements.length === 0 ? (
        <TableEmpty
          icon={Trophy}
          title="No achievements yet"
          body="Achievements you add show up here, ready to earn or award."
          action={
            <Button size="sm" onClick={openCreate}>
              Add achievement
            </Button>
          }
        />
      ) : (
        <TableEmpty
          icon={Trophy}
          title="No achievements match"
          body="Try a different search or fewer filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearFilters()
                setVisibility("all")
              }}
            >
              Clear filters
            </Button>
          }
        />
      )
    ) : undefined

  const summary = [
    `${counts.all.toLocaleString()} ${counts.all === 1 ? "achievement" : "achievements"}`,
    `${counts.hidden.toLocaleString()} hidden until earned`,
    `${counts.limited.toLocaleString()} limited edition`,
  ].join(" · ")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Achievements"
        summary={summary}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/achievements/award">
                <UserFocus aria-hidden />
                Award manually
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Add achievement
            </Button>
          </>
        }
      />

      <StatusTabs
        label="Filter by visibility"
        value={visibility}
        onChange={(v) => setVisibility(v as Visibility)}
        tabs={[
          { value: "all", label: "All", count: counts.all },
          { value: "shown", label: "Shown", count: counts.shown },
          { value: "hidden", label: "Hidden until earned", count: counts.hidden },
        ]}
      />

      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search by name or slug" />
        <FilterSelect
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
        />
        <FilterSelect
          label="Source"
          value={sourceTypeFilter}
          onChange={setSourceTypeFilter}
          options={SOURCE_TYPES.map((s) => ({ value: s, label: sourceTypeLabel(s) }))}
        />
        <FilterSelect
          label="Edition"
          value={limitedFilter}
          onChange={setLimitedFilter}
          allLabel="Any edition"
          options={[
            { value: "limited", label: "Limited" },
            { value: "standard", label: "Standard" },
          ]}
        />
      </Toolbar>

      <FilterChips filters={filters} onClearAll={clearFilters} />

      <TableCard
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={TH}>Achievement</TableHead>
                <TableHead className={TH}>Category</TableHead>
                <TableHead className={TH}>Source</TableHead>
                <TableHead className={TH}>Visibility</TableHead>
                <TableHead className={TH}>Added</TableHead>
                <TableHead className={`${TH} w-12`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((achievement) => (
                <TableRow key={achievement.id} className={TR}>
                  <TableCell className={`${TD} max-w-[24rem]`}>
                    <div className="flex items-center gap-3">
                      <Thumb src={achievement.badge_image_url} />
                      <div className="grid min-w-0 leading-tight">
                        <span className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(achievement)}
                            className="truncate text-left font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {achievement.name}
                          </button>
                          {achievement.is_limited_edition && <LimitedPill />}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">{achievement.slug}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={TD}>
                    <CategoryBadge category={achievement.category} />
                  </TableCell>
                  <TableCell className={TD}>
                    <SourceTypeBadge sourceType={achievement.source_type} />
                  </TableCell>
                  <TableCell className={TD}>
                    <VisibilityChip hidden={achievement.is_hidden} />
                  </TableCell>
                  <TableCell className={`${TD} whitespace-nowrap text-muted-foreground tabular-nums`}>
                    {shortDate(achievement.created_at)}
                  </TableCell>
                  <TableCell className={`${TD} text-right`}>
                    <AchievementActions achievement={achievement} onEdit={openEdit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        list={filtered.map((achievement) => (
          <li key={achievement.id} className="flex items-start gap-3 px-4 py-3">
            <Thumb src={achievement.badge_image_url} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(achievement)}
                  className="min-w-0 truncate text-left text-sm font-medium"
                >
                  {achievement.name}
                </button>
                <VisibilityChip hidden={achievement.is_hidden} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {categoryLabel(achievement.category)} · {sourceTypeLabel(achievement.source_type)}
                {achievement.is_limited_edition && " · Limited"}
                {" · "}
                <span className="font-mono">{achievement.slug}</span>
              </p>
            </div>
            <AchievementActions achievement={achievement} onEdit={openEdit} />
          </li>
        ))}
        footer={
          <TableFooter
            page={1}
            pageSize={Math.max(filtered.length, 1)}
            shown={filtered.length}
            total={filtered.length}
            totalPages={1}
            onPage={() => {}}
            noun={filtered.length === 1 ? "achievement" : "achievements"}
          />
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">
              {editingAchievement ? "Edit achievement" : "Add achievement"}
            </SheetTitle>
            <SheetDescription className="text-[13px]">
              {editingAchievement
                ? "Update the achievement’s details."
                : "Add an achievement to the catalog."}
            </SheetDescription>
          </SheetHeader>
          <AchievementForm
            editingAchievement={editingAchievement}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
