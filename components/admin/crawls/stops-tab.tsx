"use client"

import * as React from "react"
import {
  DotsSixVertical,
  Plus,
  Trash,
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
import { cn } from "@/lib/utils"
import type { MockCrawlStop } from "@/components/admin/crawls/mock-data"

const MOCK_CAFES = [
  "Cafe Georg",
  "Tamp",
  "Kof",
  "Common Room",
  "Cebu Union",
  "Kuppa",
  "El Sabil",
  "The Good Cup",
  "Bean Bag",
  "Rise & Grind",
]

const TIER_OPTIONS = ["city", "metro", "south", "north", "east", "west"]

function StopRow({
  stop,
  isPending,
  onToggleActive,
  onRemove,
}: {
  stop: MockCrawlStop
  isPending: boolean
  onToggleActive: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b last:border-0",
        !stop.is_active && "opacity-50"
      )}
    >
      <DotsSixVertical className="size-4 text-muted-foreground/30 shrink-0 cursor-grab" />
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
  stops: initialStops,
}: {
  stops: MockCrawlStop[]
}) {
  const [stops, setStops] = React.useState(initialStops)
  const [isPending, startTransition] = React.useTransition()
  const [addOpen, setAddOpen] = React.useState(false)

  const [newCafe, setNewCafe] = React.useState("")
  const [newTier, setNewTier] = React.useState("")
  const [newLabel, setNewLabel] = React.useState("")
  const [newIsActive, setNewIsActive] = React.useState(true)

  const availableTierTags = TIER_OPTIONS

  function handleToggleActive(id: string) {
    startTransition(async () => {
      setStops((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, is_active: !s.is_active } : s
        )
      )
      toast.success("Stop updated")
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const removed = stops.find((s) => s.id === id)
      setStops((prev) =>
        prev
          .filter((s) => s.id !== id)
          .map((s, i) => ({ ...s, stop_order: i + 1 }))
      )
      toast.success(`Removed "${removed?.cafe_name}"`)
    })
  }

  function handleAddStop() {
    if (!newCafe || !newTier) return

    startTransition(async () => {
      const newStop: MockCrawlStop = {
        id: "stop-new-" + Date.now(),
        crawl_id: stops[0]?.crawl_id ?? "",
        cafe_name: newCafe,
        stop_order: stops.length + 1,
        tier: newTier,
        is_active: newIsActive,
        label: newLabel || null,
      }
      setStops((prev) => [...prev, newStop])
      setAddOpen(false)
      setNewCafe("")
      setNewTier("")
      setNewLabel("")
      setNewIsActive(true)
      toast.success("Stop added")
    })
  }

  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order)

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
                    <Select value={newCafe} onValueChange={setNewCafe}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cafe" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_CAFES.map((cafe) => (
                          <SelectItem key={cafe} value={cafe}>
                            {cafe}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Tier Tag</label>
                    <Select value={newTier} onValueChange={setNewTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTierTags.map((tag) => (
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
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!newCafe || !newTier || isPending}
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
              {sorted.map((stop) => (
                <StopRow
                  key={stop.id}
                  stop={stop}
                  isPending={isPending}
                  onToggleActive={handleToggleActive}
                  onRemove={handleRemove}

                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
