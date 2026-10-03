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
import { DrawerFooter, Field } from "@/components/admin/form-kit"
import { checkSlugAction } from "@/lib/actions/achievements"
import type { AchievementCategory, SourceType, AchievementDef } from "@/lib/types/achievements"
import { categoryLabel, sourceTypeLabel } from "./achievement-badges"

const CATEGORIES: AchievementCategory[] = ["crawl", "drops", "social", "milestones", "hidden"]
const SOURCE_TYPES: SourceType[] = ["crawl_tier", "drop_redemption", "manual", "streak", "milestone"]

const INPUT_CLASS = "text-base sm:text-sm"
const SELECT_CLASS = "w-full text-base data-[size=default]:h-10 sm:text-sm sm:data-[size=default]:h-9"

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

type FieldErrors = Partial<Record<"name" | "slug" | "category" | "source_type", string>>

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

/** A short label over a group of fields inside the drawer. */
function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** A switch with its label and one line of explanation, the whole row clickable. */
function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

/** Body and sticky footer of the add/edit achievement drawer. The drawer's
 *  header lives in the catalog page; this renders the <form> beneath it so
 *  Enter submits. */
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
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [checking, setChecking] = React.useState(false)

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
    setErrors({})
  }, [editingAchievement])

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === "category" || key === "source_type") clearError(key)
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : toSlug(name),
    }))
    clearError("name")
    if (!slugManuallyEdited) clearError("slug")
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true)
    setForm((prev) => ({ ...prev, slug }))
    clearError("slug")
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving || checking) return

    const next: FieldErrors = {}
    if (!form.name.trim()) next.name = "Add a name."
    if (!form.slug.trim()) next.slug = "Add a slug."
    if (!form.category) next.category = "Choose a category."
    if (!form.source_type) next.source_type = "Choose how it’s earned."
    if (Object.keys(next).length > 0) {
      setErrors(next)
      focusFirstError(next)
      return
    }

    setChecking(true)
    try {
      const result = await checkSlugAction(form.slug, editingAchievement?.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (result.data?.exists) {
        setErrors({ slug: "Another achievement already uses this slug." })
        focusFirstError({ slug: "taken" })
        return
      }
    } finally {
      setChecking(false)
    }

    onSave(form)
  }

  const busy = saving || checking

  return (
    <form onSubmit={handleSave} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <FormGroup title="Basics">
          <Field label="Name" htmlFor="achievement-name" error={errors.name}>
            <Input
              id="achievement-name"
              placeholder="e.g. City Explorer"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              aria-invalid={!!errors.name || undefined}
              aria-describedby={errors.name ? "achievement-name-hint" : undefined}
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="achievement-slug"
            error={errors.slug}
            hint="Unique ID the app uses. Filled in from the name until you edit it."
          >
            <Input
              id="achievement-slug"
              placeholder="e.g. city_explorer"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              aria-invalid={!!errors.slug || undefined}
              aria-describedby="achievement-slug-hint"
              autoComplete="off"
              spellCheck={false}
              className={`font-mono ${INPUT_CLASS}`}
            />
          </Field>

          <Field label="Description" htmlFor="achievement-description" optional>
            <Textarea
              id="achievement-description"
              placeholder="What does someone do to earn this?"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="min-h-[80px] resize-none text-base sm:text-sm md:text-sm"
            />
          </Field>
        </FormGroup>

        <FormGroup title="How it’s earned">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="achievement-category" error={errors.category}>
              <Select
                value={form.category}
                onValueChange={(v) => updateField("category", v as AchievementCategory)}
              >
                <SelectTrigger
                  id="achievement-category"
                  aria-invalid={!!errors.category || undefined}
                  className={SELECT_CLASS}
                >
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Source type" htmlFor="achievement-source-type" error={errors.source_type}>
              <Select
                value={form.source_type}
                onValueChange={(v) => updateField("source_type", v as SourceType)}
              >
                <SelectTrigger
                  id="achievement-source-type"
                  aria-invalid={!!errors.source_type || undefined}
                  className={SELECT_CLASS}
                >
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {sourceTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Source ID"
            htmlFor="achievement-source-id"
            optional
            hint="Soft reference to the source record, e.g. crawl_tiers.id"
          >
            <Input
              id="achievement-source-id"
              placeholder="UUID of the source record"
              value={form.source_id}
              onChange={(e) => updateField("source_id", e.target.value)}
              aria-describedby="achievement-source-id-hint"
              autoComplete="off"
              spellCheck={false}
              className={`font-mono ${INPUT_CLASS}`}
            />
          </Field>
        </FormGroup>

        <FormGroup title="Display">
          <Field label="Badge image URL" htmlFor="achievement-badge-url" optional>
            <Input
              id="achievement-badge-url"
              type="url"
              placeholder="https://…"
              value={form.badge_image_url}
              onChange={(e) => updateField("badge_image_url", e.target.value)}
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <div className="mt-1.5 flex items-center gap-2">
              {form.badge_image_url ? (
                <img
                  src={form.badge_image_url}
                  alt="Badge preview"
                  className="size-10 rounded border object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded border bg-muted text-muted-foreground/40">
                  <ImageSquare className="size-5" aria-hidden />
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {form.badge_image_url ? "Live preview" : "No image set"}
              </span>
            </div>
          </Field>

          <SwitchRow
            id="achievement-limited"
            label="Limited edition"
            description="Shows a “Limited edition” mark on the badge."
            checked={form.is_limited_edition}
            onCheckedChange={(v) => updateField("is_limited_edition", v)}
          />

          <SwitchRow
            id="achievement-hidden"
            label="Hidden"
            description="Stays out of the public catalog until someone earns it."
            checked={form.is_hidden}
            onCheckedChange={(v) => updateField("is_hidden", v)}
          />
        </FormGroup>
      </div>

      <DrawerFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {editingAchievement ? "Save achievement" : "Add achievement"}
        </Button>
      </DrawerFooter>
    </form>
  )
}

const FIELD_IDS: Record<keyof FieldErrors, string> = {
  name: "achievement-name",
  slug: "achievement-slug",
  category: "achievement-category",
  source_type: "achievement-source-type",
}

/** Move focus to the first field (in form order) that has an error. */
function focusFirstError(errors: FieldErrors) {
  const first = (Object.keys(FIELD_IDS) as (keyof FieldErrors)[]).find((k) => errors[k])
  if (first) document.getElementById(FIELD_IDS[first])?.focus()
}
