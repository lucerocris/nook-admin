import { notFound } from "next/navigation"
import { getCafeById } from "@/lib/queries/cafes"
import { getAllTags } from "@/lib/queries/tags"
import { getCategoriesForCafe } from "@/lib/queries/menu"
import { CafeEditorForm } from "@/components/admin/cafe-editor-form"

interface EditCafePageProps {
  params: Promise<{ id: string }>
}

export default async function EditCafePage({ params }: EditCafePageProps) {
  const { id } = await params
  const cafe = await getCafeById(id)
  if (!cafe) notFound()

  const [tags, categories] = await Promise.all([
    getAllTags(true),
    getCategoriesForCafe(id),
  ])

  return (
    <CafeEditorForm
      mode="edit"
      cafe={cafe}
      tags={tags}
      categories={categories}
    />
  )
}
