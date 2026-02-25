-- ============================================
-- Migration: Revert permissive invitations INSERT policy
-- Date: 2026-03-01
-- Purpose: Replace the temporary WITH CHECK (true) policy from
--          20260213100000_fix_invitations_insert_policy_permissive.sql
--          with a proper admin-role-checked policy.
--
-- CONTEXT:
--   The permissive policy was introduced as a temporary debugging measure.
--   It allows ANY authenticated user to create invitations, bypassing
--   the admin role check. This migration restores proper authorization.
--
-- ROLLBACK: See bottom of file.
-- ============================================

BEGIN;

-- Drop the permissive policy
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;

-- Recreate with proper admin check (same pattern as 20260213090000)
CREATE POLICY "Admins can create invitations"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
  );

COMMIT;


-- ============================================
-- ROLLBACK (if invitations break again)
-- ============================================
-- DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
-- CREATE POLICY "Admins can create invitations"
--   ON public.user_invitations FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
