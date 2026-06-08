"use client"

import * as React from "react"
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
import type { MockCrawl, MockCrawlTier } from "@/components/admin/crawls/mock-data"

export function OverviewTab({
  crawl,
  tiers,
}: {
  crawl: MockCrawl
  tiers: MockCrawlTier[]
}) {
  const [title, setTitle] = React.useState(crawl.title)
  const [description, setDescription] = React.useState(crawl.description)
  const [slug, setSlug] = React.useState(crawl.slug)
  const [city, setCity] = React.useState(crawl.city)
  const [startsAt, setStartsAt] = React.useState(crawl.starts_at)
  const [endsAt, setEndsAt] = React.useState(crawl.ends_at)
  const [coverImageUrl, setCoverImageUrl] = React.useState(
    crawl.cover_image_url ?? ""
  )
  const [isPending, startTransition] = React.useTransition()

  function handleSave() {
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      toast.success("Crawl updated")
    })
  }

  const mockStats = {
    totalRegistrants: 1234,
    totalStamps: 8901,
    tierBreakdown: tiers.map((t) => ({
      name: t.name,
      completed: Math.floor(Math.random() * 500) + 100,
    })),
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
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Affects deep links to the crawl
          </p>
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
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">End Date</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

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

        <div className="pt-2">
          <Button disabled={isPending} onClick={handleSave}>
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
                {mockStats.totalRegistrants.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Total Stamps Claimed
              </p>
              <p className="text-2xl font-semibold">
                {mockStats.totalStamps.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Tier Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {mockStats.tierBreakdown.map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center justify-between"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {tier.name}
                    </Badge>
                    <span className="text-sm font-medium">
                      {tier.completed.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
