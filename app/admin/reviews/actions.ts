"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult =
  | { success: true }
  | { success: false; error: string; code?: string }

type RpcErrorCode =
  | "P0001"
  | "P0002"
  | "22023"
  | "42501"
  | string

const ERROR_MESSAGES: Record<string, string> = {
  P0001: "This report is already finalized and cannot be changed.",
  P0002: "Report not found.",
  "22023":
    "A required note is missing. Please add context (at least 3 characters).",
  "42501": "You are not authorized to perform this action.",
}

function mapRpcError(code: RpcErrorCode | undefined): ActionResult {
  if (!code) {
    return { success: false, error: "An unexpected error occurred.", code: code }
  }
  return {
    success: false,
    error: ERROR_MESSAGES[code] ?? "The moderation action failed.",
    code,
  }
}

async function requireSuperadmin() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error("auth_required")
  }
  if (data.user.app_metadata?.role !== "superadmin") {
    throw new Error("not_authorized")
  }
  return { supabase, userId: data.user.id }
}

function revalidateReportPaths(reportId: string) {
  revalidatePath("/admin/reviews")
  revalidatePath(`/admin/reviews/${reportId}`)
  revalidatePath("/admin/dashboard")
}

// =============================================================================
// 1. Mark under review
// =============================================================================

export async function markUnderReviewAction(
  reportId: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_mark_under_review", {
      p_report_id: reportId,
      p_moderator_id: userId,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 2. Hide review
// =============================================================================

export async function hideReviewAction(
  reportId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_hide_review", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_reason: reason?.trim() || null,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 3. Remove review
// =============================================================================

export async function removeReviewAction(
  reportId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_remove_review", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_reason: reason?.trim() || null,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 4. Restore review
// =============================================================================

export async function restoreReviewAction(
  reportId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_restore_review", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_reason: reason?.trim() || null,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 5. Reject report
// =============================================================================

export async function rejectReportAction(
  reportId: string,
  resolutionNote: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const trimmed = resolutionNote?.trim() ?? ""
    if (trimmed.length < 3) {
      return {
        success: false,
        error: "A rejection reason is required (at least 3 characters).",
      }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_reject_report", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_resolution_note: trimmed,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 6. Resolve report (no review action)
// =============================================================================

export async function resolveReportAction(
  reportId: string,
  note?: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_resolve_report", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_resolution_note: note?.trim() || null,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 7. Warn user
// =============================================================================

export async function warnUserAction(
  reportId: string,
  reason: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const trimmed = reason?.trim() ?? ""
    if (trimmed.length < 3) {
      return {
        success: false,
        error: "A warning message is required (at least 3 characters).",
      }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_warn_user", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_reason: trimmed,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}

// =============================================================================
// 8. Suspend user
// =============================================================================

export async function suspendUserAction(
  reportId: string,
  reason: string
): Promise<ActionResult> {
  try {
    if (!reportId) {
      return { success: false, error: "Report id is required." }
    }
    const trimmed = reason?.trim() ?? ""
    if (trimmed.length < 3) {
      return {
        success: false,
        error: "A suspension reason is required (at least 3 characters).",
      }
    }
    const { supabase, userId } = await requireSuperadmin()
    const { error } = await supabase.rpc("mod_suspend_user", {
      p_report_id: reportId,
      p_moderator_id: userId,
      p_reason: trimmed,
    })
    if (error) return mapRpcError(error.code)
    revalidateReportPaths(reportId)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An unexpected error occurred.",
    }
  }
}
