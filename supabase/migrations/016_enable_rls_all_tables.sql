-- ============================================
-- Migration: Enable RLS on all tables without security policies
-- Purpose: Secure all tables exposed via Supabase API
-- ============================================

-- ============================================
-- Enable RLS on CRP Portal tables
-- ============================================
ALTER TABLE crp_portal__dt_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_portal__dt_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_portal__dt_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_portal__dt_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_portal__ft_order_head ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_portal__ft_order_line ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read
CREATE POLICY "Authenticated read crp_portal__dt_portal"
  ON crp_portal__dt_portal FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_portal__dt_store"
  ON crp_portal__dt_store FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_portal__dt_company"
  ON crp_portal__dt_company FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_portal__dt_address"
  ON crp_portal__dt_address FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_portal__ft_order_head"
  ON crp_portal__ft_order_head FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_portal__ft_order_line"
  ON crp_portal__ft_order_line FOR SELECT TO authenticated USING (true);

-- ============================================
-- Enable RLS on TPHub tables
-- ============================================
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tphub_delivery_coordinates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tphub_restaurant_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read calendar_events"
  ON calendar_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read tphub_delivery_coordinates_cache"
  ON tphub_delivery_coordinates_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read tphub_restaurant_coordinates"
  ON tphub_restaurant_coordinates FOR SELECT TO authenticated USING (true);

-- ============================================
-- Enable RLS on HubSpot tables
-- ============================================
ALTER TABLE crp_hubspot__dt_contact_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE crp_hubspot__lt_company_contact_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read crp_hubspot__dt_contact_mp"
  ON crp_hubspot__dt_contact_mp FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read crp_hubspot__lt_company_contact_mp"
  ON crp_hubspot__lt_company_contact_mp FOR SELECT TO authenticated USING (true);

-- ============================================
-- Enable RLS on DLT tables (NO policies = block all)
-- ============================================
ALTER TABLE _dlt_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE _dlt_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE _dlt_pipeline_state ENABLE ROW LEVEL SECURITY;

-- Staging tables (if exist)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE _stg_crp_portal__ft_order_head_b7389413 ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770215863_d0b54d ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE dlt_staging_crp_portal__ft_order_line_1770216324_8ca42d ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770218132_beedef ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE dlt_staging_crp_portal__ft_order_head_1770219407_1887ae ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
