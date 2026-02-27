-- ============================================
-- TPHub: Sales Projections - Supabase Migration
-- ============================================
-- Persists sales projection configurations per company/brand/address scope.
-- Previously stored in localStorage as a single global object.
-- ============================================

CREATE TABLE IF NOT EXISTS public.sales_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope: hierarchical CRP Portal references (TEXT)
  company_id TEXT NOT NULL,
  brand_id TEXT,
  address_id TEXT,

  -- Projection data (all JSONB)
  config JSONB NOT NULL DEFAULT '{}',                -- SalesProjectionConfig
  baseline_revenue JSONB NOT NULL DEFAULT '{}',      -- ChannelMonthEntry
  target_revenue JSONB NOT NULL DEFAULT '{}',        -- GridChannelMonthData
  target_ads JSONB NOT NULL DEFAULT '{}',            -- GridChannelMonthData
  target_promos JSONB NOT NULL DEFAULT '{}',         -- GridChannelMonthData

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One projection per scope combination
  CONSTRAINT uq_sales_projections_scope
    UNIQUE NULLS NOT DISTINCT (company_id, brand_id, address_id)
);

COMMENT ON TABLE sales_projections IS 'Sales projection targets per company/brand/address scope';
COMMENT ON COLUMN sales_projections.company_id IS 'CRP Portal company ID (required)';
COMMENT ON COLUMN sales_projections.brand_id IS 'CRP Portal brand/store ID (optional, narrows scope)';
COMMENT ON COLUMN sales_projections.address_id IS 'CRP Portal address ID (optional, narrows scope)';
COMMENT ON COLUMN sales_projections.config IS 'SalesProjectionConfig: channels, investment mode, dates';
COMMENT ON COLUMN sales_projections.baseline_revenue IS 'ChannelMonthEntry: baseline revenue per channel';
COMMENT ON COLUMN sales_projections.target_revenue IS 'GridChannelMonthData: target revenue by month×channel';
COMMENT ON COLUMN sales_projections.target_ads IS 'GridChannelMonthData: target ADS spend by month×channel';
COMMENT ON COLUMN sales_projections.target_promos IS 'GridChannelMonthData: target promos by month×channel';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sales_projections_company ON sales_projections(company_id);
CREATE INDEX idx_sales_projections_brand ON sales_projections(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_sales_projections_address ON sales_projections(address_id) WHERE address_id IS NOT NULL;

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================

CREATE OR REPLACE TRIGGER set_sales_projections_updated_at
  BEFORE UPDATE ON sales_projections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (permissive — same pattern as strategic_objectives)
-- ============================================

ALTER TABLE sales_projections ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (portal is internal)
CREATE POLICY "Authenticated users can view sales projections"
  ON sales_projections FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sales projections"
  ON sales_projections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales projections"
  ON sales_projections FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sales projections"
  ON sales_projections FOR DELETE
  USING (auth.role() = 'authenticated');
