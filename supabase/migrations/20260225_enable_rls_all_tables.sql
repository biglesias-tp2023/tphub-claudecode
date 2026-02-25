-- ============================================
-- Migration: Enable RLS on all public tables
-- Date: 2026-02-25
-- Purpose: Secure all 19 tables exposed via PostgREST API
--
-- CONTEXT:
--   All data access filtering was client-side only (Zustand store).
--   A consultant could bypass it via DevTools and query any company's data.
--   This migration adds database-level enforcement using profiles.assigned_company_ids.
--
-- HOW IT WORKS:
--   1. Helper function get_user_company_ids() reads the current user's assigned companies
--   2. Admins/owners/superadmins see ALL data (function returns NULL → policy passes)
--   3. Other roles see only data matching their assigned_company_ids
--   4. DLT/staging tables are blocked entirely (only service_role can access)
--
-- ROLLBACK:
--   If something breaks, run the rollback section at the bottom of this file.
--   It disables RLS on all tables and drops all policies created here.
-- ============================================

BEGIN;

-- ============================================
-- PART 1: Helper function
-- ============================================

-- Returns the company IDs the current user is allowed to access.
-- Returns NULL for unrestricted roles (owner/superadmin/admin) → means "see everything".
-- Returns TEXT[] for restricted roles → used in ANY() comparisons.
-- SECURITY DEFINER: bypasses profiles RLS to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CASE
      WHEN role IN ('owner', 'superadmin', 'admin') THEN NULL
      ELSE COALESCE(assigned_company_ids::text[], '{}')
    END
  FROM public.profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_ids() TO authenticated;

COMMENT ON FUNCTION public.get_user_company_ids IS
  'Returns company IDs the current user can access. NULL = unrestricted (admin/owner). Used by RLS policies.';


-- ============================================
-- PART 2: CRP Portal tables (company-scoped)
-- ============================================

-- --- crp_portal__dt_company ---
ALTER TABLE crp_portal__dt_company ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_portal__dt_company"
  ON crp_portal__dt_company
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pk_id_company::text = ANY(public.get_user_company_ids())
  );

-- --- crp_portal__dt_store ---
ALTER TABLE crp_portal__dt_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_portal__dt_store"
  ON crp_portal__dt_store
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pfk_id_company::text = ANY(public.get_user_company_ids())
  );

-- --- crp_portal__dt_address ---
ALTER TABLE crp_portal__dt_address ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_portal__dt_address"
  ON crp_portal__dt_address
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pfk_id_company::text = ANY(public.get_user_company_ids())
  );

-- --- crp_portal__ft_order_head ---
ALTER TABLE crp_portal__ft_order_head ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_portal__ft_order_head"
  ON crp_portal__ft_order_head
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pfk_id_company::text = ANY(public.get_user_company_ids())
  );

-- --- crp_portal__ft_order_line ---
-- NOTE: pfk_id_company is VARCHAR in this table (no cast needed)
ALTER TABLE crp_portal__ft_order_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_portal__ft_order_line"
  ON crp_portal__ft_order_line
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pfk_id_company = ANY(public.get_user_company_ids())
  );


-- ============================================
-- PART 3: Reference tables (read-only, no company scope)
-- ============================================

-- dt_portal is shared reference data (Glovo/UberEats/JustEat definitions)
ALTER TABLE crp_portal__dt_portal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read: crp_portal__dt_portal"
  ON crp_portal__dt_portal
  FOR SELECT
  TO authenticated
  USING (true);

-- calendar_events are shared (holidays, sports events, etc.)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read: calendar_events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage calendar events
CREATE POLICY "Admin write: calendar_events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (
    public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
  )
  WITH CHECK (
    public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
  );


-- ============================================
-- PART 4: TPHub app tables (company-scoped)
-- ============================================

-- Restaurant coordinates (has company_id TEXT column)
ALTER TABLE tphub_restaurant_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: tphub_restaurant_coordinates"
  ON tphub_restaurant_coordinates
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR company_id = ANY(public.get_user_company_ids())
  );

-- Delivery coordinates cache (not used by frontend, read-only as fallback)
ALTER TABLE tphub_delivery_coordinates_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read: tphub_delivery_coordinates_cache"
  ON tphub_delivery_coordinates_cache
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================
-- PART 5: HubSpot tables (company-scoped)
-- ============================================

-- Company-contact link table (has pk_id_company)
ALTER TABLE crp_hubspot__lt_company_contact_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_hubspot__lt_company_contact_mp"
  ON crp_hubspot__lt_company_contact_mp
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR pk_id_company = ANY(public.get_user_company_ids())
  );

-- Contact table (PII: emails, names — filtered via link table)
ALTER TABLE crp_hubspot__dt_contact_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company-scoped read: crp_hubspot__dt_contact_mp"
  ON crp_hubspot__dt_contact_mp
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
    OR pk_id_contact IN (
      SELECT lcc.pk_id_contact
      FROM crp_hubspot__lt_company_contact_mp lcc
      WHERE lcc.pk_id_company = ANY(public.get_user_company_ids())
    )
  );


-- ============================================
-- PART 6: DLT pipeline tables (blocked for anon/authenticated)
-- Only service_role (used by ETL pipeline) bypasses RLS.
-- ============================================

ALTER TABLE _dlt_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE _dlt_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE _dlt_pipeline_state ENABLE ROW LEVEL SECURITY;

-- No policies = no access for authenticated/anon roles.
-- service_role bypasses RLS automatically.


-- ============================================
-- PART 7: DLT staging tables (blocked, with IF EXISTS safety)
-- These are temporary tables created by the ETL pipeline.
-- They may be dropped/recreated, so we use DO blocks.
-- ============================================

DO $$ BEGIN
  ALTER TABLE _stg_crp_portal__ft_order_head_b7389413 ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770215863_d0b54d ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE dlt_staging_crp_portal__ft_order_line_1770216324_8ca42d ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770218132_beedef ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770219407_1887ae ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- No policies on staging tables = blocked for authenticated/anon.

COMMIT;


-- ============================================
-- ROLLBACK (run manually if something breaks)
-- ============================================
-- Copy-paste this entire block into Supabase SQL Editor:
--
-- BEGIN;
--
-- -- Drop all policies created by this migration
-- DROP POLICY IF EXISTS "Company-scoped read: crp_portal__dt_company" ON crp_portal__dt_company;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_portal__dt_store" ON crp_portal__dt_store;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_portal__dt_address" ON crp_portal__dt_address;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_portal__ft_order_head" ON crp_portal__ft_order_head;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_portal__ft_order_line" ON crp_portal__ft_order_line;
-- DROP POLICY IF EXISTS "Authenticated read: crp_portal__dt_portal" ON crp_portal__dt_portal;
-- DROP POLICY IF EXISTS "Authenticated read: calendar_events" ON calendar_events;
-- DROP POLICY IF EXISTS "Admin write: calendar_events" ON calendar_events;
-- DROP POLICY IF EXISTS "Company-scoped read: tphub_restaurant_coordinates" ON tphub_restaurant_coordinates;
-- DROP POLICY IF EXISTS "Authenticated read: tphub_delivery_coordinates_cache" ON tphub_delivery_coordinates_cache;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_hubspot__lt_company_contact_mp" ON crp_hubspot__lt_company_contact_mp;
-- DROP POLICY IF EXISTS "Company-scoped read: crp_hubspot__dt_contact_mp" ON crp_hubspot__dt_contact_mp;
--
-- -- Disable RLS on all tables
-- ALTER TABLE crp_portal__dt_company DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_portal__dt_store DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_portal__dt_address DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_portal__ft_order_head DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_portal__ft_order_line DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_portal__dt_portal DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tphub_restaurant_coordinates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tphub_delivery_coordinates_cache DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_hubspot__dt_contact_mp DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE crp_hubspot__lt_company_contact_mp DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE _dlt_loads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE _dlt_version DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE _dlt_pipeline_state DISABLE ROW LEVEL SECURITY;
--
-- -- Drop helper function
-- DROP FUNCTION IF EXISTS public.get_user_company_ids();
--
-- COMMIT;
