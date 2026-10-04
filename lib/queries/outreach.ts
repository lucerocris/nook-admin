import { createAdminClient } from "@/lib/supabase/admin"

export type OutreachCafe = {
  id: string
  name: string
  city: string
  neighborhood: string | null
  created_at: string
  featured_image_url: string | null
  photo_count: number
  instagram: string | null
  facebook: string | null
}

// Saved social links carry tracking params (?hl=en, ?__d=…, share ids); keep
// only the profile path so the DM button lands on the profile.
function cleanProfileUrl(url: string | null | undefined) {
  const raw = url?.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
    const keepQuery = parsed.pathname === "/profile.php"
    return `${parsed.origin}${parsed.pathname}${keepQuery ? parsed.search : ""}`
  } catch {
    return null
  }
}

/** Live cafés nobody has claimed yet, oldest first: the outreach queue. */
export async function getOutreachCafes(): Promise<OutreachCafe[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("cafes")
    .select("id, name, city, neighborhood, created_at, featured_image_url, photo_urls, social_links")
    .eq("status", "active")
    .eq("is_claimed", false)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((c) => {
    const photos = Array.isArray(c.photo_urls) ? c.photo_urls.length : 0
    const social = (c.social_links ?? {}) as { instagram?: string; facebook?: string }
    return {
      id: c.id,
      name: c.name.trim(),
      city: c.city.trim(),
      neighborhood: c.neighborhood,
      created_at: c.created_at,
      featured_image_url: c.featured_image_url,
      photo_count: photos + (c.featured_image_url && photos === 0 ? 1 : 0),
      instagram: cleanProfileUrl(social.instagram),
      facebook: cleanProfileUrl(social.facebook),
    }
  })
}
