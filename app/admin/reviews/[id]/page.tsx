import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportDetailsClient } from "@/components/admin/report-details-client"
import { getReportById } from "@/lib/queries/reports"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const report = await getReportById(id)
  if (!report) {
    return { title: "Report not found" }
  }
  return {
    title: `Report ${report.short_id} — ${report.cafe.name}`,
  }
}

export default async function ReportDetailsPage({ params }: PageProps) {
  const { id } = await params
  const report = await getReportById(id)

  if (!report) {
    notFound()
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <ReportDetailsClient report={report} />
    </div>
  )
}
