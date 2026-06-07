-- =============================================================================
-- Moderation actions: enum extension + RPC functions
-- =============================================================================
-- Atomic, server-authoritative moderation primitives.
-- Each function:
--   1. Verifies the caller is a superadmin via auth.jwt() (NOT user_metadata).
--   2. Locks the report row with SELECT ... FOR UPDATE to serialize
--      concurrent moderators.
--   3. Inserts an immutable audit row in review_moderation_actions
--      (append-only — this function never UPDATEs or DELETEs that table).
--   4. Updates reviews / review_reports / profiles as required.
--   5. Returns the new audit row.
--
-- All writes happen in a single transaction. If any step fails, the whole
-- function rolls back, leaving the database in a consistent state.
-- =============================================================================

-- 1. Extend the action enum so we can record "marked under review" events.
--    Safe to re-run: the IF NOT EXISTS guard makes this idempotent.
ALTER TYPE moderation_action ADD VALUE IF NOT EXISTS 'under_review';

-- 2. Helper: raises '42501' insufficient_privilege if the caller is not
--    a superadmin. Centralizes the check so every action RPC has the same
--    authorization semantics.
CREATE OR REPLACE FUNCTION mod_assert_superadmin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- 3. Helper: raises 'P0002' if the report does not exist, or 'P0001' if
--    the report is in a terminal state (resolved / rejected). The terminal
--    check is optional via p_allow_finalized — restore_review uses it.
CREATE OR REPLACE FUNCTION mod_lock_report(
  p_report_id       uuid,
  p_allow_finalized boolean DEFAULT false
)
RETURNS review_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report review_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_report
  FROM review_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF (NOT p_allow_finalized)
     AND v_report.status IN ('resolved', 'rejected') THEN
    RAISE EXCEPTION 'report_already_finalized' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_report;
END;
$$;


-- =============================================================================
-- 4. mod_mark_under_review
--    Claim a pending report. No review change.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_mark_under_review(
  p_report_id    uuid,
  p_moderator_id uuid
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'under_review', p_moderator_id, NULL, NULL)
  RETURNING * INTO v_action;

  UPDATE review_reports
  SET status     = 'under_review',
      updated_at = now()
  WHERE id = p_report_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 5. mod_hide_review
--    Hides a review and resolves the report as a valid report.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_hide_review(
  p_report_id    uuid,
  p_moderator_id uuid,
  p_reason       text DEFAULT NULL
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'hide', p_moderator_id, p_reason, NULL)
  RETURNING * INTO v_action;

  UPDATE reviews
  SET moderation_status = 'hidden',
      moderated_at      = now(),
      moderated_by      = p_moderator_id
  WHERE id = v_report.review_id;

  UPDATE review_reports
  SET status          = 'resolved',
      resolution_type = 'valid_report',
      reviewed_by     = p_moderator_id,
      reviewed_at     = now(),
      updated_at      = now()
  WHERE id = p_report_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 6. mod_remove_review
--    Permanently removes a review and resolves the report.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_remove_review(
  p_report_id    uuid,
  p_moderator_id uuid,
  p_reason       text DEFAULT NULL
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'remove', p_moderator_id, p_reason, NULL)
  RETURNING * INTO v_action;

  UPDATE reviews
  SET moderation_status = 'removed',
      moderated_at      = now(),
      moderated_by      = p_moderator_id
  WHERE id = v_report.review_id;

  UPDATE review_reports
  SET status          = 'resolved',
      resolution_type = 'valid_report',
      reviewed_by     = p_moderator_id,
      reviewed_at     = now(),
      updated_at      = now()
  WHERE id = p_report_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 7. mod_restore_review
--    Reverts a hidden/removed review back to visible. The report is left
--    in its current terminal state (so the audit trail reflects that the
--    report was closed but the review was later restored).
--    Allowed even when the report is finalized (p_allow_finalized = true).
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_restore_review(
  p_report_id    uuid,
  p_moderator_id uuid,
  p_reason       text DEFAULT NULL
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, true);

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'restore', p_moderator_id, p_reason, NULL)
  RETURNING * INTO v_action;

  UPDATE reviews
  SET moderation_status = 'visible',
      moderated_at      = now(),
      moderated_by      = p_moderator_id
  WHERE id = v_report.review_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 8. mod_reject_report
--    Dismisses the report as invalid. Review is NOT touched.
--    Logged as action='restore' with metadata.decision='report_rejected'
--    per the spec.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_reject_report(
  p_report_id      uuid,
  p_moderator_id   uuid,
  p_resolution_note text
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  IF p_resolution_note IS NULL OR length(trim(p_resolution_note)) < 3 THEN
    RAISE EXCEPTION 'resolution_note_required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (
      v_report.review_id,
      'restore',
      p_moderator_id,
      p_resolution_note,
      jsonb_build_object('decision', 'report_rejected')
    )
  RETURNING * INTO v_action;

  UPDATE review_reports
  SET status          = 'rejected',
      resolution_type = 'invalid_report',
      resolution_note = p_resolution_note,
      reviewed_by     = p_moderator_id,
      reviewed_at     = now(),
      updated_at      = now()
  WHERE id = p_report_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 9. mod_resolve_report
--    Closes the report as 'resolved' without taking action on the review.
--    No policy violation was found, but the report still needs to be
--    closed for queue hygiene. Logged as action='restore' with
--    metadata.decision='report_resolved'.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_resolve_report(
  p_report_id      uuid,
  p_moderator_id   uuid,
  p_resolution_note text DEFAULT NULL
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (
      v_report.review_id,
      'restore',
      p_moderator_id,
      p_resolution_note,
      jsonb_build_object('decision', 'report_resolved')
    )
  RETURNING * INTO v_action;

  UPDATE review_reports
  SET status          = 'resolved',
      resolution_type = 'invalid_report',
      resolution_note = COALESCE(p_resolution_note, resolution_note),
      reviewed_by     = p_moderator_id,
      reviewed_at     = now(),
      updated_at      = now()
  WHERE id = p_report_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 10. mod_warn_user
--     Records a warning to the review's author. No state changes anywhere.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_warn_user(
  p_report_id    uuid,
  p_moderator_id uuid,
  p_reason       text
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'warn_user', p_moderator_id, p_reason, NULL)
  RETURNING * INTO v_action;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 11. mod_suspend_user
--     Suspends the review's author. Review and report are not modified.
-- =============================================================================
CREATE OR REPLACE FUNCTION mod_suspend_user(
  p_report_id    uuid,
  p_moderator_id uuid,
  p_reason       text
)
RETURNS review_moderation_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  review_reports%ROWTYPE;
  v_review  reviews%ROWTYPE;
  v_action  review_moderation_actions%ROWTYPE;
BEGIN
  PERFORM mod_assert_superadmin();
  v_report := mod_lock_report(p_report_id, false);

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_review FROM reviews WHERE id = v_report.review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO review_moderation_actions
    (review_id, action, moderator_id, reason, metadata)
  VALUES
    (v_report.review_id, 'suspend_user', p_moderator_id, p_reason, NULL)
  RETURNING * INTO v_action;

  UPDATE profiles
  SET is_suspended = true
  WHERE id = v_review.user_id;

  RETURN v_action;
END;
$$;


-- =============================================================================
-- 12. Grants
-- =============================================================================
GRANT EXECUTE ON FUNCTION mod_assert_superadmin        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_lock_report              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_mark_under_review        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_hide_review              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_remove_review            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_restore_review           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_reject_report            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_resolve_report           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_warn_user                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mod_suspend_user             TO authenticated, service_role;
