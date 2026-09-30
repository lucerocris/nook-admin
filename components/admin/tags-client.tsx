"use client"

import { useState, useTransition } from "react"
import {
  Plus,
  PencilSimple,
  Eye,
  EyeSlash,
  DotsSixVertical,
  Trash,
  Info,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogDescription,
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
import {
  createTagAction,
  updateTagAction,
  toggleTagActiveAction,
  deleteTagAction,
} from "@/app/admin/tags/actions"
import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/queries/tags"
import { PageTitle } from "@/components/admin/page-header"

const categoryOrder = ["best_for", "amenities", "payment", "vibe"]
const categoryLabels: Record<string, string> = {
  best_for: "Best For",
  amenities: "Amenities",
  payment: "Payment Accepted",
  vibe: "Vibe (hidden in app - Phase 2)",
}

function SortableTagRow({
  tag,
  onEdit,
  onToggle,
  onDelete,
  isPending,
}: {
  tag: Tag
  onEdit: (tag: Tag) => void
  onToggle: (tag: Tag) => void
  onDelete: (id: string) => void
  isPending: boolean
}) {
  const usage = tag.cafe_tags?.[0]?.count ?? 0

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b last:border-0",
        !tag.is_active && "opacity-50"
      )}
    >
      <DotsSixVertical className="size-4 text-muted-foreground/30" />

      <span className="text-sm font-medium flex-1">{tag.name}</span>
      <Badge variant="secondary" className="text-xs">
        {usage} cafes
      </Badge>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={() => onEdit(tag)}
        >
          <PencilSimple className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={() => onToggle(tag)}
        >
          {tag.is_active ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeSlash className="size-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-destructive"
          disabled={usage > 0 || isPending}
          title={
            usage > 0
              ? `Used by ${usage} cafes - deactivate instead`
              : "Delete tag"
          }
          onClick={() => onDelete(tag.id)}
        >
          <Trash className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function TagsClient({ tags }: { tags: Tag[] }) {
  const [isPending, startTransition] = useTransition()
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagCategory, setNewTagCategory] = useState("")
  const [newTagIconName, setNewTagIconName] = useState("")
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState("")
  const [editIconName, setEditIconName] = useState("")
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  const grouped = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {} as Record<string, Tag[]>)

  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ]

  async function handleCreateTag() {
    if (!newTagName.trim() || !newTagCategory) return

    startTransition(async () => {
      const result = await createTagAction({
        name: newTagName.trim(),
        category: newTagCategory,
        icon_name: newTagIconName || undefined,
      })

      if (result.success) {
        setAddTagOpen(false)
        setNewTagName("")
        setNewTagCategory("")
        setNewTagIconName("")
        toast.success("Tag created")
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleUpdateTag() {
    if (!editingTag || !editName.trim()) return

    startTransition(async () => {
      const result = await updateTagAction(editingTag.id, {
        name: editName.trim(),
        icon_name: editIconName || undefined,
      })

      if (result.success) {
        setEditingTag(null)
        toast.success("Tag updated")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleToggle(tag: Tag) {
    startTransition(async () => {
      const result = await toggleTagActiveAction(tag.id, !tag.is_active)
      if (result.success) {
        toast.success(tag.is_active ? "Tag deactivated" : "Tag activated")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          eyebrow="Catalog"
          title="Tags"
          lead="Master tag list — all tags used across the app"
        />
        <div className="w-full sm:w-auto">
          <Dialog open={addTagOpen} onOpenChange={setAddTagOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tag</DialogTitle>
                <DialogDescription>
                  Add a new tag to the master list
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Tag name</label>
                  <Input
                    placeholder="e.g. Dog Friendly"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_for">Best For</SelectItem>
                      <SelectItem value="amenities">Amenities</SelectItem>
                      <SelectItem value="payment">Payment Accepted</SelectItem>
                      <SelectItem value="vibe">Vibe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Icon name</label>
                  <Input
                    placeholder="e.g. Coffee, Wifi, Car"
                    value={newTagIconName}
                    onChange={(e) => setNewTagIconName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddTagOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={isPending} onClick={handleCreateTag}>
                  Add Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {orderedCategories.map((categoryKey) => {
          const categoryTags = grouped[categoryKey]
          const title = categoryLabels[categoryKey] ?? categoryKey
          const isVibe = categoryKey === "vibe"

          return (
            <div key={categoryKey}>
              {isVibe && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
                  <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200">
                    Vibe tags are hidden from the app and owner portal until
                    Phase 2. You can tag cafes with these now - they will appear
                    automatically when Phase 2 launches.
                  </p>
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{categoryTags.length} tags</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    {categoryTags.map((tag) => (
                      <SortableTagRow
                        key={tag.id}
                        tag={tag}
                        onEdit={(selectedTag) => {
                          setEditingTag(selectedTag)
                          setEditName(selectedTag.name)
                          setEditIconName(selectedTag.icon_name ?? "")
                        }}
                        onToggle={handleToggle}
                        onDelete={setDeletingTagId}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <Dialog open={editingTag !== null} onOpenChange={() => setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Tag name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Icon name</label>
              <Input
                value={editIconName}
                onChange={(e) => setEditIconName(e.target.value)}
                placeholder="e.g. Coffee, Wifi, Car"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Category</label>
              <Input
                value={categoryLabels[editingTag?.category ?? ""] ?? ""}
                disabled
                className="opacity-60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              Cancel
            </Button>
            <Button variant="default" disabled={isPending} onClick={handleUpdateTag}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingTagId !== null}
        onOpenChange={() => setDeletingTagId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tag. If any cafes are using it you
              will see an error - deactivate it instead of deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={isPending}
              onClick={async () => {
                if (!deletingTagId) return
                startTransition(async () => {
                  const result = await deleteTagAction(deletingTagId)
                  setDeletingTagId(null)
                  if (result.success) {
                    toast.success("Tag deleted")
                  } else {
                    toast.error(result.error)
                  }
                })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
