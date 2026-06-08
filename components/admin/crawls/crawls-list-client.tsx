"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus,
  DotsThree,
  PencilSimple,
  Eye,
  ArrowLineRight,
  CheckCircle,
  Prohibit,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CrawlStatusBadge } from "@/components/admin/crawls/crawl-status-badge"
import type { MockCrawl, CrawlStatus } from "@/components/admin/crawls/mock-data"

function formatDateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`
}

function CrawlActions({
  crawl,
  onStatusChange,
}: {
  crawl: MockCrawl
  onStatusChange: (id: string, status: CrawlStatus) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function handleStatusChange(newStatus: CrawlStatus) {
    startTransition(async () => {
      onStatusChange(crawl.id, newStatus)
      toast.success(`Crawl ${newStatus === "active" ? "activated" : newStatus === "completed" ? "completed" : "cancelled"}`)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <DotsThree weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/crawls/${crawl.id}`)}>
          <PencilSimple />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/crawls/${crawl.id}`)}>
          <Eye />
          View Detail
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {crawl.status === "draft" && (
          <DropdownMenuItem onClick={() => handleStatusChange("active")}>
            <ArrowLineRight />
            Activate
          </DropdownMenuItem>
        )}
        {crawl.status === "active" && (
          <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
            <CheckCircle />
            Complete
          </DropdownMenuItem>
        )}
        {(crawl.status === "draft" || crawl.status === "active") && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleStatusChange("cancelled")}
          >
            <Prohibit />
            Cancel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CrawlsListClient({ crawls: initialCrawls }: { crawls: MockCrawl[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [crawls, setCrawls] = React.useState(initialCrawls)

  const statusFilter = params.get("status") ?? "all"

  function updateFilterParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value && value !== "all") {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    router.push(`/admin/crawls?${p.toString()}`)
  }

  function handleStatusChange(id: string, newStatus: CrawlStatus) {
    setCrawls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    )
  }

  function handleFeaturedToggle(id: string, featured: boolean) {
    setCrawls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_featured: featured } : c))
    )
    toast.success(featured ? "Crawl featured" : "Crawl unfeatured")
  }

  const filtered = crawls.filter(
    (c) => statusFilter === "all" || c.status === statusFilter
  )
  const hasResults = filtered.length > 0

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Crawls</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage time-limited cafe crawl events
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/crawls/new">
            <Plus />
            New Crawl
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          defaultValue={params.get("status") ?? "all"}
          onValueChange={(value) => updateFilterParam("status", value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Crawl</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead className="text-center">Stops</TableHead>
            <TableHead className="text-center">Featured</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((crawl) => (
            <TableRow key={crawl.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {crawl.cover_image_url ? (
                    <div
                      className="size-10 rounded-md bg-muted shrink-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${crawl.cover_image_url})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="size-10 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground/40 text-[10px] font-medium" aria-hidden="true">
                      CRAWL
                    </div>
                  )}
                  <div className="flex flex-col">
                    <Link
                      href={`/admin/crawls/${crawl.id}`}
                      className="font-medium text-sm hover:underline underline-offset-2"
                    >
                      {crawl.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {crawl.slug}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <CrawlStatusBadge status={crawl.status} />
              </TableCell>
              <TableCell>{crawl.city}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDateRange(crawl.starts_at, crawl.ends_at)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="text-xs">
                  {crawl.total_stops}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={crawl.is_featured}
                  onCheckedChange={(checked) =>
                    handleFeaturedToggle(crawl.id, checked)
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <CrawlActions
                  crawl={crawl}
                  onStatusChange={handleStatusChange}
                />
              </TableCell>
            </TableRow>
          ))}
          {!hasResults && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-12"
              >
                <div className="flex flex-col items-center gap-3">
                  <p>No crawls found for the selected filter.</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/crawls/new">
                      <Plus />
                      Create a Crawl
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
