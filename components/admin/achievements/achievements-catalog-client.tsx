"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  MagnifyingGlass,
  Plus,
  PencilSimple,
  UserFocus,
  ImageSquare,
  Star,
  EyeSlash,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CategoryBadge, SourceTypeBadge } from "./achievement-badges"
import { AchievementForm } from "./achievement-form"
import type { AchievementDef, AchievementCategory, SourceType } from "@/lib/types/achievements"
import {
  createAchievementAction,
  updateAchievementAction,
} from "@/lib/actions/achievements"

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function BadgeThumbnail({ url }: { url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-10 rounded object-cover border"
      />
    )
  }
  return (
    <div className="size-10 rounded border bg-muted flex items-center justify-center text-muted-foreground/40 shrink-0">
      <ImageSquare className="size-5" />
    </div>
  )
}

export function AchievementsCatalogClient({
  initialAchievements,
}: {
  initialAchievements: AchievementDef[]
}) {
  const router = useRouter()
  const [achievements, setAchievements] = React.useState(initialAchievements)
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [sourceTypeFilter, setSourceTypeFilter] = React.useState("all")
  const [hiddenOnly, setHiddenOnly] = React.useState(false)
  const [limitedOnly, setLimitedOnly] = React.useState(false)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingAchievement, setEditingAchievement] = React.useState<AchievementDef | null>(null)
  const [saving, setSaving] = React.useState(false)

  const filtered = achievements.filter((a) => {
    if (search) {
      const q = search.toLowerCase()
      if (!a.name.toLowerCase().includes(q) && !a.slug.toLowerCase().includes(q)) {
        return false
      }
    }
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false
    if (sourceTypeFilter !== "all" && a.source_type !== sourceTypeFilter) return false
    if (hiddenOnly && !a.is_hidden) return false
    if (limitedOnly && !a.is_limited_edition) return false
    return true
  })

  const hasResults = filtered.length > 0

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
      } else {
        const result = await createAchievementAction(insert)
        if (!result.success) {
          toast.error(result.error)
          return
        }
      }
      setSheetOpen(false)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Achievements</h1>
          <p className="text-muted-foreground text-sm">
            Global achievement catalog — create and manage achievement definitions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          New Achievement
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="crawl">Crawl</SelectItem>
            <SelectItem value="drops">Drops</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="milestones">Milestones</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Source Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="crawl_tier">Crawl Tier</SelectItem>
            <SelectItem value="drop_redemption">Drop Redemption</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
            <SelectItem value="milestone">Milestone</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={hiddenOnly} onCheckedChange={setHiddenOnly} />
            Hidden only
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={limitedOnly} onCheckedChange={setLimitedOnly} />
            Limited edition only
          </label>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[52px]">Badge</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Source Type</TableHead>
            <TableHead className="text-center">Limited</TableHead>
            <TableHead className="text-center">Hidden</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((achievement) => (
            <TableRow key={achievement.id}>
              <TableCell>
                <BadgeThumbnail url={achievement.badge_image_url} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground font-mono text-xs">
                  {achievement.slug}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">{achievement.name}</span>
              </TableCell>
              <TableCell>
                <CategoryBadge category={achievement.category} />
              </TableCell>
              <TableCell>
                <SourceTypeBadge sourceType={achievement.source_type} />
              </TableCell>
              <TableCell className="text-center">
                {achievement.is_limited_edition ? (
                  <Star weight="fill" className="size-4 text-amber-500 inline-block" />
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {achievement.is_hidden ? (
                  <EyeSlash className="size-4 text-muted-foreground inline-block" />
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(achievement.created_at)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(achievement)}
                  >
                    <PencilSimple className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(
                        `/admin/achievements/award?achievement_id=${achievement.id}`,
                      )
                    }
                  >
                    <UserFocus className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!hasResults && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground py-12"
              >
                <div className="flex flex-col items-center gap-3">
                  <p>No achievements found for the selected filters.</p>
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus />
                    Create an Achievement
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingAchievement ? "Edit Achievement" : "New Achievement"}
            </SheetTitle>
            <SheetDescription>
              {editingAchievement
                ? "Update the achievement definition."
                : "Add a new achievement to the global catalog."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AchievementForm
              editingAchievement={editingAchievement}
              onSave={handleSave}
              onCancel={() => setSheetOpen(false)}
              saving={saving}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
