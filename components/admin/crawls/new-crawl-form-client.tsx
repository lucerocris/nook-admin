"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Info } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createCrawlAction, checkSlugUniquenessAction } from "@/app/admin/crawls/actions"

function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value)
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function appendYear(slug: string, startsAt: string): string {
  if (!startsAt) return slug
  const year = new Date(startsAt).getFullYear()
  if (isNaN(year)) return slug
  const yearStr = String(year)
  return slug.endsWith(yearStr) ? slug : `${slug}-${yearStr}`
}

export function NewCrawlFormClient() {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false)
  const [slugError, setSlugError] = React.useState("")
  const [city, setCity] = React.useState("Cebu City")
  const [startsAt, setStartsAt] = React.useState("")
  const [endsAt, setEndsAt] = React.useState("")
  const [coverImageUrl, setCoverImageUrl] = React.useState("")
  const [stampTemplateUrl, setStampTemplateUrl] = React.useState("")
  const [isFeatured, setIsFeatured] = React.useState(false)
  const [dateError, setDateError] = React.useState("")

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(appendYear(slugify(value), startsAt))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true)
    setSlug(value)
    setSlugError("")
  }

  async function handleSlugBlur() {
    if (!slug.trim()) return
    const result = await checkSlugUniquenessAction(slug)
    if (result.taken) {
      setSlugError("This slug is already in use")
    } else {
      setSlugError("")
    }
  }

  function handleStartsAtChange(value: string) {
    setStartsAt(value)
    setDateError("")
    if (!slugManuallyEdited && title.trim()) {
      setSlug(appendYear(slugify(title), value))
    }
  }

  function handleEndsAtChange(value: string) {
    setEndsAt(value)
    setDateError("")
  }

  function validateDates(): boolean {
    if (!startsAt || !endsAt) {
      setDateError("Both start and end dates are required")
      return false
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setDateError("End date must be after start date")
      return false
    }
    setDateError("")
    return true
  }

  function handleSubmit() {
    if (!validateDates()) return
    if (slugError) return

    startTransition(async () => {
      const result = await createCrawlAction({
        title: title.trim(),
        description: description.trim() || null,
        slug: slug.trim(),
        city: city.trim(),
        starts_at: fromDatetimeLocalValue(startsAt),
        ends_at: fromDatetimeLocalValue(endsAt),
        cover_image_url: coverImageUrl.trim() || null,
        stamp_template_url: stampTemplateUrl.trim() || null,
        is_featured: isFeatured,
      })
      if (result.success) {
        toast.success("Crawl created")
        router.push(`/admin/crawls/${result.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  const canSubmit =
    title.trim() &&
    slug.trim() &&
    !slugError &&
    city.trim() &&
    startsAt &&
    endsAt &&
    !dateError

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/crawls">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">New Crawl</h1>
          <p className="text-sm text-muted-foreground">
            Create a new time-limited crawl event
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
        <Info className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-amber-800 dark:text-amber-200">
          This crawl will be saved as <strong>Draft</strong>. You can publish it later from the detail page.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Title</label>
          <Input
            placeholder="e.g. Cebu Island Crawl 2026"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Description</label>
          <Textarea
            placeholder="Describe the crawl event..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Slug</label>
          <Input
            placeholder="cebu-island-crawl-2026"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onBlur={handleSlugBlur}
          />
          {slugError ? (
            <p className="text-xs text-destructive">{slugError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Affects deep links to the crawl
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">City</label>
          <Input
            placeholder="e.g. Cebu City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Start Date</label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => handleStartsAtChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">End Date</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => handleEndsAtChange(e.target.value)}
            />
          </div>
        </div>
        {dateError && (
          <p className="text-xs text-destructive">{dateError}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Cover Image URL</label>
          <Input
            placeholder="https://example.com/image.jpg"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
          />
          {coverImageUrl && (
            <div
              className="mt-2 size-24 rounded-md bg-muted bg-cover bg-center border"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Stamp Template URL</label>
          <Input
            placeholder="https://example.com/stamp-template.png"
            value={stampTemplateUrl}
            onChange={(e) => setStampTemplateUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="is-featured"
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
          />
          <label htmlFor="is-featured" className="text-sm cursor-pointer">
            Feature this crawl
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            disabled={!canSubmit || isPending}
            onClick={handleSubmit}
          >
            Create Crawl
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/crawls">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
