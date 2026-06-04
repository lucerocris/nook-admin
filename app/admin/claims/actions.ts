"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CafeClaimApprovedEmail from "@/emails/CafeClaimApprovedEmail";
import CafeClaimRejectedEmail from "@/emails/CafeClaimRefectedEmail";

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
}

export async function approveClaimAction(claimId: string) {
  const supabase = await createClient();
  const actorId = await requireSuperadminId(supabase);

  // 1. Fetch claim
  const { data: claim, error: claimError } = await supabase
    .from("cafe_claims")
    .select("id, cafe_id, claimant_id, role")
    .eq("id", claimId)
    .single();

  if (claimError || !claim) throw new Error("Claim not found");

  const now = new Date().toISOString();

  // 2. Mark claim approved
  const { error: claimUpdateError } = await supabase
    .from("cafe_claims")
    .update({
      status: "approved",
      reviewed_by: actorId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", claimId);

  if (claimUpdateError) throw claimUpdateError;

  // 3. Set auth metadata
  const { error: metaError } =
    await createAdminClient().auth.admin.updateUserById(claim.claimant_id, {
      app_metadata: { role: "cafe_owner", cafe_id: claim.cafe_id },
    });

  if (metaError) throw metaError;

  // 4. Create owner–cafe link
  const { error: linkError } = await supabase.from("cafe_owner_cafe").insert({
    owner_id: claim.claimant_id,
    cafe_id: claim.cafe_id,
    role: claim.role ?? "owner",
  });

  if (linkError) throw linkError;

  // 5. Mark cafe as claimed
  const { data: cafeData, error: cafeError } = await supabase
    .from("cafes")
    .update({ is_claimed: true, claimed_at: now })
    .eq("id", claim.cafe_id)
    .select("name")
    .single();

  if (cafeError) throw cafeError;

  // 6. Audit log (non-fatal)
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
  });

  // 7. Send approval email (non-fatal)
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", claim.claimant_id)
    .single();

  if (ownerProfile?.email && cafeData?.name) {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Nook <noreply@surgestudio.tech>",
      to: [ownerProfile.email],
      subject: `Your claim for ${cafeData.name} has been approved!`,
      react: CafeClaimApprovedEmail({
        ownerName: ownerProfile.full_name ?? "there",
        cafeName: cafeData.name,
        email: ownerProfile.email,
        dashboardUrl: "https://business.nookapp.ph/owner/dashboard",
      }),
    });

    if (emailError) {
      console.error("[EMAIL] Failed to send approval email:", {
        name: emailError.name,
        message: emailError.message,
      });
    } else {
      console.log(
        "[EMAIL] Approval email sent:",
        emailData?.id,
        "→",
        ownerProfile.email,
      );
    }
  } else {
    console.warn("[EMAIL] Skipped — missing owner email or cafe name", {
      email: ownerProfile?.email,
      cafeName: cafeData?.name,
    });
  }

  revalidatePath("/admin/claims");
}

export async function rejectClaimAction(
  claimId: string,
  rejectionReason: string,
) {
  const supabase = await createClient();
  const actorId = await requireSuperadminId(supabase);

  if (!rejectionReason.trim()) throw new Error("Rejection reason is required");

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
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Nook <noreply@surgestudio.tech>",
        to: [ownerProfile.email],
        subject: `Your claim for ${cafeData.name} could not be approved`,
        react: CafeClaimRejectedEmail({
          ownerName: ownerProfile.full_name ?? "there",
          cafeName: cafeData.name,
          rejectionReason: rejectionReason.trim(),
          email: ownerProfile.email,
        }),
      });

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
}
