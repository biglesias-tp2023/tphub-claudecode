-- ============================================
-- COMPSET (Competitive Set) Tables
-- ============================================
-- Stores competitor data, snapshots, products, and promotions
-- for competitive analysis in delivery platforms.

-- 1. Competitors table
CREATE TABLE IF NOT EXISTS compset_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,           -- CRP Portal company ID
  brand_id TEXT,                      -- CRP Portal brand ID (optional)
  address_id TEXT,                    -- CRP Portal address ID (optional)
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('glovo', 'ubereats', 'justeat')),
  external_store_id TEXT,             -- ID in the delivery platform
  external_store_url TEXT,            -- URL in the delivery platform
  logo_url TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Snapshots table (point-in-time metrics from scraping)
CREATE TABLE IF NOT EXISTS compset_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES compset_competitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  rating NUMERIC(3,2),                -- e.g., 4.35
  review_count INTEGER,
  avg_ticket NUMERIC(8,2),
  delivery_fee NUMERIC(6,2),
  service_fee NUMERIC(6,2),
  min_order NUMERIC(6,2),
  total_products INTEGER,
  total_categories INTEGER,
  delivery_time_min INTEGER,
  active_promo_count INTEGER,
  raw_data JSONB,                     -- Extensible data from scraper
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Products table (scraped menu items)
CREATE TABLE IF NOT EXISTS compset_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES compset_competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  raw_category TEXT,                  -- Original category from scraper
  normalized_category TEXT,           -- Mapped category (set via admin)
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Promotions table (active offers per competitor)
CREATE TABLE IF NOT EXISTS compset_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES compset_competitors(id) ON DELETE CASCADE,
  promo_type TEXT NOT NULL CHECK (promo_type IN (
    'discount_percent', 'discount_amount', 'bogo',
    'free_delivery', 'free_item', 'flash_offer', 'stamp_card'
  )),
  title TEXT,
  description TEXT,
  discount_value NUMERIC,
  discount_unit TEXT,                 -- '%' or '€'
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_compset_competitors_company
  ON compset_competitors(company_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_compset_snapshots_competitor_date
  ON compset_snapshots(competitor_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_compset_products_competitor
  ON compset_products(competitor_id) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_compset_products_unmapped
  ON compset_products(competitor_id) WHERE normalized_category IS NULL AND is_available = true;

CREATE INDEX IF NOT EXISTS idx_compset_promotions_competitor_active
  ON compset_promotions(competitor_id) WHERE is_active = true;

-- ============================================
-- TRIGGERS (updated_at)
-- ============================================

CREATE OR REPLACE FUNCTION update_compset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compset_competitors_updated_at
  BEFORE UPDATE ON compset_competitors
  FOR EACH ROW EXECUTE FUNCTION update_compset_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE compset_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE compset_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE compset_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE compset_promotions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (can be tightened later)
CREATE POLICY "Authenticated users can read competitors"
  ON compset_competitors FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage competitors"
  ON compset_competitors FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read snapshots"
  ON compset_snapshots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert snapshots"
  ON compset_snapshots FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read products"
  ON compset_products FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage products"
  ON compset_products FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read promotions"
  ON compset_promotions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage promotions"
  ON compset_promotions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
