import type { Metadata } from "next"
import { notFound } from "next/navigation"
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
import { PublishRequestCard, SentBackNote } from "@/components/admin/publish-request-card"
import { Separator } from "@/components/ui/separator"

interface ViewCafePageProps {
  params: Promise<{ id: string }>
}

export default async function ViewCafePage({ params }: ViewCafePageProps) {
  const { id } = await params
  const cafe = await getCafeById(id)
  if (!cafe) notFound()

  const [tags, categories, invite, owners] = await Promise.all([
    getAllTags(true),
    getCategoriesForCafe(id),
    getInviteForCafe(id),
    getOwnersForCafe(id),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <CafeViewHeader cafeId={id} cafeName={cafe.name} />
      {cafe.status === "draft" && cafe.review_requested_at && (
        <PublishRequestCard
          cafeId={id}
          cafeName={cafe.name}
          requestedAt={cafe.review_requested_at}
        />
      )}
      {cafe.status === "draft" && !cafe.review_requested_at && cafe.review_note && (
        <SentBackNote note={cafe.review_note} />
      )}
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
