"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CafeClaimApprovedEmail from "@/emails/CafeClaimApprovedEmail";
import CafeClaimRejectedEmail from "@/emails/CafeClaimRejectedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

type ClaimStatus = "under_review" | "approved" | "rejected";
type AuditLogMetadata = Record<string, string | number | boolean | null>;

async function requireSuperadminId(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Unable to verify superadmin session");
  if (!data.user) throw new Error("Superadmin user not found");
  return data.user.id;
}

async function insertAuditLog(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  actorId: string;
  action: string;
  targetId: string;
  metadata?: AuditLogMetadata;
}) {
  const { error } = await params.supabase.from("audit_logs").insert({
    actor_type: "superadmin",
    actor_id: params.actorId,
    action: params.action,
    target_type: "cafe_claim",
    target_id: params.targetId,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.warn(
      "[AUDIT] Non-fatal — failed to write audit log:",
      error.message,
    );
  }
}

async function updateClaimStatus(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  claimId: string;
  status: ClaimStatus;
  reviewedBy?: string;
  rejectionReason?: string;
}) {
  const now = new Date().toISOString();
  const payload: {
    status: ClaimStatus;
    updated_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
    rejection_reason?: string | null;
  } = {
    status: params.status,
    updated_at: now,
  };

  if (params.reviewedBy) {
    payload.reviewed_by = params.reviewedBy;
    payload.reviewed_at = now;
  }

  if (params.rejectionReason !== undefined) {
    payload.rejection_reason = params.rejectionReason;
  }

  const { error } = await params.supabase
    .from("cafe_claims")
    .update(payload)
    .eq("id", params.claimId);

  if (error) throw new Error("Failed to update claim status");
}

export async function markUnderReviewAction(claimId: string) {
  try {
    const supabase = await createClient();
    const actorId = await requireSuperadminId(supabase);

    await updateClaimStatus({ supabase, claimId, status: "under_review" });
    await insertAuditLog({
      supabase,
      actorId,
      action: "claim_marked_under_review",
      targetId: claimId,
    });

    revalidatePath("/admin/claims");
    return { success: true };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function approveClaimAction(claimId: string) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    let actorId: string;
    try {
      actorId = await requireSuperadminId(supabase);
    } catch (e) {
      console.error("[APPROVE:1] Auth failed", e);
      return { success: false as const, error: "Authentication failed" };
    }
    console.log("[APPROVE:1] Auth ok", actorId);

    const { data: claim, error: claimError } = await supabase
      .from("cafe_claims")
      .select("id, cafe_id, claimant_id, role")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      console.error("[APPROVE:2] Claim fetch failed", claimError);
      return { success: false as const, error: "Claim not found" };
    }
    console.log("[APPROVE:2] Claim fetched", claim);

    const now = new Date().toISOString();

    const { error: claimUpdateError } = await supabase
      .from("cafe_claims")
      .update({
        status: "approved",
        reviewed_by: actorId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", claimId);

    if (claimUpdateError) {
      console.error("[APPROVE:3] Claim update failed", claimUpdateError);
      return { success: false as const, error: "Failed to update claim" };
    }
    console.log("[APPROVE:3] Claim status updated");

    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
      claim.claimant_id,
      { app_metadata: { role: "cafe_owner", cafe_id: claim.cafe_id } },
    );

    if (metaError) {
      console.error("[APPROVE:4] Auth metadata failed", metaError);
      return { success: false as const, error: "Failed to update user role" };
    }
    console.log("[APPROVE:4] Auth metadata updated");

    const { error: linkError } = await supabaseAdmin
      .from("cafe_owner_cafe")
      .insert({
        owner_id: claim.claimant_id,
        cafe_id: claim.cafe_id,
        role: claim.role ?? "owner",
      });

    if (linkError) {
      console.error("[APPROVE:5] cafe_owner_cafe insert failed", linkError);
      return {
        success: false as const,
        error: "Failed to create owner–cafe link",
      };
    }
    console.log("[APPROVE:5] cafe_owner_cafe inserted");

    const { data: cafeData, error: cafeError } = await supabaseAdmin
      .from("cafes")
      .update({ is_claimed: true, claimed_at: now })
      .eq("id", claim.cafe_id)
      .select("name")
      .single();

    if (cafeError) {
      console.error("[APPROVE:6] Cafe update failed", cafeError);
      return { success: false as const, error: "Failed to update cafe" };
    }
    console.log("[APPROVE:6] Cafe updated", cafeData);

    console.log("[APPROVE] All steps complete, revalidating");
    revalidatePath("/admin/claims");
    return { success: true };
  } catch (error) {
    console.error("[APPROVE:CATCH] Unhandled exception", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function rejectClaimAction(
  claimId: string,
  rejectionReason: string,
) {
  try {
    const supabase = await createClient();
    const actorId = await requireSuperadminId(supabase);

    if (!rejectionReason.trim())
      throw new Error("Rejection reason is required");

    await updateClaimStatus({
      supabase,
      claimId,
      status: "rejected",
      reviewedBy: actorId,
      rejectionReason: rejectionReason.trim(),
    });

    await insertAuditLog({
      supabase,
      actorId,
      action: "claim_rejected",
      targetId: claimId,
      metadata: { rejection_reason: rejectionReason.trim() },
    });

    const { data: claim } = await supabase
      .from("cafe_claims")
      .select("cafe_id, claimant_id")
      .eq("id", claimId)
      .single();

    if (claim) {
      const [{ data: ownerProfile }, { data: cafeData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", claim.claimant_id)
          .single(),
        supabase.from("cafes").select("name").eq("id", claim.cafe_id).single(),
      ]);

      if (ownerProfile?.email && cafeData?.name) {
        const { data: emailData, error: emailError } = await resend.emails.send(
          {
            from: "Nook <noreply@surgestudio.tech>",
            to: [ownerProfile.email],
            subject: `Your claim for ${cafeData.name} could not be approved`,
            react: (
              <CafeClaimRejectedEmail
                ownerName={ownerProfile.full_name ?? "there"}
                cafeName={cafeData.name}
                rejectionReason={rejectionReason.trim()}
                email={ownerProfile.email}
              />
            ),
          },
        );

        if (emailError) {
          console.error("[EMAIL] Failed to send rejection email:", {
            name: emailError.name,
            message: emailError.message,
          });
        } else {
          console.log(
            "[EMAIL] Rejection email sent:",
            emailData?.id,
            "→",
            ownerProfile.email,
          );
        }
      }
    }

    revalidatePath("/admin/claims");
    return { success: true };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
