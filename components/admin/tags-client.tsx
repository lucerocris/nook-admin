"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
import {
  ArrowLineDown,
  ArrowLineUp,
  DotsThree,
  Info,
  PencilSimple,
  Plus,
  Tag as TagIcon,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  FilterChips,
  FilterSelect,
  PageHeader,
  SearchField,
  StatusChip,
  StatusTabs,
  TableCard,
  TableEmpty,
  TableFooter,
  TD,
  TH,
  Toolbar,
  TR,
  shortDate,
  type ActiveFilter,
} from "@/components/admin/table-kit"
import { DrawerFooter, Field } from "@/components/admin/form-kit"
import {
  createTagAction,
  updateTagAction,
  toggleTagActiveAction,
  deleteTagAction,
} from "@/app/admin/tags/actions"
import type { Tag } from "@/lib/queries/tags"

const categoryOrder = ["best_for", "amenities", "payment", "vibe"]
const categoryLabels: Record<string, string> = {
  best_for: "Best for",
  amenities: "Amenities",
  payment: "Payment accepted",
  vibe: "Vibe",
}

function categoryLabel(category: string) {
  return categoryLabels[category] ?? category
}

function usageOf(tag: Tag) {
  return tag.cafe_tags?.[0]?.count ?? 0
}

function usageText(count: number) {
  if (count === 0) return "Not used"
  return `${count.toLocaleString()} ${count === 1 ? "café" : "cafés"}`
}

function TagStatus({ active }: { active: boolean }) {
  return active ? (
    <StatusChip tone="success">Active</StatusChip>
  ) : (
    <StatusChip tone="neutral">Inactive</StatusChip>
  )
}

function TagActions({
  tag,
  isPending,
  onEdit,
  onToggle,
  onDelete,
}: {
  tag: Tag
  isPending: boolean
  onEdit: (tag: Tag) => void
  onToggle: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}) {
  const usage = usageOf(tag)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Actions for ${tag.name}`}>
          <DotsThree weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onEdit(tag)}>
          <PencilSimple />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(tag)}>
          {tag.is_active ? <ArrowLineDown /> : <ArrowLineUp />}
          {tag.is_active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* A tag in use can't be deleted (deleteTag refuses); deactivating
            hides it without touching the cafés that carry it. */}
        {usage > 0 ? (
          <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
            <span className="flex items-center gap-2">
              <Trash />
              Delete
            </span>
            <span className="pl-6 text-xs text-muted-foreground">
              Used by {usageText(usage)}. Deactivate it instead.
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(tag)}>
            <Trash />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SELECT_CLASS = "w-full text-base data-[size=default]:h-10 sm:text-sm sm:data-[size=default]:h-9"

/** Right-side drawer for the add and edit tag forms (design.md › Small forms):
 *  title and one line of context, stacked fields that scroll, and a sticky
 *  footer with Cancel and the primary action. Enter submits. */
function TagSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  saving,
  canSubmit,
  onSubmit,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  saving: boolean
  canSubmit: boolean
  onSubmit: () => void
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit && !saving) onSubmit()
          }}
        >
          <SheetHeader className="border-b px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            <SheetDescription className="text-[13px]">{description}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">{children}</div>
          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </DrawerFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function TagsClient({ tags }: { tags: Tag[] }) {
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")

  const [addTagOpen, setAddTagOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagCategory, setNewTagCategory] = useState("")
  const [newTagIconName, setNewTagIconName] = useState("")
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState("")
  const [editIconName, setEditIconName] = useState("")
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  // Known categories first in their usual order, then anything new the
  // database has grown since.
  const categories = useMemo(() => {
    const present = new Set(tags.map((t) => t.category))
    return [
      ...categoryOrder.filter((c) => present.has(c)),
      ...[...present].filter((c) => !categoryOrder.includes(c)),
    ]
  }, [tags])

  const activeCount = tags.filter((t) => t.is_active).length
  const query = search.trim().toLowerCase()

  // Rows read in category order, then each category's own sort_order, the
  // same order the app shows them in.
  const rows = useMemo(() => {
    const rank = (c: string) => categories.indexOf(c)
    return tags
      .filter((t) => category === "all" || t.category === category)
      .filter((t) => status === "all" || (status === "active" ? t.is_active : !t.is_active))
      .filter((t) => !query || t.name.toLowerCase().includes(query))
      .sort((a, b) => rank(a.category) - rank(b.category) || a.sort_order - b.sort_order)
  }, [tags, categories, category, status, query])

  const filters: ActiveFilter[] = []
  if (query) filters.push({ key: "search", label: "Search", value: `“${search.trim()}”`, onRemove: () => setSearch("") })
  if (status !== "all")
    filters.push({ key: "status", label: "Status is", value: status === "active" ? "Active" : "Inactive", onRemove: () => setStatus("all") })

  function clearFilters() {
    setSearch("")
    setStatus("all")
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag)
    setEditName(tag.name)
    setEditIconName(tag.icon_name ?? "")
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !newTagCategory) return

    startTransition(async () => {
      const name = newTagName.trim()
      const result = await createTagAction({
        name,
        category: newTagCategory,
        icon_name: newTagIconName || undefined,
      })

      if (result.success) {
        setAddTagOpen(false)
        setNewTagName("")
        setNewTagCategory("")
        setNewTagIconName("")
        toast.success(`${name} added`)
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
        toast.success("Tag saved")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleToggle(tag: Tag) {
    startTransition(async () => {
      const result = await toggleTagActiveAction(tag.id, !tag.is_active)
      if (result.success) {
        toast.success(tag.is_active ? `${tag.name} deactivated` : `${tag.name} activated`)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!deletingTag) return
    const target = deletingTag
    startTransition(async () => {
      const result = await deleteTagAction(target.id)
      setDeletingTag(null)
      if (result.success) {
        toast.success(`${target.name} deleted`)
      } else {
        toast.error(result.error)
      }
    })
  }

  const actionProps = { isPending, onEdit: openEdit, onToggle: handleToggle, onDelete: setDeletingTag }

  const empty =
    rows.length === 0 ? (
      tags.length > 0 ? (
        <TableEmpty
          icon={TagIcon}
          title="No tags match"
          body="Try a different search or fewer filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearFilters()
                setCategory("all")
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          icon={TagIcon}
          title="No tags yet"
          body="Tags you add here can be put on cafés and shown as filters in the app."
          action={
            <Button size="sm" onClick={() => setAddTagOpen(true)}>
              Add tag
            </Button>
          }
        />
      )
    ) : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Tags"
        summary={`${tags.length.toLocaleString()} tags · ${activeCount.toLocaleString()} active`}
        action={
          <Button onClick={() => setAddTagOpen(true)}>
            <Plus aria-hidden />
            Add tag
          </Button>
        }
      />

      <StatusTabs
        label="Filter by category"
        value={category}
        onChange={setCategory}
        tabs={[
          { value: "all", label: "All", count: tags.length },
          ...categories.map((c) => ({
            value: c,
            label: categoryLabel(c),
            count: tags.filter((t) => t.category === c).length,
          })),
        ]}
      />

      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search tags by name" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </Toolbar>

      <FilterChips filters={filters} onClearAll={clearFilters} />

      {category === "vibe" && (
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Vibe tags are hidden from the app and owner portal until Phase 2. You can tag cafés with them now; they
          appear automatically when Phase 2 launches.
        </p>
      )}

      <TableCard
        busy={isPending}
        empty={empty}
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className={TH}>Tag</TableHead>
                <TableHead className={TH}>Category</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={TH}>Used by</TableHead>
                <TableHead className={TH}>Added</TableHead>
                <TableHead className={`${TH} w-12`}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tag) => {
                const usage = usageOf(tag)
                return (
                  <TableRow key={tag.id} className={TR}>
                    <TableCell className={`${TD} max-w-[22rem]`}>
                      <div className="grid min-w-0 leading-tight">
                        <button
                          type="button"
                          onClick={() => openEdit(tag)}
                          className="truncate text-left font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {tag.name}
                        </button>
                        <span className="truncate text-xs text-muted-foreground">
                          {tag.icon_name ? (
                            <>
                              Icon <span className="font-mono">{tag.icon_name}</span>
                            </>
                          ) : (
                            "No icon"
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      {categoryLabel(tag.category)}
                      {tag.category === "vibe" && (
                        <span className="ml-1.5 text-xs text-muted-foreground">Hidden in app</span>
                      )}
                    </TableCell>
                    <TableCell className={TD}>
                      <TagStatus active={tag.is_active} />
                    </TableCell>
                    <TableCell className={`${TD} tabular-nums ${usage === 0 ? "text-muted-foreground" : ""}`}>
                      {usageText(usage)}
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground tabular-nums`}>
                      {tag.created_at ? shortDate(tag.created_at) : "—"}
                    </TableCell>
                    <TableCell className={`${TD} text-right`}>
                      <TagActions tag={tag} {...actionProps} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        }
        list={rows.map((tag) => (
          <li key={tag.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(tag)}
                  className="truncate text-left text-sm font-medium"
                >
                  {tag.name}
                </button>
                <TagStatus active={tag.is_active} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                {categoryLabel(tag.category)} · {usageText(usageOf(tag))}
              </p>
            </div>
            <TagActions tag={tag} {...actionProps} />
          </li>
        ))}
        footer={
          <TableFooter
            page={1}
            pageSize={rows.length || 1}
            shown={rows.length}
            total={rows.length}
            totalPages={1}
            onPage={() => {}}
            noun="tags"
          />
        }
      />

      <TagSheet
        open={addTagOpen}
        onOpenChange={setAddTagOpen}
        title="Add tag"
        description="New tags go to the bottom of their category and start active."
        submitLabel="Add tag"
        saving={isPending}
        canSubmit={!!newTagName.trim() && !!newTagCategory}
        onSubmit={handleCreateTag}
      >
        <Field label="Tag name" htmlFor="new-tag-name">
          <Input
            id="new-tag-name"
            placeholder="e.g. Dog friendly"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            autoComplete="off"
            className="text-base sm:text-sm"
          />
        </Field>
        <Field label="Category" htmlFor="new-tag-category">
          <Select value={newTagCategory} onValueChange={setNewTagCategory}>
            <SelectTrigger id="new-tag-category" className={SELECT_CLASS}>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best_for">Best for</SelectItem>
              <SelectItem value="amenities">Amenities</SelectItem>
              <SelectItem value="payment">Payment accepted</SelectItem>
              <SelectItem value="vibe">Vibe</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Icon name" htmlFor="new-tag-icon" optional hint="The icon the app shows beside the tag.">
          <Input
            id="new-tag-icon"
            placeholder="e.g. Coffee, Wifi, Car"
            value={newTagIconName}
            onChange={(e) => setNewTagIconName(e.target.value)}
            autoComplete="off"
            className="font-mono text-base sm:text-sm"
          />
        </Field>
      </TagSheet>

      <TagSheet
        open={editingTag !== null}
        onOpenChange={(open) => !open && setEditingTag(null)}
        title="Edit tag"
        description="The category is fixed once a tag exists."
        submitLabel="Save tag"
        saving={isPending}
        canSubmit={!!editName.trim()}
        onSubmit={handleUpdateTag}
      >
        <Field label="Tag name" htmlFor="edit-tag-name">
          <Input
            id="edit-tag-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoComplete="off"
            className="text-base sm:text-sm"
          />
        </Field>
        <Field label="Icon name" htmlFor="edit-tag-icon" optional hint="The icon the app shows beside the tag.">
          <Input
            id="edit-tag-icon"
            value={editIconName}
            onChange={(e) => setEditIconName(e.target.value)}
            placeholder="e.g. Coffee, Wifi, Car"
            autoComplete="off"
            className="font-mono text-base sm:text-sm"
          />
        </Field>
        <Field label="Category" htmlFor="edit-tag-category">
          <Input
            id="edit-tag-category"
            value={editingTag ? categoryLabel(editingTag.category) : ""}
            disabled
            className="text-base sm:text-sm"
          />
        </Field>
      </TagSheet>

      <AlertDialog open={deletingTag !== null} onOpenChange={() => setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingTag?.name ?? "tag"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The tag is removed from the master list. This can’t be undone. If a café is using it, the delete is
              refused; deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleDelete}>
              Delete tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
