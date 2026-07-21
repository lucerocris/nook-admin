"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CafeClaimApprovedEmail from "@/emails/CafeClaimApprovedEmail";
import CafeClaimRejectedEmail from "@/emails/CafeClaimRejectedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// Verified Resend sender on the Nook domain. Kept on nookph.app so the From
// domain matches the brand and the links inside the mail — a mismatched sender
// domain is a spam signal, which is what the old surgestudio.tech address hit.
const MAIL_FROM = process.env.MAIL_FROM ?? "Nook <noreply@nookph.app>";

type ClaimStatus = "under_review" | "approved" | "rejected";
type AuditLogMetadata = Record<string, string | number | boolean | null>;

// This checked only that SOMEONE was signed in, despite the name and the error
// strings — any authenticated user passed. It matters because approveClaimAction
// escalates to the service role and grants app_metadata.role = "cafe_owner", so
// the missing role check was a path to self-granting ownership of any cafe. It
// was masked only by the cafe_claims RLS policy, one policy edit from being live.
async function requireSuperadminId(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Unable to verify superadmin session");
  if (!data.user) throw new Error("Superadmin user not found");
  if (data.user.app_metadata?.role !== "superadmin") {
    throw new Error("Not authorized: superadmin only");
  }
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

    const { data: claim, error: claimError } = await supabase
      .from("cafe_claims")
      .select("id, cafe_id, claimant_id, role")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      console.error("[APPROVE:2] Claim fetch failed", claimError);
      return { success: false as const, error: "Claim not found" };
    }

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

    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
      claim.claimant_id,
      { app_metadata: { role: "cafe_owner", cafe_id: claim.cafe_id } },
    );

    if (metaError) {
      console.error("[APPROVE:4] Auth metadata failed", metaError);
      return { success: false as const, error: "Failed to update user role" };
    }

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

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", claim.claimant_id)
      .single();

    if (ownerProfile?.email && cafeData?.name) {
      // BUSINESS_SITE_URL previously fell back to "https://nook.com" — a domain
      // Nook does not own — so whenever the var was unset (it is documented
      // nowhere and was absent from every env file) every approved owner got an
      // email whose "Go to dashboard" button 404'd on a stranger's site.
      // Fail loudly instead of silently shipping a dead link.
      const businessSiteUrl = process.env.BUSINESS_SITE_URL?.replace(/\/+$/, "");

      if (!businessSiteUrl) {
        console.error(
          "[EMAIL] BUSINESS_SITE_URL is not set — approval email not sent. " +
            "Set it (e.g. https://business.nookph.app) so the dashboard link resolves.",
        );
      }

      const dashboardUrl = businessSiteUrl
        ? `${businessSiteUrl}/owner/dashboard`
        : null;
      // Skip rather than send a broken link: the approval itself already
      // succeeded, and a dead CTA is worse than no email.
      if (dashboardUrl) {
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: MAIL_FROM,
          to: [ownerProfile.email],
          subject: `Your claim for ${cafeData.name} has been approved!`,
          react: (
            <CafeClaimApprovedEmail
              ownerName={ownerProfile.full_name ?? "there"}
              cafeName={cafeData.name}
              dashboardUrl={dashboardUrl}
              email={ownerProfile.email}
            />
          ),
        });

        if (emailError) {
          console.error("[EMAIL] Failed to send approval email:", {
            name: emailError.name,
            message: emailError.message,
          });
        } else {
          console.log("[EMAIL] Approval email sent:", emailData?.id);
        }
      }
    }

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
            from: MAIL_FROM,
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
          console.log("[EMAIL] Rejection email sent:", emailData?.id);
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
