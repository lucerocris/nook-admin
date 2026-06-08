"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CrawlStatusBadge } from "@/components/admin/crawls/crawl-status-badge"
import { OverviewTab } from "@/components/admin/crawls/overview-tab"
import { StopsTab } from "@/components/admin/crawls/stops-tab"
import { TiersTab } from "@/components/admin/crawls/tiers-tab"
import {
  MOCK_CRAWLS,
  MOCK_TIERS,
  MOCK_STOPS,
  type MockCrawl,
  type MockCrawlTier,
  type MockCrawlStop,
  type CrawlStatus,
} from "@/components/admin/crawls/mock-data"

export function CrawlDetailClient({ crawlId }: { crawlId: string }) {
  const crawl = MOCK_CRAWLS.find((c) => c.id === crawlId) ?? MOCK_CRAWLS[0]
  const tiers = MOCK_TIERS.filter((t) => t.crawl_id === crawl.id)
  const stops = MOCK_STOPS.filter((s) => s.crawl_id === crawl.id)

  const [currentCrawl, setCurrentCrawl] = React.useState(crawl)
  const [isFeatured, setIsFeatured] = React.useState(crawl.is_featured)
  const [isPending, startTransition] = React.useTransition()

  function handleStatusChange(newStatus: CrawlStatus) {
    startTransition(async () => {
      setCurrentCrawl((prev) => ({ ...prev, status: newStatus }))
      const label =
        newStatus === "active"
          ? "activated"
          : newStatus === "completed"
            ? "completed"
            : "cancelled"
      toast.success(`Crawl ${label}`)
    })
  }

  function handleFeaturedToggle(checked: boolean) {
    setIsFeatured(checked)
    setCurrentCrawl((prev) => ({ ...prev, is_featured: checked }))
    toast.success(checked ? "Crawl featured" : "Crawl unfeatured")
  }

  const statusActionLabel =
    currentCrawl.status === "draft"
      ? "Activate"
      : currentCrawl.status === "active"
        ? "Mark Completed"
        : null

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/crawls">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {currentCrawl.title}
              </h1>
              <CrawlStatusBadge status={currentCrawl.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="detail-featured"
              checked={isFeatured}
              onCheckedChange={handleFeaturedToggle}
              disabled={isPending}
            />
            <label
              htmlFor="detail-featured"
              className="text-sm cursor-pointer"
            >
              Featured
            </label>
          </div>
          {statusActionLabel && (
            <Button
              variant={
                currentCrawl.status === "draft" ? "default" : "outline"
              }
              disabled={isPending}
              onClick={() =>
                handleStatusChange(
                  currentCrawl.status === "draft" ? "active" : "completed"
                )
              }
            >
              {statusActionLabel}
            </Button>
          )}
          {currentCrawl.status !== "cancelled" && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => handleStatusChange("cancelled")}
            >
              Cancel Crawl
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" variant="line">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stops">Stops</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab crawl={currentCrawl} tiers={tiers} />
        </TabsContent>
        <TabsContent value="stops" className="pt-4">
          <StopsTab stops={stops} />
        </TabsContent>
        <TabsContent value="tiers" className="pt-4">
          <TiersTab tiers={tiers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
