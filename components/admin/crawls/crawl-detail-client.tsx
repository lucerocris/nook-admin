"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { StampsLogTab } from "@/components/admin/crawls/stamps-log-tab"
import type {
  Crawl,
  CrawlTier,
  CrawlStopWithCafe,
  CrawlStats,
  CrawlStatus,
  StampLogEntry,
  StopOption,
} from "@/lib/types/crawls"
import { updateCrawlStatusAction, toggleFeaturedAction } from "@/app/admin/crawls/actions"

export function CrawlDetailClient({
  crawl: initialCrawl,
  stops: initialStops,
  tiers: initialTiers,
  stats: initialStats,
  stampLogs: initialStampLogs,
  stopOptions: initialStopOptions,
}: {
  crawl: Crawl
  stops: CrawlStopWithCafe[]
  tiers: CrawlTier[]
  stats: CrawlStats
  stampLogs: StampLogEntry[]
  stopOptions: StopOption[]
}) {
  const [currentCrawl, setCurrentCrawl] = React.useState(initialCrawl)
  const [isFeatured, setIsFeatured] = React.useState(initialCrawl.is_featured)
  const [isPending, startTransition] = React.useTransition()
  const [activateOpen, setActivateOpen] = React.useState(false)

  async function handleStatusChange(newStatus: CrawlStatus) {
    if (newStatus === "active") {
      setActivateOpen(true)
      return
    }

    startTransition(async () => {
      const result = await updateCrawlStatusAction(currentCrawl.id, newStatus)
      if (result.success) {
        setCurrentCrawl((prev) => ({ ...prev, status: newStatus }))
        const label =
          newStatus === "completed" ? "completed" : "cancelled"
        toast.success(`Crawl ${label}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleActivateConfirm() {
    setActivateOpen(false)
    startTransition(async () => {
      const result = await updateCrawlStatusAction(currentCrawl.id, "active")
      if (result.success) {
        setCurrentCrawl((prev) => ({ ...prev, status: "active" }))
        toast.success("Crawl activated")
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleFeaturedToggle(checked: boolean) {
    setIsFeatured(checked)
    setCurrentCrawl((prev) => ({ ...prev, is_featured: checked }))
    const result = await toggleFeaturedAction(currentCrawl.id, checked)
    if (result.success) {
      toast.success(checked ? "Crawl featured" : "Crawl unfeatured")
    } else {
      setIsFeatured(!checked)
      setCurrentCrawl((prev) => ({ ...prev, is_featured: !checked }))
      toast.error(result.error)
    }
  }

  const canActivate = currentCrawl.status === "draft"
  const canComplete = currentCrawl.status === "active"
  const canCancel = currentCrawl.status === "draft" || currentCrawl.status === "active"

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
          {canActivate && (
            <Button
              variant="default"
              disabled={isPending}
              onClick={() => handleStatusChange("active")}
            >
              Activate
            </Button>
          )}
          {canComplete && (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => handleStatusChange("completed")}
            >
              Mark Completed
            </Button>
          )}
          {canCancel && (
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

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate crawl?</AlertDialogTitle>
            <AlertDialogDescription>
              Once active, this crawl will be visible to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateConfirm}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stops">Stops</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="stamps">Stamps</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab crawl={currentCrawl} tiers={initialTiers} stats={initialStats} />
        </TabsContent>
        <TabsContent value="stops" className="pt-4">
          <StopsTab
            crawlId={currentCrawl.id}
            stops={initialStops}
            crawlStatus={currentCrawl.status}
          />
        </TabsContent>
        <TabsContent value="tiers" className="pt-4">
          <TiersTab
            tiers={initialTiers}
            crawlId={currentCrawl.id}
            crawlStatus={currentCrawl.status}
          />
        </TabsContent>
        <TabsContent value="stamps" className="pt-4">
          <StampsLogTab
            crawlId={currentCrawl.id}
            stops={initialStops}
            initialStampLogs={initialStampLogs}
            stopOptions={initialStopOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
