import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClaimsListClient, type ClaimRow, type ClaimStatus } from "@/app/admin/claims/components/claims-list-client"

export const metadata: Metadata = { title: "Claims" }

const DEFAULT_STATUSES: ClaimStatus[] = ["pending", "under_review"]
const ALLOWED_STATUSES = new Set<ClaimStatus>([
  "pending",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
])

function toPostgrestList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",")
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const { status: rawStatus, search: rawSearch, page: rawPage } = await searchParams
  const page = rawPage ? Number(rawPage) : 1
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const pageSize = 20
  const from = (safePage - 1) * pageSize
  const to = from + pageSize - 1

  const normalizedStatus = rawStatus?.toLowerCase()
  const status = ALLOWED_STATUSES.has(normalizedStatus as ClaimStatus)
    ? (normalizedStatus as ClaimStatus)
    : undefined

  const search = rawSearch?.trim() ?? ""

  const supabase = createAdminClient()

  let cafeIds: string[] | null = null
  let claimantIds: string[] | null = null

  if (search) {
    const [cafesResult, profilesResult] = await Promise.all([
      supabase.from("cafes").select("id").ilike("name", `%${search}%`),
      supabase.from("profiles").select("id").ilike("email", `%${search}%`),
    ])

    if (cafesResult.error) {
      throw cafesResult.error
    }
    if (profilesResult.error) {
      throw profilesResult.error
    }

    cafeIds = (cafesResult.data ?? []).map((row) => row.id)
    claimantIds = (profilesResult.data ?? []).map((row) => row.id)

    if (cafeIds.length === 0 && claimantIds.length === 0) {
      return (
        <ClaimsListClient
          claims={[]}
          page={safePage}
          total={0}
          totalPages={0}
        />
      )
    }
  }

  let countQuery = supabase
    .from("cafe_claims")
    .select("id", { count: "exact", head: true })

  let dataQuery = supabase
    .from("cafe_claims")
    .select(
      `
        id,
        cafe_id,
        claimant_id,
        status,
        verification_method,
        verification_code,
        created_at,
        role,
        cafes ( id, name, address, neighborhood, city, featured_image_url ),
        profiles ( id, full_name, email, avatar_url )
      `
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status) {
    countQuery = countQuery.eq("status", status)
    dataQuery = dataQuery.eq("status", status)
  } else if (!rawStatus) {
    countQuery = countQuery.in("status", DEFAULT_STATUSES)
    dataQuery = dataQuery.in("status", DEFAULT_STATUSES)
  }

  if (search) {
    if ((cafeIds?.length ?? 0) > 0 && (claimantIds?.length ?? 0) > 0) {
      const cafeList = toPostgrestList(cafeIds ?? [])
      const claimantList = toPostgrestList(claimantIds ?? [])
      countQuery = countQuery.or(
        `cafe_id.in.(${cafeList}),claimant_id.in.(${claimantList})`
      )
      dataQuery = dataQuery.or(
        `cafe_id.in.(${cafeList}),claimant_id.in.(${claimantList})`
      )
    } else if ((cafeIds?.length ?? 0) > 0) {
      countQuery = countQuery.in("cafe_id", cafeIds ?? [])
      dataQuery = dataQuery.in("cafe_id", cafeIds ?? [])
    } else if ((claimantIds?.length ?? 0) > 0) {
      countQuery = countQuery.in("claimant_id", claimantIds ?? [])
      dataQuery = dataQuery.in("claimant_id", claimantIds ?? [])
    }
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

  if (countResult.error) {
    throw countResult.error
  }
  if (dataResult.error) {
    throw dataResult.error
  }

  const total = countResult.count ?? 0
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0

  return (
    <ClaimsListClient
      claims={(dataResult.data ?? []) as ClaimRow[]}
      page={safePage}
      total={total}
      totalPages={totalPages}
    />
  )
}
