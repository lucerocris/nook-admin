"use client"

import * as React from "react"
import {
  Plus,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThree } from "@phosphor-icons/react"
import type { MockCrawlTier } from "@/components/admin/crawls/mock-data"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function TierRow({
  tier,
  onEdit,
  onDelete,
}: {
  tier: MockCrawlTier
  onEdit: (tier: MockCrawlTier) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <Badge variant="secondary" className="size-6 rounded-full p-0 flex items-center justify-center text-xs shrink-0">
        {tier.tier_order}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{tier.name}</span>
          <span className="text-xs text-muted-foreground">({tier.slug})</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {tier.required_tier_tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic mt-1">
          {tier.completion_copy}
        </p>
      </div>
      {tier.badge_image_url && (
        <div
          className="size-8 rounded-full bg-muted bg-cover bg-center shrink-0"
          style={{ backgroundImage: `url(${tier.badge_image_url})` }}
          aria-hidden="true"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            <DotsThree weight="bold" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(tier)}>
            <PencilSimple />
            Edit
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                onDelete(tier.id)
              }}
            >
              <Trash />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function TiersTab({
  tiers: initialTiers,
}: {
  tiers: MockCrawlTier[]
}) {
  const [tiers, setTiers] = React.useState(initialTiers)
  const [isPending, startTransition] = React.useTransition()
  const [addOpen, setAddOpen] = React.useState(false)
  const [editingTier, setEditingTier] = React.useState<MockCrawlTier | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [completionCopy, setCompletionCopy] = React.useState("")
  const [tierOrder, setTierOrder] = React.useState("")
  const [requiredTags, setRequiredTags] = React.useState("")
  const [badgeUrl, setBadgeUrl] = React.useState("")
  const [slugAuto, setSlugAuto] = React.useState(true)

  const sorted = [...tiers].sort((a, b) => a.tier_order - b.tier_order)

  const hasGaps = React.useMemo(() => {
    const orders = tiers.map((t) => t.tier_order).sort((a, b) => a - b)
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) return true
    }
    return false
  }, [tiers])

  function resetForm() {
    setName("")
    setSlug("")
    setDescription("")
    setCompletionCopy("")
    setTierOrder("")
    setRequiredTags("")
    setBadgeUrl("")
    setSlugAuto(true)
  }

  function openAdd() {
    resetForm()
    setTierOrder(String(sorted.length + 1))
    setAddOpen(true)
  }

  function openEdit(tier: MockCrawlTier) {
    setEditingTier(tier)
    setName(tier.name)
    setSlug(tier.slug)
    setDescription(tier.description)
    setCompletionCopy(tier.completion_copy)
    setTierOrder(String(tier.tier_order))
    setRequiredTags(tier.required_tier_tags.join(", "))
    setBadgeUrl(tier.badge_image_url ?? "")
    setSlugAuto(false)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (slugAuto) {
      setSlug(slugify(value))
    }
  }

  function handleSave() {
    startTransition(async () => {
      const tags = requiredTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      if (editingTier) {
        setTiers((prev) =>
          prev.map((t) =>
            t.id === editingTier.id
              ? {
                  ...t,
                  name,
                  slug,
                  description,
                  completion_copy: completionCopy,
                  tier_order: Number(tierOrder),
                  required_tier_tags: tags,
                  badge_image_url: badgeUrl || null,
                }
              : t
          )
        )
        setEditingTier(null)
        toast.success("Tier updated")
      } else {
        const newTier: MockCrawlTier = {
          id: "tier-new-" + Date.now(),
          crawl_id: tiers[0]?.crawl_id ?? "",
          name,
          slug,
          description,
          completion_copy: completionCopy,
          tier_order: Number(tierOrder),
          required_tier_tags: tags,
          badge_image_url: badgeUrl || null,
        }
        setTiers((prev) => [...prev, newTier])
        setAddOpen(false)
        toast.success("Tier added")
      }
      resetForm()
    })
  }

  function handleDelete() {
    if (!deletingId) return
    startTransition(async () => {
      setTiers((prev) => prev.filter((t) => t.id !== deletingId))
      setDeletingId(null)
      toast.success("Tier deleted")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {hasGaps && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <WarningCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Tier order has gaps or conflicts
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              Tiers should be sequentially ordered starting from 1. Edit tier
              orders to resolve.
            </p>
          </div>
        </div>
      )}

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={() => setDeletingId(null)}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Tiers ({tiers.length})
              </CardTitle>
              <Button size="sm" onClick={openAdd}>
                <Plus />
                Add Tier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tiers defined yet. Add one to define completion milestones.
              </p>
            ) : (
              <div>
                {sorted.map((tier) => (
                  <TierRow
                    key={tier.id}
                    tier={tier}
                    onEdit={openEdit}
                    onDelete={(id) => setDeletingId(id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this tier definition. Stops assigned
              to this tier will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tier</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input
                placeholder="e.g. City Explorer"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Slug</label>
              <Input
                placeholder="city-explorer"
                value={slug}
                onChange={(e) => {
                  setSlugAuto(false)
                  setSlug(e.target.value)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                placeholder="Describe this tier..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Completion Copy</label>
              <Input
                placeholder="e.g. You've conquered the city!"
                value={completionCopy}
                onChange={(e) => setCompletionCopy(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Tier Order</label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={tierOrder}
                onChange={(e) => setTierOrder(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Required Tier Tags
              </label>
              <Input
                placeholder="city, metro, south, north"
                value={requiredTags}
                onChange={(e) => setRequiredTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Must match the tier tag used in Stops.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Badge Image URL</label>
              <Input
                placeholder="https://example.com/badge.png"
                value={badgeUrl}
                onChange={(e) => setBadgeUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !slug.trim() || isPending}
              onClick={handleSave}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTier !== null}
        onOpenChange={() => setEditingTier(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tier</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Slug</label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugAuto(false)
                  setSlug(e.target.value)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Completion Copy</label>
              <Input
                value={completionCopy}
                onChange={(e) => setCompletionCopy(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Tier Order</label>
              <Input
                type="number"
                min={1}
                value={tierOrder}
                onChange={(e) => setTierOrder(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Required Tier Tags
              </label>
              <Input
                value={requiredTags}
                onChange={(e) => setRequiredTags(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Badge Image URL</label>
              <Input
                value={badgeUrl}
                onChange={(e) => setBadgeUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTier(null)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleSave}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
