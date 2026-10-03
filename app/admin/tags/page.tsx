import type { Metadata } from "next"
import { getAllTagsAdmin } from "@/lib/queries/tags"
import { TagsClient } from "@/components/admin/tags-client"

export const metadata: Metadata = { title: "Tags" }

// Tags are a short list, so the page loads them all and the client filters
// by category, status and name without another round trip.
export default async function TagsPage() {
  const tags = await getAllTagsAdmin()
  return <TagsClient tags={tags} />
}
