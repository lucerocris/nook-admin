import { Suspense } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeLikePattern } from "@/lib/utils";
import {
  ClaimsListClient,
  type ClaimRow,
  type ClaimStatus,
  type ClaimStatusCounts,
} from "@/app/admin/claims/components/claims-list-client";

export const metadata: Metadata = { title: "Claims" };

const DEFAULT_STATUSES: ClaimStatus[] = ["pending", "under_review"];
const ALLOWED_STATUSES = new Set<ClaimStatus>([
  "pending",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
]);

// Tab counts ignore the search box, like every other table page: they say how
// much sits in each status, not how much matches what was typed.
async function getStatusCounts(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<{ counts: ClaimStatusCounts; oldestOpenAt: string | null }> {
  const statuses = [...ALLOWED_STATUSES];
  const [countResults, oldestResult] = await Promise.all([
    Promise.all(
      statuses.map((s) =>
        supabase
          .from("cafe_claims")
          .select("id", { count: "exact", head: true })
          .eq("status", s),
      ),
    ),
    supabase
      .from("cafe_claims")
      .select("created_at")
      .in("status", DEFAULT_STATUSES)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const counts = {} as ClaimStatusCounts;
  statuses.forEach((s, i) => {
    const result = countResults[i];
    if (result.error) throw result.error;
    counts[s] = result.count ?? 0;
  });
  if (oldestResult.error) throw oldestResult.error;

  return {
    counts,
    oldestOpenAt: oldestResult.data?.[0]?.created_at ?? null,
  };
}

function toPostgrestList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",");
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const {
    status: rawStatus,
    search: rawSearch,
    page: rawPage,
  } = await searchParams;

  const safePage = Math.max(
    1,
    Number.isFinite(Number(rawPage)) ? Number(rawPage) : 1,
  );
  const pageSize = 20;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const normalizedStatus = rawStatus?.toLowerCase();
  const status = ALLOWED_STATUSES.has(normalizedStatus as ClaimStatus)
    ? (normalizedStatus as ClaimStatus)
    : undefined;

  const search = rawSearch?.trim() ?? "";
  const supabase = createAdminClient();
  const statusCountsPromise = getStatusCounts(supabase);
  // Started early so it runs alongside the search lookups; if one of those
  // throws first, this keeps the pending count query from surfacing as an
  // unhandled rejection. Awaiting it below still throws its own errors.
  statusCountsPromise.catch(() => {});

  let cafeIds: string[] | null = null;
  let claimantIds: string[] | null = null;

  if (search) {
    const [cafesResult, profilesResult] = await Promise.all([
      supabase.from("cafes").select("id").ilike("name", `%${escapeLikePattern(search)}%`),
      supabase.from("profiles").select("id").ilike("email", `%${escapeLikePattern(search)}%`),
    ]);

    if (cafesResult.error) throw cafesResult.error;
    if (profilesResult.error) throw profilesResult.error;

    cafeIds = (cafesResult.data ?? []).map((row) => row.id);
    claimantIds = (profilesResult.data ?? []).map((row) => row.id);

    if (cafeIds.length === 0 && claimantIds.length === 0) {
      const { counts, oldestOpenAt } = await statusCountsPromise;
      return (
        <Suspense fallback={null}>
          <ClaimsListClient
            claims={[]}
            page={safePage}
            pageSize={pageSize}
            total={0}
            totalPages={0}
            statusCounts={counts}
            oldestOpenAt={oldestOpenAt}
          />
        </Suspense>
      );
    }
  }

  let countQuery = supabase
    .from("cafe_claims")
    .select("id", { count: "exact", head: true });

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
      cafes!inner ( id, name, address, neighborhood, city, featured_image_url ),
      profiles ( id, full_name, email, avatar_url )
    `,
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  } else if (!rawStatus) {
    countQuery = countQuery.in("status", DEFAULT_STATUSES);
    dataQuery = dataQuery.in("status", DEFAULT_STATUSES);
  }

  if (search) {
    const hasCafes = (cafeIds?.length ?? 0) > 0;
    const hasClaimants = (claimantIds?.length ?? 0) > 0;

    if (hasCafes && hasClaimants) {
      const filter = `cafe_id.in.(${toPostgrestList(cafeIds!)}),claimant_id.in.(${toPostgrestList(claimantIds!)})`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    } else if (hasCafes) {
      countQuery = countQuery.in("cafe_id", cafeIds!);
      dataQuery = dataQuery.in("cafe_id", cafeIds!);
    } else if (hasClaimants) {
      countQuery = countQuery.in("claimant_id", claimantIds!);
      dataQuery = dataQuery.in("claimant_id", claimantIds!);
    }
  }

  const [countResult, dataResult, { counts, oldestOpenAt }] =
    await Promise.all([countQuery, dataQuery, statusCountsPromise]);

  if (countResult.error) throw countResult.error;
  if (dataResult.error) throw dataResult.error;

  const total = countResult.count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return (
    // The route's loading skeleton (app/admin/loading.tsx) covers navigation;
    // this boundary only satisfies useSearchParams in the client list.
    <Suspense fallback={null}>
      <ClaimsListClient
        claims={(dataResult.data ?? []) as unknown as ClaimRow[]}
        page={safePage}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        statusCounts={counts}
        oldestOpenAt={oldestOpenAt}
      />
    </Suspense>
  );
}
