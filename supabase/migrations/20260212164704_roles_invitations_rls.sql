-- ============================================
-- CONSOLIDATED MIGRATION: Roles & Invitations System
-- ============================================
-- Execute this SINGLE FILE in Supabase SQL Editor
-- Date: 2026-02-12
--
-- This file combines:
-- 1. 017_roles_v2.sql - Role system with owner protection
-- 2. 012_user_invitations.sql - Invitation system
-- 3. 018_fix_profiles_recursion.sql - Fix RLS infinite recursion
-- ============================================

-- ============================================
-- PART 1: ROLE SYSTEM (from 017_roles_v2.sql)
-- ============================================

-- 1.1 Extend roles in profiles table
-- First drop existing constraint if exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with all roles
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('owner', 'superadmin', 'admin', 'manager', 'consultant', 'viewer'));

-- 1.2 Create unique index for owner (only one can exist)
DROP INDEX IF EXISTS idx_profiles_owner_unique;
CREATE UNIQUE INDEX idx_profiles_owner_unique
ON profiles (role) WHERE role = 'owner';

-- 1.3 Function to protect owner from deletion/role change
CREATE OR REPLACE FUNCTION protect_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Cannot delete owner
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot delete owner account';
  END IF;

  -- Cannot change owner's role to another role
  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner' THEN
    RAISE EXCEPTION 'Cannot change owner role';
  END IF;

  -- Cannot promote someone to owner if one already exists
  IF TG_OP = 'UPDATE' AND NEW.role = 'owner' AND OLD.role != 'owner' THEN
    RAISE EXCEPTION 'Cannot promote to owner - owner already exists';
  END IF;

  -- Cannot create a new owner if one already exists
  IF TG_OP = 'INSERT' AND NEW.role = 'owner' THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'owner') THEN
      RAISE EXCEPTION 'Owner already exists - cannot create another owner';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and create new one
DROP TRIGGER IF EXISTS protect_owner_trigger ON profiles;
CREATE TRIGGER protect_owner_trigger
BEFORE INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_owner();

-- 1.4 Set Bruno as owner
-- Temporarily disable trigger for initial setup
ALTER TABLE profiles DISABLE TRIGGER protect_owner_trigger;

UPDATE profiles
SET role = 'owner'
WHERE email = 'biglesias@thinkpaladar.com';

-- Re-enable trigger
ALTER TABLE profiles ENABLE TRIGGER protect_owner_trigger;

-- 1.5 Documentation comments
COMMENT ON INDEX idx_profiles_owner_unique IS 'Ensures only one owner can exist in the system';
COMMENT ON FUNCTION protect_owner() IS 'Trigger function that protects the owner from being deleted or having their role changed';

-- ============================================
-- PART 2: INVITATION SYSTEM (from 012_user_invitations.sql)
-- ============================================

-- 2.1 Create invitation_status enum (if not exists)
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

-- 2.2 Create user_invitations table
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

-- 2.3 Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.user_invitations(invited_by);

-- 2.4 Function to apply invitation config when user signs up
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

-- 2.5 Trigger to apply config when profile is created
DROP TRIGGER IF EXISTS on_profile_created_apply_invitation ON public.profiles;
CREATE TRIGGER on_profile_created_apply_invitation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_invitation_config();

-- 2.6 Function to cleanup expired invitations
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

-- 2.7 RLS for user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;

-- 2.8 Optional: Add kam_display_name to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kam_display_name TEXT;

COMMENT ON COLUMN public.profiles.kam_display_name IS 'Display name for matching with des_key_account_manager in CRP Portal';

-- ============================================
-- PART 3: FIX RLS RECURSION (from 018_fix_profiles_recursion.sql)
-- ============================================

-- 3.1 Create SECURITY DEFINER function to get current user role
-- This function does NOT trigger RLS because it's SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 3.2 Drop all existing profiles policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own non-role fields" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- 3.3 Create new policies using the function (no recursion)

-- SELECT: Users see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- SELECT: Owner, Superadmin, Admin see all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Owner and Superadmin can update any profile
CREATE POLICY "Owner and superadmin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.get_current_user_role() IN ('owner', 'superadmin'))
  WITH CHECK (public.get_current_user_role() IN ('owner', 'superadmin'));

-- DELETE: Only admins can delete (except owner)
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
    AND role != 'owner'
  );

-- INSERT: Users can insert their own profile (needed for handle_new_user trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 3.4 Create RLS policies for user_invitations using the same function
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations FOR SELECT
USING (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

CREATE POLICY "Admins can update invitations"
ON public.user_invitations FOR UPDATE
USING (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

CREATE POLICY "Admins can delete invitations"
ON public.user_invitations FOR DELETE
USING (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

-- 3.5 Documentation comment
COMMENT ON FUNCTION public.get_current_user_role() IS
  'Returns the role of the current authenticated user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the migration to verify:

-- Check Bruno is owner:
-- SELECT email, role FROM profiles WHERE email = 'biglesias@thinkpaladar.com';

-- Check roles constraint:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'profiles_role_check';

-- Check user_invitations table exists:
-- SELECT * FROM user_invitations LIMIT 1;

-- Check get_current_user_role function:
-- SELECT public.get_current_user_role();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
