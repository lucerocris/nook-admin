"use client"

import Link from "next/link"
import { ArrowLeft, Eye, PencilSimple, Info } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { PageTitle } from "@/components/admin/page-header"

interface CafeViewHeaderProps {
  cafeId: string
  cafeName: string
}

export function CafeViewHeader({ cafeId, cafeName }: CafeViewHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/cafes">
              <ArrowLeft />
            </Link>
          </Button>
          <PageTitle size="sm" eyebrow="Cafe listing" title={cafeName} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/cafes/${cafeId}/preview`}>
              <Eye />
              Preview
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/cafes/${cafeId}/edit`}>
              <PencilSimple />
              Edit Listing
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6 dark:border-amber-800 dark:bg-amber-950">
        <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          You are viewing this listing in read-only mode.{" "}
          <Link
            href={`/admin/cafes/${cafeId}/edit`}
            className="font-medium underline underline-offset-2 cursor-pointer"
          >
            Click here to edit.
          </Link>
        </p>
      </div>
    </>
  )
}
