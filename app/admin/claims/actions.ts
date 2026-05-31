"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type ClaimStatus = "under_review" | "approved" | "rejected"

type AuditLogMetadata = Record<string, string | number | boolean | null>

async function requireSuperadminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw new Error("Unable to verify superadmin session")
  }
  if (!data.user) {
    throw new Error("Superadmin user not found")
  }
  return data.user.id
}

async function insertAuditLog(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  actorId: string
  action: string
  targetId: string
  metadata?: AuditLogMetadata
}) {
  const { error } = await params.supabase.from("audit_logs").insert({
    actor_type: "superadmin",
    actor_id: params.actorId,
    action: params.action,
    target_type: "cafe_claim",
    target_id: params.targetId,
    metadata: params.metadata ?? null,
  })

  if (error) {
    throw new Error("Failed to write audit log")
  }
}

async function updateClaimStatus(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  claimId: string
  status: ClaimStatus
  reviewedBy?: string
  rejectionReason?: string
}) {
  const now = new Date().toISOString()
  const payload: {
    status: ClaimStatus
    updated_at: string
    reviewed_by?: string
    reviewed_at?: string
    rejection_reason?: string | null
  } = {
    status: params.status,
    updated_at: now,
  }

  if (params.reviewedBy) {
    payload.reviewed_by = params.reviewedBy
    payload.reviewed_at = now
  }

  if (params.rejectionReason !== undefined) {
    payload.rejection_reason = params.rejectionReason
  }

  const { error } = await params.supabase
    .from("cafe_claims")
    .update(payload)
    .eq("id", params.claimId)

  if (error) {
    throw new Error("Failed to update claim status")
  }
}

export async function markUnderReviewAction(claimId: string) {
  const supabase = await createClient()
  const actorId = await requireSuperadminId(supabase)

  await updateClaimStatus({
    supabase,
    claimId,
    status: "under_review",
  })

  await insertAuditLog({
    supabase,
    actorId,
    action: "claim_marked_under_review",
    targetId: claimId,
  })

  revalidatePath("/admin/claims")
}

export async function approveClaimAction(claimId: string) {
  const supabase = await createClient()
  const actorId = await requireSuperadminId(supabase)

  const { data: claim, error: claimError } = await supabase
    .from("cafe_claims")
    .select("id, cafe_id, claimant_id, role")
    .eq("id", claimId)
    .single()

  if (claimError || !claim) {
    throw new Error("Claim not found")
  }

  const now = new Date().toISOString()

  const { error: claimUpdateError } = await supabase
    .from("cafe_claims")
    .update({
      status: "approved",
      reviewed_by: actorId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", claimId)

  if (claimUpdateError) {
    throw new Error("Failed to approve claim")
  }

  // Stamp role onto auth metadata
  const { error: metaError } = await createAdminClient().auth.admin.updateUserById(
    claim.claimant_id,
    {
      app_metadata: {
        role: "cafe_owner",
        cafe_id: claim.cafe_id,
      },
    }
  )

  if (metaError) {
    throw new Error("Failed to update user role metadata")
  }

  const { error: linkError } = await supabase
    .from("cafe_owner_cafe")
    .insert({
      owner_id: claim.claimant_id,
      cafe_id: claim.cafe_id,
      role: claim.role ?? null,
    })

  if (linkError) {
    throw new Error("Failed to grant cafe access")
  }

  const { error: cafeError } = await supabase
    .from("cafes")
    .update({ is_claimed: true, claimed_at: now })
    .eq("id", claim.cafe_id)

  if (cafeError) {
    throw new Error("Failed to update cafe status")
  }

  await insertAuditLog({
    supabase,
    actorId,
    action: "claim_approved",
    targetId: claimId,
    metadata: {
      cafe_id: claim.cafe_id,
      claimant_id: claim.claimant_id,
      role: "cafe_owner",
    },
  })

  revalidatePath("/admin/claims")
}

export async function rejectClaimAction(claimId: string, rejectionReason: string) {
  const supabase = await createClient()
  const actorId = await requireSuperadminId(supabase)

  if (!rejectionReason.trim()) {
    throw new Error("Rejection reason is required")
  }

  await updateClaimStatus({
    supabase,
    claimId,
    status: "rejected",
    reviewedBy: actorId,
    rejectionReason: rejectionReason.trim(),
  })

  await insertAuditLog({
    supabase,
    actorId,
    action: "claim_rejected",
    targetId: claimId,
    metadata: {
      rejection_reason: rejectionReason.trim(),
    },
  })

  revalidatePath("/admin/claims")
}