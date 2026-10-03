"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  Crown,
  Plus,
  Trash,
  DotsSixVertical,
  InstagramLogo,
  FacebookLogo,
  TiktokLogo,
  Globe,
  Eye,
  PencilSimple,
  ImageSquare,
  Info,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { Cafe } from "@/lib/queries/cafes"
import {
  countChanges,
  Field,
  FormLayout,
  FormPageHeader,
  FormSection,
  RailPanel,
  SaveBar,
  SectionIndex,
  useLeaveGuard,
  type SectionIndexItem,
} from "@/components/admin/form-kit"
import { StatusChip, type Tone } from "@/components/admin/table-kit"
import type { Tag } from "@/lib/queries/tags"
import type { Category, MenuItem } from "@/lib/queries/menu"
import {
  createCafeAction,
  updateCafeAction,
  upsertMenuItemAction,
  deleteMenuItemAction,
  createMenuCategoryAction,
  updateMenuCategoryAction,
  deleteMenuCategoryAction,
} from "@/app/admin/cafes/editor-actions"
import {
  uploadCafeHeroAction,
  uploadCafePhotoAction,
  deleteCafePhotoAction,
  reorderCafePhotosAction,
  uploadMenuItemImageAction,
  deleteMenuItemImageAction,
} from "@/app/actions/upload"
import imageCompression from "browser-image-compression"

async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp",
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CafeEditorFormProps {
  mode: "create" | "edit"
  cafe?: Cafe & {
    cafe_tags: { tag_id: string; is_featured: boolean }[]
    menu_items: MenuItem[]
  }
  tags: Tag[]
  categories: Category[]
  disabled?: boolean
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const

// ---------------------------------------------------------------------------
// Menu types
// ---------------------------------------------------------------------------

interface LocalMenuCategory {
  id: string
  name: string
  isGlobal: boolean
}

interface LocalMenuItem {
  id: string
  name: string
  description: string
  category: string
  categoryId: string
  price: number
  isHighlight: boolean
  imageUrl: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number) {
  return `₱${price.toFixed(2)}`
}

function formatCategoryLabel(cat: string) {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function groupTagsByCategory(tags: Tag[]) {
  const map = new Map<string, Tag[]>()
  for (const tag of tags) {
    const list = map.get(tag.category) ?? []
    list.push(tag)
    map.set(tag.category, list)
  }
  return map
}

const MapPicker = dynamic(
  () => import("@/components/admin/map-picker").then((m) => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  }
)

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((m) => m.SearchBox),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium leading-none">{children}</label>
  )
}

function FieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Menu sub-components
// ---------------------------------------------------------------------------

function ImageUploadCell({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
  return (
    <div
      className={`size-10 rounded-md border-2 border-dashed border-border flex items-center justify-center shrink-0 ${
        disabled
          ? "pointer-events-none opacity-60"
          : "cursor-pointer hover:bg-muted"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <ImageSquare className="size-4 text-muted-foreground" />
    </div>
  )
}

interface MenuItemRowProps {
  item: LocalMenuItem
  showCategory?: boolean
  highlightCount: number
  onEdit: (item: LocalMenuItem) => void
  onToggleHighlight: (id: string, val: boolean) => void
  onDelete: (id: string) => void
  onImageUpload: (id: string, file: File) => void
  onImageDelete: (id: string, imageUrl: string) => void
  isUploadingImage?: boolean
  disableImageUpload?: boolean
  disabled?: boolean
}

function MenuItemRow({
  item,
  showCategory = true,
  highlightCount,
  onEdit,
  onToggleHighlight,
  onDelete,
  onImageUpload,
  onImageDelete,
  isUploadingImage = false,
  disableImageUpload = false,
  disabled = false,
}: MenuItemRowProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const atHighlightCap = highlightCount >= 5 && !item.isHighlight

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    onImageUpload(item.id, compressed)
    e.target.value = ""
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      {/* Col 1 — drag handle */}
      <DotsSixVertical
        className={`text-muted-foreground size-4 shrink-0 ${
          disabled ? "pointer-events-none opacity-60" : "cursor-grab"
        }`}
      />

      {/* Col 2 — image cell */}
      {item.isHighlight ? (
        item.imageUrl ? (
          <div className="relative size-10 rounded-md bg-muted shrink-0 overflow-hidden group/img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
              onClick={() => onImageDelete(item.id, item.imageUrl!)}
              disabled={isUploadingImage || disabled}
              title="Remove image"
            >
              <Trash className="size-3 text-white" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <ImageUploadCell
              disabled={disabled || isUploadingImage || disableImageUpload}
              onClick={() => inputRef.current?.click()}
            />
          </>
        )
      ) : (
        <div className="size-10 shrink-0" />
      )}

      {/* Col 3 — info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.name}</span>
          {item.isHighlight && (
            <Badge
              variant="outline"
              className="text-xs text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800 shrink-0"
            >
              Highlight
            </Badge>
          )}
        </div>
        {item.description.trim().length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {showCategory && (
            <span className="text-xs text-muted-foreground">{item.category}</span>
          )}
          {showCategory && (
            <span className="text-xs text-muted-foreground">·</span>
          )}
          <span className="text-xs text-muted-foreground">{formatPrice(item.price)}</span>
        </div>
      </div>

      {/* Col 4 — highlight toggle */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {atHighlightCap ? (
          <>
            <Switch checked={false} disabled />
            <span className="text-xs text-destructive whitespace-nowrap">Max reached</span>
          </>
        ) : (
          <>
            <Switch
              checked={item.isHighlight}
              onCheckedChange={(val) => onToggleHighlight(item.id, val)}
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">Highlight</span>
          </>
        )}
      </div>

      {/* Col 5 — actions */}
      <div className="flex shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          disabled={disabled}
        >
          <PencilSimple />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          disabled={disabled}
        >
          <Trash />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Category Dialog
// ---------------------------------------------------------------------------

function AddCategoryDialog({
  open,
  onOpenChange,
  cafeId,
  onCategoryAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cafeId?: string
  onCategoryAdded: (cat: LocalMenuCategory) => void
}) {
  const [name, setName] = React.useState("")
  const [isGlobal, setIsGlobal] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError("")
    try {
      const data = await createMenuCategoryAction({
        name: name.trim(),
        is_global: isGlobal,
        cafeId: cafeId ?? null,
      })
      onCategoryAdded({ id: data.id, name: data.name, isGlobal: data.is_global })
      setName("")
      setIsGlobal(false)
      onOpenChange(false)
      toast.success("Category added")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add category"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName("")
    setIsGlobal(false)
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldGroup label="Category name">
            <Input
              placeholder="e.g. Specialty Drinks"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldGroup>
          <div className="flex items-center gap-2">
            <Checkbox
              id="global-category"
              checked={isGlobal}
              onCheckedChange={(v) => setIsGlobal(v === true)}
            />
            <label
              htmlFor="global-category"
              className="text-xs cursor-pointer select-none"
            >
              Make this global (available to all cafes)
            </label>
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving || !name.trim()}>
            {saving ? "Adding..." : "Add Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  cafeId,
  onCategoryUpdated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  category: LocalMenuCategory | null
  cafeId?: string
  onCategoryUpdated: (cat: LocalMenuCategory) => void
}) {
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open && category) {
      setName(category.name)
      setError("")
    }
  }, [open, category])

  async function handleSave() {
    if (!category || !name.trim()) return
    setSaving(true)
    setError("")
    try {
      const data = await updateMenuCategoryAction({
        id: category.id,
        name: name.trim(),
        cafeId,
      })
      onCategoryUpdated({
        id: data.id,
        name: data.name,
        isGlobal: data.is_global,
      })
      onOpenChange(false)
      toast.success("Category updated")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update category"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldGroup label="Category name">
            <Input
              placeholder="e.g. Specialty Drinks"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldGroup>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Add Item Dialog
// ---------------------------------------------------------------------------

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  highlightCount: number
  categories: LocalMenuCategory[]
  cafeId?: string
  onItemAdded: (item: LocalMenuItem) => void
}

function AddItemDialog({
  open,
  onOpenChange,
  highlightCount,
  categories,
  cafeId,
  onItemAdded,
}: AddItemDialogProps) {
  const [itemName, setItemName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [isHighlight, setIsHighlight] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [pendingImageFile, setPendingImageFile] = React.useState<File | null>(null)
  const dialogInputRef = React.useRef<HTMLInputElement>(null)
  const atCap = highlightCount >= 5

  async function handleAdd() {
    if (!itemName || !categoryId || !price) return
    const priceNum = parseFloat(price)
    if (isNaN(priceNum)) return

    if (cafeId) {
      setSaving(true)
      try {
        const result = await upsertMenuItemAction({
          cafe_id: cafeId,
          name: itemName,
          description: description.trim() || null,
          price: priceNum,
          category_id: categoryId,
          is_highlight: isHighlight,
          image_url: null,
        })

        let imageUrl: string | null = null
        if (isHighlight && pendingImageFile) {
          try {
            const formData = new FormData()
            formData.append("file", pendingImageFile)
            const upload = await uploadMenuItemImageAction(formData, result.id, cafeId)
            imageUrl = upload.url
          } catch {
            toast.error("Menu item added, but highlight photo upload failed")
          }
        }

        const cat = categories.find((c) => c.id === categoryId)
        onItemAdded({
          id: result.id,
          name: itemName,
          description,
          category: cat?.name ?? "",
          categoryId,
          price: priceNum,
          isHighlight,
          imageUrl,
        })
        toast.success("Menu item added")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add menu item"
        toast.error(message)
        return
      } finally {
        setSaving(false)
      }
    } else {
      const cat = categories.find((c) => c.id === categoryId)
      onItemAdded({
        id: crypto.randomUUID(),
        name: itemName,
        description,
        category: cat?.name ?? "",
        categoryId,
        price: priceNum,
        isHighlight,
        imageUrl: null,
      })
    }

    setItemName("")
    setDescription("")
    setCategoryId("")
    setPrice("")
    setIsHighlight(false)
    setPendingImageFile(null)
    onOpenChange(false)
  }

  function handleCancel() {
    setItemName("")
    setDescription("")
    setCategoryId("")
    setPrice("")
    setIsHighlight(false)
    setPendingImageFile(null)
    onOpenChange(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setItemName("")
      setDescription("")
      setCategoryId("")
      setPrice("")
      setIsHighlight(false)
      setPendingImageFile(null)
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={dialogInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPendingImageFile(e.target.files?.[0] ?? null)}
          />
          <FieldGroup label="Item name">
            <Input
              placeholder="e.g. Iced Oat Latte"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Description">
            <Textarea
              placeholder="Short item description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </FieldGroup>
          <FieldGroup label="Category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Price (₱)">
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FieldGroup>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Feature as highlight</span>
              <span className="text-xs text-muted-foreground">
                Shows on the cafe detail page with a photo
              </span>
            </div>
            {atCap ? (
              <div className="flex flex-col items-end gap-1">
                <Switch checked={false} disabled />
                <span className="text-xs text-destructive">
                  Maximum 5 highlights reached
                </span>
              </div>
            ) : (
              <Switch
                checked={isHighlight}
                onCheckedChange={setIsHighlight}
              />
            )}
          </div>
          {isHighlight && !atCap && (
            cafeId ? (
              <div
                className="mt-1 h-32 w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted text-muted-foreground transition-colors"
                onClick={() => dialogInputRef.current?.click()}
              >
                <ImageSquare className={`size-6 ${pendingImageFile ? "text-primary" : ""}`} />
                {pendingImageFile ? (
                  <>
                    <span className="text-sm font-medium truncate max-w-55">
                      {pendingImageFile.name}
                    </span>
                    <span className="text-xs">Click to change</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">Click to upload</span>
                    <span className="text-xs">JPG, PNG or WEBP · Max 10MB</span>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Save the cafe first to upload highlight photos.
              </div>
            )
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: LocalMenuItem | null
  categories: LocalMenuCategory[]
  highlightCount: number
  cafeId?: string
  onItemUpdated: (item: LocalMenuItem) => void
}

function EditItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  highlightCount,
  cafeId,
  onItemUpdated,
}: EditItemDialogProps) {
  const [itemName, setItemName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [isHighlight, setIsHighlight] = React.useState(false)
  const [removeCurrentImage, setRemoveCurrentImage] = React.useState(false)
  const [pendingImageFile, setPendingImageFile] = React.useState<File | null>(null)
  const [saving, setSaving] = React.useState(false)
  const dialogInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open || !item) return
    setItemName(item.name)
    setDescription(item.description)
    setCategoryId(item.categoryId)
    setPrice(item.price.toString())
    setIsHighlight(item.isHighlight)
    setRemoveCurrentImage(false)
    setPendingImageFile(null)
  }, [open, item])

  if (!item) return null
  const editingItem = item

  const atCap = highlightCount >= 5 && !editingItem.isHighlight

  async function handleSave() {
    if (!itemName || !categoryId || !price) return
    const priceNum = parseFloat(price)
    if (isNaN(priceNum)) return

    setSaving(true)
    try {
      let imageUrl: string | null = editingItem.imageUrl
      if (removeCurrentImage) imageUrl = null

      if (cafeId) {
        await upsertMenuItemAction({
          id: editingItem.id,
          cafe_id: cafeId,
          name: itemName,
          description: description.trim() || null,
          price: priceNum,
          category_id: categoryId,
          is_highlight: isHighlight,
          image_url: imageUrl,
        })

        if (removeCurrentImage && editingItem.imageUrl) {
          try {
            await deleteMenuItemImageAction(editingItem.id, editingItem.imageUrl, cafeId)
            imageUrl = null
          } catch {
            toast.error("Item saved, but failed to remove current photo")
          }
        }

        if (isHighlight && pendingImageFile) {
          try {
            const formData = new FormData()
            formData.append("file", pendingImageFile)
            const upload = await uploadMenuItemImageAction(formData, editingItem.id, cafeId)
            imageUrl = upload.url
          } catch {
            toast.error("Item saved, but failed to upload highlight photo")
          }
        }
      }

      const cat = categories.find((c) => c.id === categoryId)
      onItemUpdated({
        id: editingItem.id,
        name: itemName,
        description,
        category: cat?.name ?? "",
        categoryId,
        price: priceNum,
        isHighlight,
        imageUrl,
      })
      onOpenChange(false)
      toast.success("Menu item updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update menu item"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={dialogInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPendingImageFile(e.target.files?.[0] ?? null)}
          />

          <FieldGroup label="Item name">
            <Input
              placeholder="e.g. Iced Oat Latte"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Description">
            <Textarea
              placeholder="Short item description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </FieldGroup>

          <FieldGroup label="Category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Price (₱)">
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FieldGroup>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Feature as highlight</span>
              <span className="text-xs text-muted-foreground">
                Shows on the cafe detail page with a photo
              </span>
            </div>
            {atCap ? (
              <div className="flex flex-col items-end gap-1">
                <Switch checked={false} disabled />
                <span className="text-xs text-destructive">
                  Maximum 5 highlights reached
                </span>
              </div>
            ) : (
              <Switch
                checked={isHighlight}
                onCheckedChange={setIsHighlight}
              />
            )}
          </div>

          {isHighlight && !atCap && (
            cafeId ? (
              <>
                <div
                  className="mt-1 h-28 w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted text-muted-foreground transition-colors"
                  onClick={() => dialogInputRef.current?.click()}
                >
                  <ImageSquare className={`size-6 ${pendingImageFile ? "text-primary" : ""}`} />
                  {pendingImageFile ? (
                    <>
                      <span className="text-sm font-medium truncate max-w-55">
                        {pendingImageFile.name}
                      </span>
                      <span className="text-xs">Click to change</span>
                    </>
                  ) : editingItem.imageUrl && !removeCurrentImage ? (
                    <>
                      <span className="text-sm">Current photo is set</span>
                      <span className="text-xs">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Click to upload</span>
                      <span className="text-xs">JPG, PNG or WEBP · Max 10MB</span>
                    </>
                  )}
                </div>
                {editingItem.imageUrl && !pendingImageFile && (
                  <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      {removeCurrentImage
                        ? "Current photo will be removed on save"
                        : "Current photo will be kept"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveCurrentImage((prev) => !prev)}
                    >
                      {removeCurrentImage ? "Keep photo" : "Remove photo"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Save the cafe first to upload highlight photos.
              </div>
            )
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Menu Cards
// ---------------------------------------------------------------------------

function MenuCategoriesCard({
  categories,
  items,
  showGlobalCategories,
  cafeId,
  onCategoryAdded,
  onCategoryUpdated,
  onDeleteCategory,
  disabled = false,
  headerAction,
}: {
  categories: LocalMenuCategory[]
  items: LocalMenuItem[]
  showGlobalCategories: boolean
  cafeId?: string
  onCategoryAdded: (cat: LocalMenuCategory) => void
  onCategoryUpdated: (cat: LocalMenuCategory) => void
  onDeleteCategory: (id: string) => Promise<void>
  disabled?: boolean
  headerAction?: React.ReactNode
}) {
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false)
  const [editCategory, setEditCategory] = React.useState<LocalMenuCategory | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = React.useState<string | null>(null)

  const visibleCategories = React.useMemo(
    () =>
      categories.filter(
        (cat) =>
          showGlobalCategories ||
          !cat.isGlobal ||
          items.some((item) => item.categoryId === cat.id)
      ),
    [categories, items, showGlobalCategories]
  )

  return (
    <>
      <FormSection
        id="menu-categories"
        title="Menu categories"
        description="Group menu items. Nook’s shared categories can’t be renamed."
        action={headerAction}
      >
          {visibleCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 py-3 border-b last:border-0"
            >
              <DotsSixVertical
                className={`text-muted-foreground size-4 shrink-0 ${
                  disabled ? "pointer-events-none opacity-60" : "cursor-grab"
                }`}
              />
              <div className="flex-1 flex items-center">
                <span className="text-sm font-medium">{cat.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {cat.isGlobal ? "Global" : "Custom"}
                </Badge>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => setEditCategory(cat)}
                >
                  <PencilSimple />
                </Button>
                {!cat.isGlobal && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteCategoryId(cat.id)}
                    disabled={disabled}
                  >
                    <Trash />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddCategoryOpen(true)}
              disabled={disabled}
            >
              <Plus />
              Add Category
            </Button>
          </div>
      </FormSection>

      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        cafeId={cafeId}
        onCategoryAdded={onCategoryAdded}
      />

      <EditCategoryDialog
        open={editCategory !== null}
        onOpenChange={(open) => { if (!open) setEditCategory(null) }}
        category={editCategory}
        cafeId={cafeId}
        onCategoryUpdated={onCategoryUpdated}
      />

      <AlertDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => { if (!open) setDeleteCategoryId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category. Items in this category will become
              uncategorized. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (deleteCategoryId !== null) await onDeleteCategory(deleteCategoryId)
                setDeleteCategoryId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MenuItemsCard({
  items,
  categories,
  showGlobalCategories,
  cafeId,
  onToggleHighlight,
  onDeleteItem,
  onItemAdded,
  onItemUpdated,
  onImageUploaded,
  onImageDeleted,
  disabled = false,
}: {
  items: LocalMenuItem[]
  categories: LocalMenuCategory[]
  showGlobalCategories: boolean
  cafeId?: string
  onToggleHighlight: (id: string, val: boolean) => void
  onDeleteItem: (id: string) => void
  onItemAdded: (item: LocalMenuItem) => void
  onItemUpdated: (item: LocalMenuItem) => void
  onImageUploaded: (id: string, url: string) => void
  onImageDeleted: (id: string) => void
  disabled?: boolean
}) {
  const [addItemOpen, setAddItemOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<LocalMenuItem | null>(null)
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null)
  const [uploadingItemId, setUploadingItemId] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState("")

  async function handleImageUpload(id: string, file: File) {
    if (!cafeId) return
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append("file", compressed)
    setUploadingItemId(id)
    setUploadError("")
    try {
      const { url } = await uploadMenuItemImageAction(formData, id, cafeId)
      onImageUploaded(id, url)
      toast.success("Item image uploaded")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setUploadError(msg)
      toast.error(msg)
      setTimeout(() => setUploadError(""), 4000)
    } finally {
      setUploadingItemId(null)
    }
  }

  async function handleImageDelete(id: string, imageUrl: string) {
    if (!cafeId) return
    setUploadingItemId(id)
    try {
      await deleteMenuItemImageAction(id, imageUrl, cafeId)
      onImageDeleted(id)
      toast.success("Item image removed")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      setUploadError(msg)
      toast.error(msg)
      setTimeout(() => setUploadError(""), 4000)
    } finally {
      setUploadingItemId(null)
    }
  }

  const highlights = items.filter((i) => i.isHighlight)
  const highlightCount = highlights.length
  const allHighlightsHaveNoImage = highlights.length > 0 && highlights.every((i) => !i.imageUrl)

  const availableCategoriesForAdd = React.useMemo(
    () =>
      categories.filter(
        (cat) =>
          showGlobalCategories ||
          !cat.isGlobal ||
          items.some((item) => item.categoryId === cat.id)
      ),
    [categories, items, showGlobalCategories]
  )

  const byCategory = categories
    .map((cat) => ({
      category: cat,
      items: items.filter((i) => i.categoryId === cat.id),
    }))
    .filter((g) => g.items.length > 0)

  function handleDelete(id: string) {
    setDeleteItemId(id)
  }

  function confirmDelete() {
    if (deleteItemId !== null) onDeleteItem(deleteItemId)
    setDeleteItemId(null)
  }

  return (
    <>
      <FormSection
        id="menu-items"
        title="Menu items"
        description="Everything on the menu. Highlights show with a photo on the café page."
      >
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="highlights">Highlights</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {items.length} items · {highlightCount} highlights
              </p>
              <Button
                size="sm"
                onClick={() => setAddItemOpen(true)}
                disabled={disabled}
              >
                <Plus />
                Add Item
              </Button>
            </div>

            {!cafeId && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground mb-3">
                <Info className="size-3.5 shrink-0" />
                Save the cafe first to enable highlight image uploads.
              </div>
            )}

            {/* All Items */}
            <TabsContent value="all">
              {items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  showCategory
                  highlightCount={highlightCount}
                  onEdit={setEditItem}
                  onToggleHighlight={onToggleHighlight}
                  onDelete={handleDelete}
                  onImageUpload={handleImageUpload}
                  onImageDelete={handleImageDelete}
                  isUploadingImage={uploadingItemId === item.id}
                  disableImageUpload={!cafeId}
                  disabled={disabled}
                />
              ))}
            </TabsContent>

            {/* Highlights */}
            <TabsContent value="highlights">
              {allHighlightsHaveNoImage ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-muted-foreground mb-3 dark:border-amber-800 dark:bg-amber-950">
                  <Info className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-300">
                    Highlights without photos won&apos;t show an image on the cafe
                    detail page.
                  </span>
                </div>
              ) : highlightCount < 5 ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground mb-3">
                  <Info className="size-3.5 shrink-0" />
                  {highlightCount} of 5 highlight slots used. Highlights appear
                  on the cafe detail page with photos.
                </div>
              ) : null}
              {highlights.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  showCategory
                  highlightCount={highlightCount}
                  onEdit={setEditItem}
                  onToggleHighlight={onToggleHighlight}
                  onDelete={handleDelete}
                  onImageUpload={handleImageUpload}
                  onImageDelete={handleImageDelete}
                  isUploadingImage={uploadingItemId === item.id}
                  disableImageUpload={!cafeId}
                  disabled={disabled}
                />
              ))}
            </TabsContent>

            {/* By Category */}
            <TabsContent value="by-category">
              {byCategory.map(({ category, items: catItems }) => (
                <div key={category.id}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 border-b">
                    {category.name}
                  </p>
                  {catItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      showCategory={false}
                      highlightCount={highlightCount}
                      onEdit={setEditItem}
                      onToggleHighlight={onToggleHighlight}
                      onDelete={handleDelete}
                      onImageUpload={handleImageUpload}
                      onImageDelete={handleImageDelete}
                      isUploadingImage={uploadingItemId === item.id}
                      disableImageUpload={!cafeId}
                      disabled={disabled}
                    />
                  ))}
                </div>
              ))}
            </TabsContent>
          </Tabs>
          {uploadError && (
            <p className="text-sm text-destructive mt-3">{uploadError}</p>
          )}
      </FormSection>

      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        highlightCount={highlightCount}
        categories={availableCategoriesForAdd}
        cafeId={cafeId}
        onItemAdded={onItemAdded}
      />

      <EditItemDialog
        open={editItem !== null}
        onOpenChange={(open) => { if (!open) setEditItem(null) }}
        item={editItem}
        categories={availableCategoriesForAdd}
        highlightCount={highlightCount}
        cafeId={cafeId}
        onItemUpdated={onItemUpdated}
      />

      <AlertDialog
        open={deleteItemId !== null}
        onOpenChange={(open) => { if (!open) setDeleteItemId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CafeEditorForm({
  mode,
  cafe,
  tags,
  categories,
  disabled = false,
}: CafeEditorFormProps) {
  // --- Basic Info ---
  const [name, setName] = React.useState(cafe?.name ?? "")
  const [neighborhood, setNeighborhood] = React.useState(cafe?.neighborhood ?? "")
  const [city, setCity] = React.useState(cafe?.city ?? "Cebu City")
  const [description, setDescription] = React.useState(cafe?.description ?? "")

  // --- Location ---
  const [addressInput, setAddressInput] = React.useState(cafe?.address ?? "")
  const [lat, setLat] = React.useState<number>(cafe?.lat ?? 10.3157)
  const [lng, setLng] = React.useState<number>(cafe?.lng ?? 123.8854)
  const [latInput, setLatInput] = React.useState(
    String(cafe?.lat ?? 10.3157)
  )
  const [lngInput, setLngInput] = React.useState(
    String(cafe?.lng ?? 123.8854)
  )

  const syncCoordinates = React.useCallback((newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
    setLatInput(String(newLat))
    setLngInput(String(newLng))
  }, [])

  const handleMapChange = React.useCallback((newLat: number, newLng: number) => {
    syncCoordinates(newLat, newLng)
  }, [syncCoordinates])

  function handleLatInputChange(value: string) {
    setLatInput(value)
    const parsed = Number(value)
    if (value.trim().length === 0) return
    if (Number.isFinite(parsed) && parsed >= -90 && parsed <= 90) {
      setLat(parsed)
    }
  }

  function handleLngInputChange(value: string) {
    setLngInput(value)
    const parsed = Number(value)
    if (value.trim().length === 0) return
    if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180) {
      setLng(parsed)
    }
  }

  function commitLatInput() {
    const parsed = Number(latInput)
    if (Number.isFinite(parsed) && parsed >= -90 && parsed <= 90) {
      setLat(parsed)
      setLatInput(String(parsed))
      return
    }
    setLatInput(String(lat))
  }

  function commitLngInput() {
    const parsed = Number(lngInput)
    if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180) {
      setLng(parsed)
      setLngInput(String(parsed))
      return
    }
    setLngInput(String(lng))
  }

  // --- Social Links ---
  const [instagram, setInstagram] = React.useState(cafe?.social_links?.instagram ?? "")
  const [facebook, setFacebook] = React.useState(cafe?.social_links?.facebook ?? "")
  const [tiktok, setTiktok] = React.useState(cafe?.social_links?.tiktok ?? "")
  const [website, setWebsite] = React.useState(cafe?.social_links?.website ?? "")

  // --- Operating Hours ---
  type DayHours = { open: string; close: string; closed: boolean }
  const [hours, setHours] = React.useState<Record<string, DayHours>>(() => {
    const defaults = Object.fromEntries(
      DAYS.map(({ key }) => [key, { open: "", close: "", closed: false }])
    )
    if (cafe?.operating_hours) {
      const saved = cafe.operating_hours as Record<string, DayHours>
      DAYS.forEach(({ key, label }) => {
        // Backward compatibility for old records that used capitalized day keys.
        if (saved[key]) defaults[key] = saved[key]
        else if (saved[label]) defaults[key] = saved[label]
      })
    }
    return defaults
  })

  // --- Tags ---
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(
    () => new Set(cafe?.cafe_tags?.map((t) => t.tag_id) ?? [])
  )
  const [featuredTags, setFeaturedTags] = React.useState<Set<string>>(
    () =>
      new Set(
        cafe?.cafe_tags?.filter((t) => t.is_featured).map((t) => t.tag_id) ?? []
      )
  )

  const tagGroups = React.useMemo(() => groupTagsByCategory(tags), [tags])

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      const isRemoving = next.has(tagId)
      isRemoving ? next.delete(tagId) : next.add(tagId)

      if (isRemoving) {
        setFeaturedTags((prevFeatured) => {
          if (!prevFeatured.has(tagId)) return prevFeatured
          const nextFeatured = new Set(prevFeatured)
          nextFeatured.delete(tagId)
          return nextFeatured
        })
      }

      return next
    })
  }

  function toggleFeaturedTag(tagId: string) {
    if (!selectedTags.has(tagId)) return
    setFeaturedTags((prev) => {
      const next = new Set(prev)
      next.has(tagId) ? next.delete(tagId) : next.add(tagId)
      return next
    })
  }

  // --- Menu ---
  const [menuCategories, setMenuCategories] = React.useState<LocalMenuCategory[]>(
    () =>
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        isGlobal: c.is_global,
      }))
  )

  const [menuItems, setMenuItems] = React.useState<LocalMenuItem[]>(
    () =>
      (cafe?.menu_items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        category: item.menu_categories?.name ?? "",
        categoryId: item.category_id,
        price: item.price,
        isHighlight: item.is_highlight,
        imageUrl: item.image_url,
      }))
  )

  const [showGlobalMenuCategories, setShowGlobalMenuCategories] = React.useState(true)

  function handleToggleHighlight(itemId: string, val: boolean) {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isHighlight: val } : item
      )
    )
  }

  async function handleDeleteItem(itemId: string) {
    try {
      if (cafe?.id) {
        await deleteMenuItemAction(itemId, cafe.id)
      }
      setMenuItems((prev) => prev.filter((item) => item.id !== itemId))
      toast.success("Menu item deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete menu item"
      toast.error(message)
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (cafe?.id) {
      const result = await deleteMenuCategoryAction(catId, cafe.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
    } else {
      const result = await deleteMenuCategoryAction(catId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
    }

    setMenuCategories((prev) => prev.filter((cat) => cat.id !== catId))
    toast.success("Category deleted")
  }

  function handleImageUploaded(id: string, url: string) {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, imageUrl: url } : item))
    )
  }

  function handleImageDeleted(id: string) {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, imageUrl: null } : item))
    )
  }

  function handleItemAdded(item: LocalMenuItem) {
    setMenuItems((prev) => [...prev, item])
  }

  function handleItemUpdated(updatedItem: LocalMenuItem) {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
  }

  // --- Photos ---
  const [heroUrl, setHeroUrl] = React.useState<string | null>(
    cafe?.featured_image_url ?? null
  )
  const [galleryUrls, setGalleryUrls] = React.useState<string[]>(
    (cafe?.photo_urls as string[] | null) ?? []
  )
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)
  const [isReordering, setIsReordering] = React.useState(false)
  const [photoUploadError, setPhotoUploadError] = React.useState("")
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null)

  const allPhotos = [
    ...(heroUrl ? [heroUrl] : []),
    ...galleryUrls.filter((url) => url !== heroUrl),
  ]

  function applyOrderedPhotos(ordered: string[]) {
    setHeroUrl(ordered[0] ?? null)
    setGalleryUrls(ordered.slice(1))
  }

  async function persistPhotoOrder(ordered: string[]) {
    if (!cafe?.id) return false
    const previous = allPhotos
    applyOrderedPhotos(ordered)
    setIsReordering(true)
    setPhotoUploadError("")

    try {
      await reorderCafePhotosAction(ordered, cafe.id)
      return true
    } catch (err: unknown) {
      applyOrderedPhotos(previous)
      const msg = err instanceof Error ? err.message : "Reorder failed"
      setPhotoUploadError(msg)
      toast.error(msg)
      setTimeout(() => setPhotoUploadError(""), 4000)
      return false
    } finally {
      setIsReordering(false)
    }
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction
    if (
      target < 0 ||
      target >= allPhotos.length ||
      isUploadingPhoto ||
      isReordering ||
      disabled
    ) {
      return
    }

    const ordered = [...allPhotos]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(target, 0, moved)
    const saved = await persistPhotoOrder(ordered)
    if (saved) toast.success("Photo order updated")
  }

  async function setAsHero(url: string) {
    if (isUploadingPhoto || isReordering || disabled || url === allPhotos[0]) return
    const ordered = [url, ...allPhotos.filter((photoUrl) => photoUrl !== url)]
    const saved = await persistPhotoOrder(ordered)
    if (saved) toast.success("Hero photo updated")
  }

  function handleDragStart(index: number) {
    setDraggingIndex(index)
  }

  function handleDragEnd() {
    setDraggingIndex(null)
  }

  async function handleDrop(targetIndex: number) {
    if (draggingIndex === null || draggingIndex === targetIndex) {
      setDraggingIndex(null)
      return
    }

    if (isUploadingPhoto || isReordering || disabled) {
      setDraggingIndex(null)
      return
    }

    const ordered = [...allPhotos]
    const [moved] = ordered.splice(draggingIndex, 1)
    ordered.splice(targetIndex, 0, moved)
    setDraggingIndex(null)
    const saved = await persistPhotoOrder(ordered)
    if (saved) toast.success("Photo order updated")
  }

  async function handlePhotoFileSelect(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file || !cafe?.id) return

    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append("file", compressed)

    setIsUploadingPhoto(true)
    setPhotoUploadError("")
    try {
      if (!heroUrl) {
        const { url } = await uploadCafeHeroAction(formData, cafe.id)
        setHeroUrl(url)
        toast.success("Hero photo uploaded")
      } else {
        const { url } = await uploadCafePhotoAction(formData, cafe.id)
        setGalleryUrls((prev) => [...prev, url])
        toast.success("Photo uploaded")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setPhotoUploadError(msg)
      toast.error(msg)
      setTimeout(() => setPhotoUploadError(""), 4000)
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ""
    }
  }

  async function handlePhotoDelete(photoUrl: string) {
    if (!cafe?.id) return
    const isHero = photoUrl === heroUrl
    setIsUploadingPhoto(true)
    try {
      await deleteCafePhotoAction(photoUrl, isHero, cafe.id)
      const remaining = allPhotos.filter((url) => url !== photoUrl)
      applyOrderedPhotos(remaining)
      toast.success("Photo deleted")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      setPhotoUploadError(msg)
      toast.error(msg)
      setTimeout(() => setPhotoUploadError(""), 4000)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // --- Sidebar ---
  const [listingStatus, setListingStatus] = React.useState(
    cafe?.status ?? (mode === "create" ? "draft" : "active")
  )
  const [flagNew, setFlagNew] = React.useState(cafe?.is_new ?? false)
  const [flagFeatured, setFlagFeatured] = React.useState(cafe?.is_featured ?? false)
  // The old "Active" switch here was never sent with the save; the listing's
  // visibility is its status, set in the rail or by Publish.

  // --- Save ---
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<{
    title: string
    message: string
    details: string[]
  } | null>(null)

  const missingRequiredFields = React.useMemo(() => {
    const checks = [
      { label: "Cafe name", value: name },
      { label: "Neighborhood", value: neighborhood },
      { label: "City", value: city },
      { label: "Address", value: addressInput },
    ]

    return checks
      .filter((field) => field.value.trim().length === 0)
      .map((field) => field.label)
  }, [addressInput, city, name, neighborhood])

  const hasMissingRequiredFields = missingRequiredFields.length > 0

  function parseSaveError(err: unknown): {
    title: string
    message: string
    details: string[]
  } {
    if (!(err instanceof Error)) {
      return {
        title: "Save failed",
        message: "An unexpected error occurred while saving this cafe.",
        details: ["No structured error details were provided by the server."],
      }
    }

    // Server actions serialize Supabase errors as JSON strings
    try {
      const parsed = JSON.parse(err.message)
      if (parsed && typeof parsed === "object") {
        const details: string[] = []
        if (typeof parsed.code === "string" && parsed.code.length > 0) {
          details.push(`Error code: ${parsed.code}`)
        }
        if (typeof parsed.details === "string" && parsed.details.length > 0) {
          details.push(parsed.details)
        }
        if (typeof parsed.hint === "string" && parsed.hint.length > 0) {
          details.push(`Hint: ${parsed.hint}`)
        }

        return {
          title: "Save failed",
          message:
            typeof parsed.message === "string" && parsed.message.length > 0
              ? parsed.message
              : "The server rejected the save request.",
          details,
        }
      }
    } catch {
      // Not JSON; fall back to raw error message
    }

    return {
      title: "Save failed",
      message: err.message,
      details: [
        "Please review required fields and try again.",
        "If the issue persists, check server logs for more context.",
      ],
    }
  }

  // --- Unsaved changes ---
  // Everything handleSave sends, keyed by the section it lives in, so the save
  // bar can count changes and the section index can dot the sections that
  // have them.
  function snapshot(statusOverride?: "draft" | "active" | "inactive") {
    return {
      basics: { name, neighborhood, city, description },
      location: { addressInput, lat, lng },
      hours,
      tags: { selected: Array.from(selectedTags).sort(), featured: Array.from(featuredTags).sort() },
      menu: menuItems.map((i) => [i.id, i.name, i.description, i.price, i.categoryId, i.isHighlight]),
      social: { instagram, facebook, tiktok, website },
      status: { status: statusOverride ?? listingStatus, flagNew, flagFeatured },
    }
  }
  const [baseline, setBaseline] = React.useState(() => snapshot())
  const current = snapshot()
  const dirtyCount = disabled ? 0 : countChanges(baseline, current)
  const isDirty = (key: keyof typeof current) =>
    JSON.stringify(baseline[key]) !== JSON.stringify(current[key])
  const allowLeave = useLeaveGuard(dirtyCount > 0 && !saving)

  // Required-field errors show once a save has been tried, not while typing
  // a brand-new listing.
  const [triedSave, setTriedSave] = React.useState(false)
  const fieldError = (value: string, label: string) =>
    triedSave && value.trim().length === 0 ? `${label} is required` : null
  const basicsErrors = [fieldError(name, "Café name"), fieldError(neighborhood, "Neighborhood"), fieldError(city, "City")].filter(Boolean)
  const locationError = fieldError(addressInput, "Address")
  const errorCount = basicsErrors.length + (locationError ? 1 : 0)

  function focusFirstError() {
    const id = basicsErrors.length > 0 ? "basics" : "location"
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const [discardOpen, setDiscardOpen] = React.useState(false)
  function discardChanges() {
    // Reloading is the one reset that can't miss a field.
    allowLeave()
    window.location.reload()
  }

  async function handleSave(nextStatus?: "draft" | "active" | "inactive") {
    setTriedSave(true)
    if (hasMissingRequiredFields) {
      setSaveError({
        title: "Required fields missing",
        message: "Fill in all required fields before saving this cafe.",
        details: missingRequiredFields.map((field) => `${field} is required.`),
      })
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        name,
        neighborhood,
        city,
        description,
        address: addressInput,
        lat,
        lng,
        operating_hours: hours,
        social_links: { instagram, facebook, tiktok, website },
        status: nextStatus ?? listingStatus,
        is_new: flagNew,
        is_featured: flagFeatured,
        tagIds: Array.from(selectedTags),
        featuredTagIds: Array.from(featuredTags),
      }
      if (mode === "create") {
        await createCafeAction({
          ...payload,
          menuItems: menuItems.map((item) => ({
            name: item.name,
            description: item.description.trim() || null,
            price: item.price,
            category_id: item.categoryId,
            is_highlight: item.isHighlight,
            image_url: item.imageUrl,
          })),
        })
        toast.success(`${name} created`)
      } else {
        await updateCafeAction(cafe!.id, {
          ...payload,
          menuItems: menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description.trim() || null,
            price: item.price,
            category_id: item.categoryId,
            is_highlight: item.isHighlight,
            image_url: item.imageUrl,
          })),
        })
        toast.success(
          nextStatus === "active" && listingStatus !== "active" ? `${name} is live` : "Changes saved"
        )
      }
      if (nextStatus) setListingStatus(nextStatus)
      // What's on screen is now what's stored: reset the unsaved-changes baseline.
      setBaseline(snapshot(nextStatus))
    } catch (err: unknown) {
      const parsedError = parseSaveError(err)
      toast.error(parsedError.message)
      setSaveError(parsedError)
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const STATUS_META: Record<"draft" | "active" | "inactive", { label: string; tone: Tone }> = {
    draft: { label: "Draft", tone: "warning" },
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "danger" },
  }
  const statusMeta = STATUS_META[listingStatus as "draft" | "active" | "inactive"] ?? STATUS_META.draft

  const sections: SectionIndexItem[] = [
    { id: "basics", label: "Basic info", error: basicsErrors.length > 0, dirty: isDirty("basics") },
    { id: "location", label: "Location", error: !!locationError, dirty: isDirty("location") },
    { id: "hours", label: "Hours", dirty: isDirty("hours") },
    { id: "photos", label: "Photos" },
    { id: "tags", label: "Tags", dirty: isDirty("tags") },
    { id: "menu-categories", label: "Menu categories" },
    { id: "menu-items", label: "Menu items", dirty: isDirty("menu") },
    { id: "social", label: "Social links", dirty: isDirty("social") },
  ]

  const tagPill = (selected: boolean) =>
    selected
      ? "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
      : ""

  const main = (
    <>
      {saveError && !disabled && (
        <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{saveError.title}</p>
          <p className="mt-0.5 text-[13px] text-destructive/90">{saveError.message}</p>
          {saveError.details.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-destructive/80">
              {saveError.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FormSection id="basics" title="Basic info" description="What people see first on the listing.">
        <Field label="Café name" htmlFor="cafe-name" error={fieldError(name, "Café name")}>
          <Input
            id="cafe-name"
            placeholder="e.g. Slowpoke Coffee"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            aria-invalid={!!fieldError(name, "Café name") || undefined}
            className="text-base sm:text-sm"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Neighborhood" htmlFor="cafe-neighborhood" error={fieldError(neighborhood, "Neighborhood")}>
            <Input
              id="cafe-neighborhood"
              placeholder="e.g. IT Park"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={disabled}
              aria-invalid={!!fieldError(neighborhood, "Neighborhood") || undefined}
              className="text-base sm:text-sm"
            />
          </Field>
          <Field label="City" htmlFor="cafe-city" error={fieldError(city, "City")}>
            <Input
              id="cafe-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={disabled}
              aria-invalid={!!fieldError(city, "City") || undefined}
              className="text-base sm:text-sm"
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="cafe-description" optional hint="A few lines on what it serves and what it’s like to stay.">
          <Textarea
            id="cafe-description"
            placeholder="A short description of the café…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none text-base sm:text-sm"
            rows={4}
            disabled={disabled}
          />
        </Field>
      </FormSection>

      <FormSection id="location" title="Location" description="Search an address, type it, or drag the pin. Coordinates can be typed exactly.">
        <Field label="Search address" hint={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? "Picking a result fills the address and moves the pin." : undefined}>
          <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <SearchBox
                accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                value={addressInput}
                onChange={(value) => {
                  setAddressInput(value)
                }}
                onRetrieve={(res) => {
                  const feature = res.features[0]
                  if (!feature) return

                  const [retrievedLng, retrievedLat] = feature.geometry.coordinates

                  setAddressInput(feature.properties.full_address ?? feature.properties.name ?? "")
                  syncCoordinates(retrievedLat, retrievedLng)
                }}
                options={{
                  country: "PH",
                  language: "en",
                  limit: 5,
                  types: new Set(["place", "locality", "neighborhood", "address", "street"] as const),
                }}
                placeholder="Search for an address or place…"
                theme={{
                  variables: {
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-sans)",
                    colorBackground: "var(--background)",
                    colorBackgroundHover: "var(--muted)",
                    colorText: "var(--foreground)",
                    colorSecondary: "var(--muted-foreground)",
                    boxShadow: "var(--shadow-sm)",
                  },
                }}
              />
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Address search is off — set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> to turn it on.
                Use the address and coordinate fields below.
              </p>
            )}
          </div>
        </Field>

        <Field label="Address" htmlFor="cafe-address" error={locationError} hint="The street address shown on the listing.">
          <Input
            id="cafe-address"
            placeholder="Type the exact street address"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            disabled={disabled}
            aria-invalid={!!locationError || undefined}
            className="text-base sm:text-sm"
          />
        </Field>

        <div className="overflow-hidden rounded-xl border">
          <MapPicker lat={lat} lng={lng} onChange={handleMapChange} disabled={disabled} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" htmlFor="cafe-lat">
            <Input
              id="cafe-lat"
              type="number"
              inputMode="decimal"
              step="0.000001"
              min="-90"
              max="90"
              value={latInput}
              onChange={(e) => handleLatInputChange(e.target.value)}
              onBlur={commitLatInput}
              disabled={disabled}
              className="font-mono text-base sm:text-sm"
            />
          </Field>
          <Field label="Longitude" htmlFor="cafe-lng">
            <Input
              id="cafe-lng"
              type="number"
              inputMode="decimal"
              step="0.000001"
              min="-180"
              max="180"
              value={lngInput}
              onChange={(e) => handleLngInputChange(e.target.value)}
              onBlur={commitLngInput}
              disabled={disabled}
              className="font-mono text-base sm:text-sm"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection id="hours" title="Hours" description="Opening and closing times, 24-hour. Turn on Closed for days off.">
        <ul className="divide-y rounded-xl border">
          {DAYS.map(({ key, label }) => {
            const dayHours = hours[key]
            const isClosed = dayHours?.closed ?? false
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className="w-24 shrink-0 text-sm font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`${label} opens`}
                    className="w-24 text-base tabular-nums sm:text-sm"
                    placeholder="08:00"
                    value={dayHours?.open ?? ""}
                    onChange={(e) =>
                      setHours((prev) => ({ ...prev, [key]: { ...prev[key], open: e.target.value } }))
                    }
                    disabled={isClosed || disabled}
                  />
                  <span aria-hidden className="text-muted-foreground">–</span>
                  <Input
                    aria-label={`${label} closes`}
                    className="w-24 text-base tabular-nums sm:text-sm"
                    placeholder="22:00"
                    value={dayHours?.close ?? ""}
                    onChange={(e) =>
                      setHours((prev) => ({ ...prev, [key]: { ...prev[key], close: e.target.value } }))
                    }
                    disabled={isClosed || disabled}
                  />
                </div>
                <label htmlFor={`closed-${key}`} className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground select-none">
                  Closed
                  <Switch
                    id={`closed-${key}`}
                    checked={isClosed}
                    onCheckedChange={(val) =>
                      setHours((prev) => ({ ...prev, [key]: { ...prev[key], closed: val } }))
                    }
                    disabled={disabled}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </FormSection>

      <FormSection
        id="photos"
        title="Photos"
        description={
          <>
            Up to 5. The hero is the cover on the listing; drag or use the arrows to reorder. Photos save as soon as
            they’re added.
            {!cafe?.id && (
              <span className="mt-1 block font-medium text-[#8A5A00]">Save the café first to add photos.</span>
            )}
          </>
        }
      >
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={handlePhotoFileSelect}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {allPhotos.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
              draggable={!disabled && !isUploadingPhoto && !isReordering}
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleDrop(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
              {url === heroUrl && (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
                  Hero
                </span>
              )}
              {!disabled && (
                <>
                  {/* Always visible: hover-only controls would be unreachable on touch. */}
                  <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="bg-background/90"
                      onClick={() => void movePhoto(index, -1)}
                      disabled={index === 0 || isUploadingPhoto || isReordering}
                      aria-label="Move photo left"
                    >
                      <CaretLeft />
                    </Button>
                    <div className="flex gap-1">
                      {url !== heroUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          className="bg-background/90"
                          disabled={isUploadingPhoto || isReordering}
                          onClick={() => void setAsHero(url)}
                          aria-label="Make this the hero photo"
                          title="Make hero"
                        >
                          <Crown />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="bg-background/90 hover:text-destructive"
                        disabled={isUploadingPhoto || isReordering}
                        onClick={() => handlePhotoDelete(url)}
                        aria-label="Delete photo"
                        title="Delete"
                      >
                        <Trash />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="bg-background/90"
                      onClick={() => void movePhoto(index, 1)}
                      disabled={index === allPhotos.length - 1 || isUploadingPhoto || isReordering}
                      aria-label="Move photo right"
                    >
                      <CaretRight />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {allPhotos.length < 5 && !disabled && (
            <button
              type="button"
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[13px] text-muted-foreground outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
              disabled={!cafe?.id || isUploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
            >
              <Plus className="size-5" aria-hidden />
              {isUploadingPhoto ? "Uploading…" : "Add photo"}
            </button>
          )}
        </div>

        {photoUploadError && <p className="text-sm text-destructive">{photoUploadError}</p>}
      </FormSection>

      <FormSection id="tags" title="Tags" description="Pick every tag that fits. Featured tags show on the café card.">
        {Array.from(tagGroups.entries()).map(([category, categoryTags]) => (
          <div key={category} className="flex flex-col gap-2">
            <p className="text-[13px] font-medium">
              {formatCategoryLabel(category)}
              {category === "vibe" && <span className="ml-1.5 font-normal text-muted-foreground">Hidden in the app</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag) => {
                const selected = selectedTags.has(tag.id)
                return (
                  <Button
                    key={tag.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag.id)}
                    disabled={disabled}
                    className={`rounded-full ${tagPill(selected)}`}
                  >
                    {tag.name}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-[13px] font-medium">
            Featured tags
            <span className="ml-1.5 font-normal text-muted-foreground">Shown on the café card</span>
          </p>
          {tags.filter((tag) => selectedTags.has(tag.id)).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags
                .filter((tag) => selectedTags.has(tag.id))
                .map((tag) => {
                  const isFeatured = featuredTags.has(tag.id)
                  return (
                    <Button
                      key={tag.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={isFeatured}
                      onClick={() => toggleFeaturedTag(tag.id)}
                      disabled={disabled}
                      className={`rounded-full ${tagPill(isFeatured)}`}
                    >
                      {tag.name}
                    </Button>
                  )
                })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pick at least one tag above first.</p>
          )}
        </div>
      </FormSection>

      <MenuCategoriesCard
        categories={menuCategories}
        items={menuItems}
        showGlobalCategories={showGlobalMenuCategories}
        cafeId={cafe?.id}
        onCategoryAdded={(cat) => setMenuCategories((prev) => [...prev, cat])}
        onCategoryUpdated={(updated) =>
          setMenuCategories((prev) => prev.map((cat) => (cat.id === updated.id ? updated : cat)))
        }
        onDeleteCategory={handleDeleteCategory}
        disabled={disabled}
        headerAction={
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] text-muted-foreground select-none">
            Show empty Nook categories
            <Switch
              checked={showGlobalMenuCategories}
              onCheckedChange={setShowGlobalMenuCategories}
              disabled={disabled}
            />
          </label>
        }
      />
      <MenuItemsCard
        items={menuItems}
        categories={menuCategories}
        showGlobalCategories={showGlobalMenuCategories}
        cafeId={cafe?.id}
        onToggleHighlight={handleToggleHighlight}
        onDeleteItem={handleDeleteItem}
        onItemAdded={handleItemAdded}
        onItemUpdated={handleItemUpdated}
        onImageUploaded={handleImageUploaded}
        onImageDeleted={handleImageDeleted}
        disabled={disabled}
      />

      <FormSection id="social" title="Social links" description="Full links, including https://.">
        {(
          [
            { id: "instagram", label: "Instagram", icon: InstagramLogo, value: instagram, set: setInstagram, placeholder: "https://instagram.com/…" },
            { id: "facebook", label: "Facebook", icon: FacebookLogo, value: facebook, set: setFacebook, placeholder: "https://facebook.com/…" },
            { id: "tiktok", label: "TikTok", icon: TiktokLogo, value: tiktok, set: setTiktok, placeholder: "https://tiktok.com/@…" },
            { id: "website", label: "Website", icon: Globe, value: website, set: setWebsite, placeholder: "https://…" },
          ] as const
        ).map((link) => (
          <Field key={link.id} label={link.label} htmlFor={`social-${link.id}`} optional>
            <div className="relative">
              <link.icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id={`social-${link.id}`}
                type="url"
                inputMode="url"
                className="pl-9 text-base sm:text-sm"
                placeholder={link.placeholder}
                value={link.value}
                onChange={(e) => link.set(e.target.value)}
                disabled={disabled}
              />
            </div>
          </Field>
        ))}
      </FormSection>
    </>
  )

  const rail = (
    <>
      <RailPanel title="Status">
        <Select
          value={listingStatus}
          onValueChange={(value) => setListingStatus(value as "draft" | "active" | "inactive")}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-full" aria-label="Listing status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft — not in the app</SelectItem>
            <SelectItem value="active">Active — live in the app</SelectItem>
            <SelectItem value="inactive">Inactive — hidden</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="grid">
            <span className="text-sm font-medium">Featured</span>
            <span className="text-xs text-muted-foreground">Promoted in the app</span>
          </span>
          <Switch checked={flagFeatured} onCheckedChange={setFlagFeatured} disabled={disabled} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="grid">
            <span className="text-sm font-medium">New listing</span>
            <span className="text-xs text-muted-foreground">Shows a “New” badge</span>
          </span>
          <Switch checked={flagNew} onCheckedChange={setFlagNew} disabled={disabled} />
        </label>
      </RailPanel>

      {mode === "edit" && cafe && (
        <RailPanel title="Details">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-muted-foreground">Added</dt>
            <dd className="tabular-nums">
              {new Date(cafe.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </dd>
            <dt className="text-muted-foreground">Photos</dt>
            <dd className="tabular-nums">{allPhotos.length} of 5</dd>
            <dt className="text-muted-foreground">Menu</dt>
            <dd className="tabular-nums">{menuItems.length} items</dd>
          </dl>
          {disabled ? (
            <Button asChild className="w-full">
              <Link href={`/admin/cafes/${cafe.id}/edit`}>
                <PencilSimple aria-hidden />
                Edit café
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/admin/cafes/${cafe.id}/preview`}>
                <Eye aria-hidden />
                Preview listing
              </Link>
            </Button>
          )}
        </RailPanel>
      )}

      <SectionIndex items={sections} />
    </>
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Hidden in view mode — the café page provides its own header. */}
      {!disabled && (
        <FormPageHeader
          backHref="/admin/cafes"
          backLabel="Cafés"
          title={mode === "create" ? "Add café" : name.trim() || "Untitled café"}
          meta={<StatusChip tone={statusMeta.tone}>{statusMeta.label}</StatusChip>}
        />
      )}

      <FormLayout main={main} rail={rail} />

      {!disabled && (
        <SaveBar
          dirtyCount={dirtyCount}
          saving={saving}
          errorCount={errorCount}
          onFirstError={focusFirstError}
          onDiscard={mode === "edit" ? () => setDiscardOpen(true) : undefined}
          savedLabel={mode === "create" ? "Not saved yet" : "All changes saved"}
        >
          {listingStatus === "draft" ? (
            <>
              <Button variant="outline" onClick={() => void handleSave("draft")} loading={saving}>
                Save draft
              </Button>
              <Button onClick={() => void handleSave("active")} loading={saving}>
                Publish
              </Button>
            </>
          ) : (
            <Button onClick={() => void handleSave()} loading={saving} disabled={mode === "edit" && dirtyCount === 0}>
              Save changes
            </Button>
          )}
        </SaveBar>
      )}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Discard {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The page goes back to the last saved version. Photos and menu items saved on their own stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardChanges}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
