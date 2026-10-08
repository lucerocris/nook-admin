import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PhotoDetailsClient } from "@/components/admin/gallery/photo-details-client"
import { getPhotoById } from "@/lib/queries/gallery"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const photo = await getPhotoById(id)
  if (!photo) return { title: "Photo not found" }
  return { title: `Photo at ${photo.cafe.name}` }
}

export default async function PhotoPage({ params }: PageProps) {
  const { id } = await params
  const photo = await getPhotoById(id)
  if (!photo) notFound()
  return <PhotoDetailsClient photo={photo} />
}
