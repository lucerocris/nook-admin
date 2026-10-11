import type { Metadata } from "next"

import { ImportsClient } from "@/components/admin/imports/imports-client"
import { IMPORTS_PAGE_SIZE, getImportSummary, getImportsPage } from "@/lib/queries/imports"

export const metadata: Metadata = { title: "Imports" }

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    city?: string
    metro?: string
    tier?: string
    hours?: string
    flag?: string
    search?: string
    sort?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const [result, summary] = await Promise.all([
    getImportsPage({ ...params, page }),
    getImportSummary(),
  ])

  return (
    <ImportsClient
      rows={result.rows}
      page={result.page}
      pageSize={IMPORTS_PAGE_SIZE}
      total={result.total}
      totalPages={result.totalPages}
      missingTable={result.missingTable}
      summary={summary}
    />
  )
}
