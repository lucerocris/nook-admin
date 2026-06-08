"use client"

import * as React from "react"
import {
  DotsSixVertical,
  Plus,
  Trash,
  MagnifyingGlass,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import type { CrawlStopWithCafe, CrawlStatus } from "@/lib/types/crawls"
import {
  addCrawlStopAction,
  updateCrawlStopAction,
  removeCrawlStopAction,
  reorderStopsAction,
  searchCafesAction,
} from "@/app/admin/crawls/actions"

const TIER_OPTIONS = ["city", "metro", "south", "north", "east", "west"]

function StopRow({
  stop,
  index,
  isPending,
  onToggleActive,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  stop: CrawlStopWithCafe
  index: number
  isPending: boolean
  onToggleActive: (id: string) => void
  onRemove: (id: string) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: (e: React.DragEvent) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b last:border-0",
        !stop.is_active && "opacity-50"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
        <DotsSixVertical className="size-4 text-muted-foreground/30 shrink-0" />
      </div>
      <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
        {stop.stop_order}
      </span>
      <span className="text-sm font-medium flex-1 truncate">
        {stop.cafe_name}
      </span>
      <Badge variant="outline" className="text-xs font-normal">
        {stop.tier}
      </Badge>
      {stop.label && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[120px]">
          {stop.label}
        </span>
      )}
      <Switch
        checked={stop.is_active}
        onCheckedChange={() => onToggleActive(stop.id)}
        disabled={isPending}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 hover:text-destructive"
        disabled={isPending}
        onClick={() => onRemove(stop.id)}
      >
        <Trash className="size-3.5" />
      </Button>
    </div>
  )
}

export function StopsTab({
  crawlId,
  stops: initialStops,
  crawlStatus,
}: {
  crawlId: string
  stops: CrawlStopWithCafe[]
  crawlStatus: CrawlStatus
}) {
  const [stops, setStops] = React.useState(initialStops)
  const [isPending, startTransition] = React.useTransition()
  const [addOpen, setAddOpen] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [removeConfirmId, setRemoveConfirmId] = React.useState<string | null>(null)

  const [cafeSearch, setCafeSearch] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<Array<{ id: string; name: string; address: string | null; neighborhood: string | null }>>([])
  const [selectedCafe, setSelectedCafe] = React.useState<{ id: string; name: string } | null>(null)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const searchRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const [newTier, setNewTier] = React.useState("")
  const [newLabel, setNewLabel] = React.useState("")
  const [newIsActive, setNewIsActive] = React.useState(true)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!cafeSearch.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCafesAction(cafeSearch, crawlId)
        setSearchResults(results)
        setSearchOpen(true)
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cafeSearch, crawlId])

  function handleToggleActive(id: string) {
    const original = stops.find((s) => s.id === id)
    const newActive = !original?.is_active
    setStops((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, is_active: newActive } : s
      )
    )
    startTransition(async () => {
      const result = await updateCrawlStopAction(id, { is_active: newActive })
      if (result.success) {
        toast.success("Stop updated")
      } else {
        setStops((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, is_active: !newActive } : s
          )
        )
        toast.error(result.error)
      }
    })
  }

  function handleRemove(id: string) {
    if (crawlStatus === "active") {
      setRemoveConfirmId(id)
      return
    }
    performRemove(id)
  }

  function performRemove(id: string) {
    setRemoveConfirmId(null)
    const removed = stops.find((s) => s.id === id)
    setStops((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, stop_order: i + 1 }))
    )
    startTransition(async () => {
      const result = await removeCrawlStopAction(id)
      if (result.success) {
        toast.success(`Removed "${removed?.cafe_name}"`)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newStops = [...stops]
    const [moved] = newStops.splice(dragIndex, 1)
    newStops.splice(index, 0, moved)
    setDragIndex(index)
    setStops(newStops)
  }

  function handleDrop(_e: React.DragEvent, _index: number) {
    setDragIndex(null)
    const updates = stops.map((s, i) => ({
      id: s.id,
      stop_order: i + 1,
    }))
    startTransition(async () => {
      const result = await reorderStopsAction(updates)
      if (!result.success) {
        setStops(initialStops)
        toast.error(result.error)
      } else {
        toast.success("Stops reordered")
      }
    })
  }

  function handleDragEnd(_e: React.DragEvent) {
    setDragIndex(null)
  }

  function handleAddStop() {
    if (!selectedCafe || !newTier) return

    const nextOrder = stops.length > 0
      ? Math.max(...stops.map((s) => s.stop_order)) + 1
      : 1

    const optimistic: CrawlStopWithCafe = {
      id: "optimistic-" + Date.now(),
      crawl_id: crawlId,
      cafe_id: selectedCafe.id,
      cafe_name: selectedCafe.name,
      address: null,
      neighborhood: null,
      stop_order: nextOrder,
      tier: newTier,
      is_active: newIsActive,
      label: newLabel || null,
      created_at: new Date().toISOString(),
    }

    setStops((prev) => [...prev, optimistic])
    setAddOpen(false)
    setSelectedCafe(null)
    setCafeSearch("")
    setNewTier("")
    setNewLabel("")
    setNewIsActive(true)

    startTransition(async () => {
      const result = await addCrawlStopAction(crawlId, {
        cafe_id: selectedCafe.id,
        stop_order: nextOrder,
        tier: newTier,
        label: newLabel || null,
      })
      if (result.success) {
        toast.success("Stop added")
      } else {
        setStops((prev) => prev.filter((s) => s.id !== optimistic.id))
        toast.error(result.error)
      }
    })
  }

  function selectCafe(cafe: { id: string; name: string }) {
    setSelectedCafe(cafe)
    setCafeSearch(cafe.name)
    setSearchOpen(false)
  }

  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order)
  const isCrawlActive = crawlStatus === "active"

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Stops ({stops.length})</CardTitle>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus />
                  Add Stop
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Stop</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Cafe</label>
                    <div className="relative" ref={searchRef}>
                      <div className="relative">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={searchInputRef}
                          className="pl-8"
                          placeholder="Search cafes..."
                          value={cafeSearch}
                          onChange={(e) => {
                            setCafeSearch(e.target.value)
                            setSelectedCafe(null)
                          }}
                          onFocus={() => {
                            if (searchResults.length > 0) setSearchOpen(true)
                          }}
                        />
                      </div>
                      {searchOpen && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md z-50 max-h-48 overflow-y-auto">
                          {searchResults.map((cafe) => (
                            <button
                              key={cafe.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => selectCafe(cafe)}
                            >
                              <span className="font-medium">{cafe.name}</span>
                              {(cafe.address || cafe.neighborhood) && (
                                <span className="text-muted-foreground block text-xs">
                                  {[cafe.address, cafe.neighborhood].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedCafe && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {selectedCafe.name}
                        </p>
                      )}
                      {cafeSearch && !selectedCafe && searchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No cafes found
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Tier Tag</label>
                    <Select value={newTier} onValueChange={setNewTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIER_OPTIONS.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Must match a tier tag defined in the Tiers tab (e.g.{" "}
                      {TIER_OPTIONS.join(", ")})
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">
                      Label{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </label>
                    <Input
                      placeholder="e.g. Matcha time"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="new-stop-active"
                      checked={newIsActive}
                      onCheckedChange={setNewIsActive}
                    />
                    <label
                      htmlFor="new-stop-active"
                      className="text-sm cursor-pointer"
                    >
                      Active
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddOpen(false)
                      setSelectedCafe(null)
                      setCafeSearch("")
                      setNewTier("")
                      setNewLabel("")
                      setNewIsActive(true)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedCafe || !newTier || isPending}
                    onClick={handleAddStop}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No stops yet. Add one to get started.
            </p>
          ) : (
            <div>
              {sorted.map((stop, index) => (
                <StopRow
                  key={stop.id}
                  stop={stop}
                  index={index}
                  isPending={isPending}
                  onToggleActive={handleToggleActive}
                  onRemove={handleRemove}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={removeConfirmId !== null}
        onOpenChange={() => setRemoveConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove stop?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing a stop from a live crawl will exclude it from tier
              completion. Users who already claimed this stop keep their stamp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removeConfirmId) performRemove(removeConfirmId)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
