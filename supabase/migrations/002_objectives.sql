-- ============================================
-- TPHub Supabase Migration: Restaurant Objectives
-- ============================================
-- This migration creates the objectives table for tracking
-- sales targets by restaurant, channel, and month.
-- ============================================

-- ============================================
-- 1. RESTAURANT_OBJECTIVES Table
-- ============================================
CREATE TABLE public.restaurant_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('glovo', 'ubereats', 'justeat')),
  period_month DATE NOT NULL, -- First day of the month (e.g., 2026-01-01)

  -- Objectives
  revenue_target NUMERIC(12, 2) NOT NULL DEFAULT 0,        -- Target revenue in EUR
  ads_investment_mode TEXT NOT NULL DEFAULT 'percentage'   -- 'percentage' | 'absolute'
    CHECK (ads_investment_mode IN ('percentage', 'absolute')),
  ads_investment_value NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- % or EUR depending on mode
  promos_investment_mode TEXT NOT NULL DEFAULT 'percentage'
    CHECK (promos_investment_mode IN ('percentage', 'absolute')),
  promos_investment_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  foodcost_target NUMERIC(5, 2) NOT NULL DEFAULT 0,        -- % of revenue

  -- Margin is calculated automatically
  margin_target NUMERIC(5, 2) GENERATED ALWAYS AS (
    100 - foodcost_target
    - CASE WHEN ads_investment_mode = 'percentage' THEN ads_investment_value ELSE 0 END
    - CASE WHEN promos_investment_mode = 'percentage' THEN promos_investment_value ELSE 0 END
  ) STORED,

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (restaurant_id, channel, period_month)
);

-- ============================================
-- 2. INDEXES
-- ============================================
CREATE INDEX idx_objectives_restaurant ON public.restaurant_objectives(restaurant_id);
CREATE INDEX idx_objectives_period ON public.restaurant_objectives(period_month);
CREATE INDEX idx_objectives_channel ON public.restaurant_objectives(channel);

-- ============================================
-- 3. TRIGGER: Update updated_at timestamp
-- ============================================
CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON public.restaurant_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.restaurant_objectives ENABLE ROW LEVEL SECURITY;

-- Admins can view all objectives
CREATE POLICY "Admins view all objectives"
ON public.restaurant_objectives FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users view objectives of their assigned companies
CREATE POLICY "Users view objectives of assigned companies"
ON public.restaurant_objectives FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = restaurant_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

-- Admins can insert objectives
CREATE POLICY "Admins insert objectives"
ON public.restaurant_objectives FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Consultants can insert objectives for their assigned companies
CREATE POLICY "Consultants insert objectives for assigned companies"
ON public.restaurant_objectives FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'consultant'
  )
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = restaurant_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

-- Admins can update objectives
CREATE POLICY "Admins update objectives"
ON public.restaurant_objectives FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Consultants can update objectives for their assigned companies
CREATE POLICY "Consultants update objectives for assigned companies"
ON public.restaurant_objectives FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'consultant'
  )
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = restaurant_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

-- Admins can delete objectives
CREATE POLICY "Admins delete objectives"
ON public.restaurant_objectives FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Consultants can delete objectives for their assigned companies
CREATE POLICY "Consultants delete objectives for assigned companies"
ON public.restaurant_objectives FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'consultant'
  )
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = restaurant_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);
