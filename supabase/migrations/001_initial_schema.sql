-- ============================================
-- TPHub Supabase Migration: Initial Schema
-- ============================================
-- This migration creates the core tables for TPHub data
-- Previously stored in AWS Athena, now migrated to Supabase PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. COMPANIES (Companias)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE,                    -- pk_id_company from Athena
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_external_id ON companies(external_id);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_active ON companies(is_active);

-- ============================================
-- 2. BRANDS (Marcas)
-- ============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE,                    -- pk_id_store from Athena
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brands_external_id ON brands(external_id);
CREATE INDEX idx_brands_company_id ON brands(company_id);
CREATE INDEX idx_brands_active ON brands(is_active);

-- ============================================
-- 3. AREAS (Areas geograficas)
-- ============================================
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  timezone TEXT DEFAULT 'Europe/Madrid',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_areas_external_id ON areas(external_id);
CREATE INDEX idx_areas_active ON areas(is_active);

-- ============================================
-- 4. RESTAURANTS (Establecimientos)
-- ============================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE,                    -- pk_id_address from Athena
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_radius_km DECIMAL(4, 2) DEFAULT 3.0,
  active_channels TEXT[] DEFAULT '{}',           -- ['glovo', 'ubereats', 'justeat']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_restaurants_external_id ON restaurants(external_id);
CREATE INDEX idx_restaurants_company_id ON restaurants(company_id);
CREATE INDEX idx_restaurants_brand_id ON restaurants(brand_id);
CREATE INDEX idx_restaurants_area_id ON restaurants(area_id);
CREATE INDEX idx_restaurants_active ON restaurants(is_active);
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);

-- ============================================
-- 5. PROFILES (Perfiles de usuario)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'viewer')),
  assigned_company_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- 6. RESTAURANT_KPIS (KPIs agregados)
-- ============================================
CREATE TABLE restaurant_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- General KPIs
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  avg_ticket DECIMAL(8, 2) DEFAULT 0,
  avg_delivery_time_min INTEGER,
  avg_rating DECIMAL(3, 2),
  new_customers INTEGER DEFAULT 0,
  new_customer_pct DECIMAL(5, 2),

  -- Per channel
  orders_glovo INTEGER DEFAULT 0,
  orders_ubereats INTEGER DEFAULT 0,
  orders_justeat INTEGER DEFAULT 0,
  revenue_glovo DECIMAL(12, 2) DEFAULT 0,
  revenue_ubereats DECIMAL(12, 2) DEFAULT 0,
  revenue_justeat DECIMAL(12, 2) DEFAULT 0,

  -- Incidences
  incidence_count INTEGER DEFAULT 0,
  incidence_rate DECIMAL(5, 2),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(restaurant_id, period_date, period_type)
);

CREATE INDEX idx_restaurant_kpis_restaurant_id ON restaurant_kpis(restaurant_id);
CREATE INDEX idx_restaurant_kpis_period ON restaurant_kpis(period_date, period_type);

-- ============================================
-- TRIGGER: Create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER restaurant_kpis_updated_at
  BEFORE UPDATE ON restaurant_kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_kpis ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES Policies
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (except role and assigned_company_ids)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- COMPANIES Policies
-- ============================================

-- Admins can see all companies
CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Consultants see their assigned companies
CREATE POLICY "Users see assigned companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = ANY (
      SELECT unnest(assigned_company_ids)
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- ============================================
-- BRANDS Policies
-- ============================================

-- Users can see brands of their assigned companies (or all if admin)
CREATE POLICY "Users see brands of assigned companies"
  ON brands FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT unnest(assigned_company_ids)
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- AREAS Policies
-- ============================================

-- All authenticated users can see areas (geographic data, not company-specific)
CREATE POLICY "Authenticated users can view areas"
  ON areas FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- RESTAURANTS Policies
-- ============================================

-- Users can see restaurants of their assigned companies (or all if admin)
CREATE POLICY "Users see restaurants of assigned companies"
  ON restaurants FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT unnest(assigned_company_ids)
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- RESTAURANT_KPIS Policies
-- ============================================

-- Users can see KPIs for restaurants of their assigned companies
CREATE POLICY "Users see kpis of assigned restaurants"
  ON restaurant_kpis FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT r.id FROM restaurants r
      WHERE r.company_id IN (
        SELECT unnest(assigned_company_ids)
        FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
