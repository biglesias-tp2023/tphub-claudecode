-- ============================================
-- AUDITORÍAS - Referencias a CRP Portal
-- ============================================
-- Actualiza la tabla audits para referenciar datos del CRP Portal
-- usando IDs de tipo TEXT (los IDs de CRP Portal son numéricos pero se almacenan como TEXT)

-- ============================================
-- 1. AÑADIR NUEVA COLUMNA brand_id
-- ============================================

ALTER TABLE public.audits
ADD COLUMN IF NOT EXISTS brand_id TEXT;

-- ============================================
-- 2. RENOMBRAR restaurant_id → address_id
-- ============================================

-- Primero verificar si la columna existe y renombrarla
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audits'
    AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.audits RENAME COLUMN restaurant_id TO address_id;
  END IF;
END $$;

-- ============================================
-- 3. CAMBIAR TIPOS DE UUID A TEXT
-- ============================================

-- company_id: UUID → TEXT
ALTER TABLE public.audits
ALTER COLUMN company_id TYPE TEXT USING company_id::TEXT;

-- address_id (antes restaurant_id): UUID → TEXT
ALTER TABLE public.audits
ALTER COLUMN address_id TYPE TEXT USING address_id::TEXT;

-- area_id: UUID → TEXT
ALTER TABLE public.audits
ALTER COLUMN area_id TYPE TEXT USING area_id::TEXT;

-- ============================================
-- 4. AÑADIR ÍNDICES PARA LOS NUEVOS CAMPOS
-- ============================================

-- Índice para brand_id
CREATE INDEX IF NOT EXISTS idx_audits_brand ON public.audits(brand_id);

-- Actualizar índice de company si no existe
CREATE INDEX IF NOT EXISTS idx_audits_company ON public.audits(company_id);

-- Actualizar índice de address (antes restaurant)
DROP INDEX IF EXISTS idx_audits_restaurant;
CREATE INDEX IF NOT EXISTS idx_audits_address ON public.audits(address_id);

-- ============================================
-- 5. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.audits.company_id IS 'ID de compañía del CRP Portal (pk_id_company como TEXT)';
COMMENT ON COLUMN public.audits.brand_id IS 'ID de marca/store del CRP Portal (pk_id_store como TEXT)';
COMMENT ON COLUMN public.audits.address_id IS 'ID de dirección del CRP Portal (pk_id_address como TEXT)';
COMMENT ON COLUMN public.audits.area_id IS 'ID de área de negocio del CRP Portal (pk_id_business_area como TEXT)';

-- ============================================
-- 6. ACTUALIZAR CONSTRAINT (opcional)
-- ============================================

-- Eliminar constraint anterior si existe
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_scope_check;

-- Nueva constraint: al menos company_id debe estar presente
ALTER TABLE public.audits ADD CONSTRAINT audits_company_required
CHECK (company_id IS NOT NULL);
