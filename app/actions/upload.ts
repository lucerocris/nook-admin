"use server"

import { uploadFile, deleteFile, getKeyFromUrl } from "@/lib/upload"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath }    from "next/cache"

const CAFE_PHOTO_LIMIT = 5
const ALLOWED_TYPES    = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_BYTES   = 10 * 1024 * 1024

function requireCafeId(cafeId: string | undefined): string {
  if (!cafeId) throw new Error("cafeId is required")
  return cafeId
}

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type))
    throw new Error("Only JPG, PNG, and WEBP are allowed")
  if (file.size > MAX_SIZE_BYTES)
    throw new Error("File must be under 10MB")
}

// ── CAFE HERO PHOTO ───────────────────────────────────
// Key: nook/cafes/{cafeId}/hero.{ext}

export async function uploadCafeHeroAction(
  formData: FormData,
  cafeId: string
) {
  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")
  validateFile(file)

  const targetCafeId = requireCafeId(cafeId)
  const buffer       = Buffer.from(await file.arrayBuffer())
  const ext          = file.type.split("/")[1]
  const key          = `nook/cafes/${targetCafeId}/hero.${ext}`

  const url = await uploadFile({ key, buffer, contentType: file.type })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("cafes")
    .update({ featured_image_url: url })
    .eq("id", targetCafeId)

  if (error) throw error

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)

  return { url }
}

// ── CAFE GALLERY PHOTOS ───────────────────────────────
// Key: nook/cafes/{cafeId}/gallery-{timestamp}.{ext}
// Max 5 total (hero + gallery combined)

export async function uploadCafePhotoAction(
  formData: FormData,
  cafeId: string
) {
  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")
  validateFile(file)

  const targetCafeId = requireCafeId(cafeId)
  const supabase     = createAdminClient()

  const { data: cafe } = await supabase
    .from("cafes")
    .select("featured_image_url, photo_urls")
    .eq("id", targetCafeId)
    .single()

  const existing   = (cafe?.photo_urls as string[]) ?? []
  const heroCount  = cafe?.featured_image_url ? 1 : 0
  const totalCount = heroCount + existing.length

  if (totalCount >= CAFE_PHOTO_LIMIT)
    throw new Error(`Maximum ${CAFE_PHOTO_LIMIT} photos per cafe`)

  const buffer    = Buffer.from(await file.arrayBuffer())
  const ext       = file.type.split("/")[1]
  const timestamp = Date.now()
  const key       = `nook/cafes/${targetCafeId}/gallery-${timestamp}.${ext}`

  const url = await uploadFile({ key, buffer, contentType: file.type })

  const updated = [...existing, url]
  const { error } = await supabase
    .from("cafes")
    .update({ photo_urls: updated })
    .eq("id", targetCafeId)

  if (error) throw error

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)

  return { url, total: heroCount + updated.length }
}

// ── DELETE CAFE PHOTO ─────────────────────────────────

export async function deleteCafePhotoAction(
  photoUrl: string,
  isHero: boolean,
  cafeId: string
) {
  const targetCafeId = requireCafeId(cafeId)
  const supabase     = createAdminClient()

  await deleteFile(getKeyFromUrl(photoUrl))

  if (isHero) {
    const { data: cafe } = await supabase
      .from("cafes")
      .select("photo_urls")
      .eq("id", targetCafeId)
      .single()

    const existing   = (cafe?.photo_urls as string[]) ?? []
    const newHero    = existing[0] ?? null
    const newGallery = existing.slice(1)

    await supabase
      .from("cafes")
      .update({ featured_image_url: newHero, photo_urls: newGallery })
      .eq("id", targetCafeId)

  } else {
    const { data: cafe } = await supabase
      .from("cafes")
      .select("photo_urls")
      .eq("id", targetCafeId)
      .single()

    const existing = (cafe?.photo_urls as string[]) ?? []
    const updated  = existing.filter(u => u !== photoUrl)

    await supabase
      .from("cafes")
      .update({ photo_urls: updated })
      .eq("id", targetCafeId)
  }

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)
}

// ── REORDER CAFE PHOTOS ──────────────────────────────
// Persist the visual order by setting the first URL as hero.

export async function reorderCafePhotosAction(
  orderedPhotoUrls: string[],
  cafeId: string
) {
  const targetCafeId = requireCafeId(cafeId)

  if (orderedPhotoUrls.length > CAFE_PHOTO_LIMIT) {
    throw new Error(`Maximum ${CAFE_PHOTO_LIMIT} photos per cafe`)
  }

  const deduped = Array.from(new Set(orderedPhotoUrls.filter(Boolean)))
  const hero = deduped[0] ?? null
  const gallery = deduped.slice(1)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("cafes")
    .update({
      featured_image_url: hero,
      photo_urls: gallery,
    })
    .eq("id", targetCafeId)

  if (error) throw error

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)

  return { hero, gallery }
}

// ── MENU ITEM IMAGE ───────────────────────────────────
// Key: nook/cafes/{cafeId}/menu/{menuItemId}.{ext}

export async function uploadMenuItemImageAction(
  formData: FormData,
  menuItemId: string,
  cafeId: string
) {
  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")
  validateFile(file)

  const targetCafeId = requireCafeId(cafeId)
  const buffer       = Buffer.from(await file.arrayBuffer())
  const ext          = file.type.split("/")[1]
  const key          = `nook/cafes/${targetCafeId}/menu/${menuItemId}.${ext}`

  const url = await uploadFile({ key, buffer, contentType: file.type })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("menu_items")
    .update({ image_url: url })
    .eq("id", menuItemId)

  if (error) throw error

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)

  return { url }
}

// ── DELETE MENU ITEM IMAGE ────────────────────────────

export async function deleteMenuItemImageAction(
  menuItemId: string,
  imageUrl: string,
  cafeId: string
) {
  const targetCafeId = requireCafeId(cafeId)

  await deleteFile(getKeyFromUrl(imageUrl))

  const supabase = createAdminClient()
  await supabase
    .from("menu_items")
    .update({ image_url: null })
    .eq("id", menuItemId)

  revalidatePath(`/admin/cafes/${targetCafeId}/edit`)
}
