"use client"

import * as React from "react"
import { SealCheck, WarningCircle } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Crawl, CrawlTier, CrawlStats } from "@/lib/types/crawls"
import { updateCrawlAction, checkSlugUniquenessAction } from "@/app/admin/crawls/actions"

function toDatetimeLocalValue(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value)
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`
}

export function OverviewTab({
  crawl,
  tiers,
  stats,
}: {
  crawl: Crawl
  tiers: CrawlTier[]
  stats: CrawlStats
}) {
  const [title, setTitle] = React.useState(crawl.title)
  const [description, setDescription] = React.useState(crawl.description ?? "")
  const [slug, setSlug] = React.useState(crawl.slug)
  const [slugError, setSlugError] = React.useState("")
  const [city, setCity] = React.useState(crawl.city)
  const [startsAt, setStartsAt] = React.useState(toDatetimeLocalValue(crawl.starts_at))
  const [endsAt, setEndsAt] = React.useState(toDatetimeLocalValue(crawl.ends_at))
  const [coverImageUrl, setCoverImageUrl] = React.useState(
    crawl.cover_image_url ?? ""
  )
  const [stampTemplateUrl, setStampTemplateUrl] = React.useState(
    crawl.stamp_template_url ?? ""
  )
  const [dateError, setDateError] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const initial = React.useMemo(
    () => ({
      title: crawl.title,
      description: crawl.description ?? "",
      slug: crawl.slug,
      city: crawl.city,
      startsAt: toDatetimeLocalValue(crawl.starts_at),
      endsAt: toDatetimeLocalValue(crawl.ends_at),
      coverImageUrl: crawl.cover_image_url ?? "",
      stampTemplateUrl: crawl.stamp_template_url ?? "",
    }),
    [crawl],
  )

  const isDirty =
    title !== initial.title ||
    description !== initial.description ||
    slug !== initial.slug ||
    city !== initial.city ||
    startsAt !== initial.startsAt ||
    endsAt !== initial.endsAt ||
    coverImageUrl !== initial.coverImageUrl ||
    stampTemplateUrl !== initial.stampTemplateUrl

  function validateDates(): boolean {
    if (!startsAt || !endsAt) {
      setDateError("Both dates are required")
      return false
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setDateError("End date must be after start date")
      return false
    }
    setDateError("")
    return true
  }

  async function handleSlugBlur() {
    if (!slug.trim() || slug === initial.slug) {
      setSlugError("")
      return
    }
    const result = await checkSlugUniquenessAction(slug, crawl.id)
    if (result.taken) {
      setSlugError("This slug is already in use")
    } else {
      setSlugError("")
    }
  }

  function handleSave() {
    if (!validateDates()) return
    if (slugError) return

    startTransition(async () => {
      const payload: Record<string, unknown> = {}
      if (title !== initial.title) payload.title = title
      if (description !== initial.description) payload.description = description || null
      if (slug !== initial.slug) payload.slug = slug
      if (city !== initial.city) payload.city = city
      if (startsAt !== initial.startsAt) payload.starts_at = fromDatetimeLocalValue(startsAt)
      if (endsAt !== initial.endsAt) payload.ends_at = fromDatetimeLocalValue(endsAt)
      if (coverImageUrl !== initial.coverImageUrl) payload.cover_image_url = coverImageUrl || null
      if (stampTemplateUrl !== initial.stampTemplateUrl) payload.stamp_template_url = stampTemplateUrl || null

      const result = await updateCrawlAction(crawl.id, payload)
      if (result.success) {
        toast.success("Crawl updated")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Slug</label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugError("")
            }}
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
              onChange={(e) => {
                setStartsAt(e.target.value)
                setDateError("")
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">End Date</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => {
                setEndsAt(e.target.value)
                setDateError("")
              }}
            />
          </div>
        </div>
        {dateError && (
          <p className="text-xs text-destructive">{dateError}</p>
        )}

        {!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt) ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
            <WarningCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-800 dark:text-amber-200">
                End date must be after start date
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Cover Image URL</label>
          <Input
            placeholder="https://example.com/image.jpg"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
          />
          {coverImageUrl && (
            <div
              className="mt-2 size-32 rounded-md bg-muted bg-cover bg-center border"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Stamp Template</label>
          <Input
            placeholder="https://example.com/stamp-template.png"
            value={stampTemplateUrl}
            onChange={(e) => setStampTemplateUrl(e.target.value)}
          />
          {stampTemplateUrl ? (
            <div
              className="mt-2 size-[120px] rounded-full bg-muted bg-cover bg-center border"
              style={{ backgroundImage: `url(${stampTemplateUrl})` }}
              aria-hidden="true"
            />
          ) : (
            <div className="mt-2 size-[120px] rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <SealCheck className="size-6" />
              <span className="text-xs">No template yet</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This template wraps each cafe's logo when a user claims a stop.
          </p>
        </div>

        <div className="pt-2">
          <Button disabled={!isDirty || !!slugError || !!dateError || isPending} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Summary Stats</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Registrants</p>
              <p className="text-2xl font-semibold">
                {stats.totalRegistrants.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Total Stamps Claimed
              </p>
              <p className="text-2xl font-semibold">
                {stats.totalStamps.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Tier Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {stats.tierBreakdown.length > 0 ? (
                  stats.tierBreakdown.map((tier) => (
                    <div
                      key={tier.name}
                      className="flex items-center justify-between"
                    >
                      <Badge variant="secondary" className="text-xs">
                        {tier.name}
                      </Badge>
                      <span className="text-sm font-medium">
                        {tier.completions.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No tiers defined
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
