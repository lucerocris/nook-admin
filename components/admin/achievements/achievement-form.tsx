"use client"

import * as React from "react"
import { ImageSquare } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { checkSlugAction } from "@/lib/actions/achievements"
import type { AchievementCategory, SourceType, AchievementDef } from "@/lib/types/achievements"

function FieldGroup({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium leading-none">{label}</label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

type FormState = {
  name: string
  slug: string
  description: string
  category: AchievementCategory | ""
  source_type: SourceType | ""
  source_id: string
  badge_image_url: string
  is_limited_edition: boolean
  is_hidden: boolean
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  category: "",
  source_type: "",
  source_id: "",
  badge_image_url: "",
  is_limited_edition: false,
  is_hidden: false,
}

export function AchievementForm({
  editingAchievement,
  onSave,
  onCancel,
  saving = false,
}: {
  editingAchievement: AchievementDef | null
  onSave: (data: FormState) => void
  onCancel: () => void
  saving?: boolean
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false)

  React.useEffect(() => {
    if (editingAchievement) {
      setForm({
        name: editingAchievement.name,
        slug: editingAchievement.slug,
        description: editingAchievement.description ?? "",
        category: editingAchievement.category,
        source_type: editingAchievement.source_type,
        source_id: editingAchievement.source_id ?? "",
        badge_image_url: editingAchievement.badge_image_url ?? "",
        is_limited_edition: editingAchievement.is_limited_edition,
        is_hidden: editingAchievement.is_hidden,
      })
      setSlugManuallyEdited(true)
    } else {
      setForm(emptyForm)
      setSlugManuallyEdited(false)
    }
  }, [editingAchievement])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : toSlug(name),
    }))
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true)
    setForm((prev) => ({ ...prev, slug }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!form.slug.trim()) {
      toast.error("Slug is required")
      return
    }
    if (!form.category) {
      toast.error("Category is required")
      return
    }
    if (!form.source_type) {
      toast.error("Source type is required")
      return
    }

    const result = await checkSlugAction(form.slug, editingAchievement?.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (result.data?.exists) {
      toast.error("Slug is already taken")
      return
    }

    onSave(form)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FieldGroup label="Name">
          <Input
            placeholder="e.g. City Explorer"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </FieldGroup>

        <FieldGroup label="Slug" help="Unique machine identifier. Auto-generated from name if left empty.">
          <Input
            placeholder="e.g. city_explorer"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
          />
        </FieldGroup>

        <FieldGroup label="Description">
          <Textarea
            placeholder="Describe what the user does to earn this achievement..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="resize-none min-h-[80px]"
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Category">
            <Select
              value={form.category}
              onValueChange={(v) => updateField("category", v as AchievementCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crawl">Crawl</SelectItem>
                <SelectItem value="drops">Drops</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="milestones">Milestones</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Source Type">
            <Select
              value={form.source_type}
              onValueChange={(v) => updateField("source_type", v as SourceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crawl_tier">Crawl Tier</SelectItem>
                <SelectItem value="drop_redemption">Drop Redemption</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="streak">Streak</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup
          label="Source ID"
          help="Soft reference to the source record — e.g. crawl_tiers.id"
        >
          <Input
            placeholder="UUID of the source record (optional)"
            value={form.source_id}
            onChange={(e) => updateField("source_id", e.target.value)}
          />
        </FieldGroup>

        <FieldGroup label="Badge Image URL">
          <Input
            placeholder="https://..."
            value={form.badge_image_url}
            onChange={(e) => updateField("badge_image_url", e.target.value)}
          />
          <div className="mt-1.5 flex items-center gap-2">
            {form.badge_image_url ? (
              <img
                src={form.badge_image_url}
                alt="Badge preview"
                className="size-10 rounded object-cover border"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="size-10 rounded border bg-muted flex items-center justify-center text-muted-foreground/40">
                <ImageSquare className="size-5" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {form.badge_image_url ? "Live preview" : "No image set"}
            </span>
          </div>
        </FieldGroup>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Limited Edition</span>
            <span className="text-xs text-muted-foreground">
              Show a &quot;Limited Edition&quot; indicator on the badge
            </span>
          </div>
          <Switch
            checked={form.is_limited_edition}
            onCheckedChange={(v) => updateField("is_limited_edition", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Hidden</span>
            <span className="text-xs text-muted-foreground">
              Hidden achievements don&apos;t show in the public catalog until earned
            </span>
          </div>
          <Switch
            checked={form.is_hidden}
            onCheckedChange={(v) => updateField("is_hidden", v)}
          />
        </div>
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? "Saving..."
            : editingAchievement
              ? "Save Changes"
              : "Create Achievement"}
        </Button>
      </SheetFooter>
    </div>
  )
}
