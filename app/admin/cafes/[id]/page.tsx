import type { Metadata } from "next"
import { getCafeById } from "@/lib/queries/cafes"

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const cafe = await getCafeById(id)
  return { title: cafe?.name ?? "Cafe" }
}
import { getAllTags } from "@/lib/queries/tags"
import { getCategoriesForCafe } from "@/lib/queries/menu"
import { getInviteForCafe, getOwnersForCafe } from "@/lib/queries/invites"
import { CafeViewHeader } from "@/components/admin/cafe-view-header"
import { CafeEditorForm } from "@/components/admin/cafe-editor-form"
import { OwnerAccessCard } from "@/components/admin/owner-access-card"
import { Separator } from "@/components/ui/separator"

interface ViewCafePageProps {
  params: Promise<{ id: string }>
}

export default async function ViewCafePage({ params }: ViewCafePageProps) {
  const { id } = await params
  const [cafe, tags, categories, invite, owners] = await Promise.all([
    getCafeById(id),
    getAllTags(true),
    getCategoriesForCafe(id),
    getInviteForCafe(id),
    getOwnersForCafe(id),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <CafeViewHeader cafeId={id} cafeName={cafe.name} />
      <CafeEditorForm
        mode="edit"
        cafe={cafe}
        tags={tags}
        categories={categories}
        disabled={true}
      />

      {/* Owner Access. Was rendered only when an invite already existed, which
          meant the one state that needs an action — no owner, no invite — showed
          nothing at all, while the dashboard told you unclaimed cafes "need an
          owner account created". */}
      <div className="mt-8">
        <Separator className="mb-8" />
        <OwnerAccessCard cafeId={id} invite={invite} owners={owners} />
      </div>
    </div>
  )
}
