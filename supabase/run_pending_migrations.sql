-- ============================================
-- PENDING MIGRATIONS TO EXECUTE IN SUPABASE
-- ============================================
-- Execute this SQL in Supabase SQL Editor
-- Date: 2026-02-12
-- ============================================

-- ============================================
-- STEP 1: USER INVITATIONS SYSTEM
-- From: 012_user_invitations.sql
-- ============================================

-- Create invitation_status enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE public.invitation_status AS ENUM (
      'pending',
      'accepted',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  -- Roles: owner is NOT invitable (there can only be one)
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('superadmin', 'admin', 'manager', 'consultant', 'viewer')),
  assigned_company_ids TEXT[] DEFAULT '{}',
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  invitation_note TEXT,
  CONSTRAINT unique_pending_invitation UNIQUE (email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.user_invitations(invited_by);

-- ============================================
-- FUNCTION: apply_invitation_config
-- Applies role and companies when user signs up
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_invitation_config()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find pending invitation for this email
  SELECT *
  INTO invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY invited_at DESC
  LIMIT 1;

  -- If invitation exists, apply configuration
  IF FOUND THEN
    -- Update profile with role and companies
    UPDATE public.profiles
    SET
      role = invitation_record.role,
      assigned_company_ids = invitation_record.assigned_company_ids
    WHERE id = NEW.id;

    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Apply config when profile is created
-- ============================================

DROP TRIGGER IF EXISTS on_profile_created_apply_invitation ON public.profiles;
CREATE TRIGGER on_profile_created_apply_invitation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_invitation_config();

-- ============================================
-- FUNCTION: cleanup_expired_invitations
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;

-- Owner, Superadmin and Admin can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'superadmin', 'admin')
  )
);

-- Owner, Superadmin and Admin can create invitations
CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'superadmin', 'admin')
  )
);

-- Owner, Superadmin and Admin can update invitations
CREATE POLICY "Admins can update invitations"
ON public.user_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'superadmin', 'admin')
  )
);

-- Owner, Superadmin and Admin can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.user_invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'superadmin', 'admin')
  )
);

-- ============================================
-- OPTIONAL: Add kam_display_name to profiles
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kam_display_name TEXT;

COMMENT ON COLUMN public.profiles.kam_display_name IS 'Display name for matching with des_key_account_manager in CRP Portal';

-- ============================================
-- VERIFICATION QUERIES
-- Run these after migration to verify
-- ============================================

-- Check user_invitations table exists
SELECT 'user_invitations table' as check_item,
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_invitations')
            THEN 'OK' ELSE 'MISSING' END as status;

-- Check invitation_status enum
SELECT 'invitation_status enum' as check_item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status')
            THEN 'OK' ELSE 'MISSING' END as status;

-- Check apply_invitation_config function
SELECT 'apply_invitation_config function' as check_item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_invitation_config')
            THEN 'OK' ELSE 'MISSING' END as status;

-- Check trigger
SELECT 'on_profile_created_apply_invitation trigger' as check_item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_created_apply_invitation')
            THEN 'OK' ELSE 'MISSING' END as status;

-- Check RLS is enabled
SELECT 'RLS enabled on user_invitations' as check_item,
       CASE WHEN relrowsecurity THEN 'OK' ELSE 'DISABLED' END as status
FROM pg_class WHERE relname = 'user_invitations';

-- Success message
SELECT '=== MIGRATION COMPLETED SUCCESSFULLY ===' as message;
