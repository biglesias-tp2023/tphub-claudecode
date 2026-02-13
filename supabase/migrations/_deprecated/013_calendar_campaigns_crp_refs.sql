-- ============================================
-- CALENDAR CAMPAIGNS: CRP Portal References
-- Añadir referencias CRP Portal para compatibilidad
-- con el sistema de datos existente
-- ============================================

-- ============================================
-- Add CRP Portal reference columns
-- Estos campos permiten usar IDs de CRP Portal
-- en lugar de UUIDs de la tabla restaurants
-- ============================================

ALTER TABLE public.promotional_campaigns
ADD COLUMN IF NOT EXISTS crp_restaurant_id TEXT,
ADD COLUMN IF NOT EXISTS crp_company_id TEXT,
ADD COLUMN IF NOT EXISTS crp_brand_id TEXT;

-- Índices para búsquedas por CRP IDs
CREATE INDEX IF NOT EXISTS idx_campaigns_crp_restaurant
ON public.promotional_campaigns(crp_restaurant_id)
WHERE crp_restaurant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_crp_company
ON public.promotional_campaigns(crp_company_id)
WHERE crp_company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_crp_brand
ON public.promotional_campaigns(crp_brand_id)
WHERE crp_brand_id IS NOT NULL;

-- ============================================
-- Make restaurant_id optional
-- Permitir usar CRP refs sin restaurant_id UUID
-- ============================================

-- Primero eliminar la constraint NOT NULL si existe
ALTER TABLE public.promotional_campaigns
ALTER COLUMN restaurant_id DROP NOT NULL;

-- Añadir constraint: debe tener restaurant_id O crp_restaurant_id
ALTER TABLE public.promotional_campaigns
ADD CONSTRAINT campaign_must_have_restaurant
CHECK (restaurant_id IS NOT NULL OR crp_restaurant_id IS NOT NULL);

-- ============================================
-- Update RLS policies to work with CRP refs
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users view campaigns of assigned restaurants" ON public.promotional_campaigns;

-- Create new policy that works with both UUID and CRP refs
CREATE POLICY "Users view campaigns of assigned restaurants"
ON public.promotional_campaigns FOR SELECT
USING (
  -- Admin ve todo
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Usuario ve campañas de sus compañías asignadas (via restaurant_id)
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = promotional_campaigns.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
  OR
  -- Usuario ve campañas por crp_company_id
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND promotional_campaigns.crp_company_id = ANY(p.assigned_company_ids::TEXT[])
  )
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.promotional_campaigns.crp_restaurant_id IS 'CRP Portal: pk_id_address (restaurant/address ID)';
COMMENT ON COLUMN public.promotional_campaigns.crp_company_id IS 'CRP Portal: pk_id_company (company ID)';
COMMENT ON COLUMN public.promotional_campaigns.crp_brand_id IS 'CRP Portal: pk_id_store (brand/store ID)';
