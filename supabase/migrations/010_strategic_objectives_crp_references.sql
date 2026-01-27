-- ============================================
-- STRATEGIC OBJECTIVES - Referencias a CRP Portal
-- ============================================
-- Actualiza la tabla strategic_objectives para referenciar datos del CRP Portal
-- usando IDs de tipo TEXT (los IDs de CRP Portal son numéricos pero se almacenan como TEXT)

-- ============================================
-- 1. ELIMINAR FOREIGN KEY EXISTENTE
-- ============================================

-- Eliminar la constraint de FK a restaurants (que usa UUIDs)
ALTER TABLE public.strategic_objectives
DROP CONSTRAINT IF EXISTS strategic_objectives_restaurant_id_fkey;

-- ============================================
-- 2. AÑADIR NUEVAS COLUMNAS
-- ============================================

-- Añadir company_id (requerido)
ALTER TABLE public.strategic_objectives
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Añadir brand_id (opcional)
ALTER TABLE public.strategic_objectives
ADD COLUMN IF NOT EXISTS brand_id TEXT;

-- ============================================
-- 3. RENOMBRAR Y CAMBIAR TIPO DE restaurant_id
-- ============================================

-- Renombrar restaurant_id a address_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'strategic_objectives'
    AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.strategic_objectives RENAME COLUMN restaurant_id TO address_id;
  END IF;
END $$;

-- Cambiar tipo de UUID a TEXT
ALTER TABLE public.strategic_objectives
ALTER COLUMN address_id TYPE TEXT USING address_id::TEXT;

-- Hacer address_id nullable (ya que ahora company_id es requerido)
ALTER TABLE public.strategic_objectives
ALTER COLUMN address_id DROP NOT NULL;

-- ============================================
-- 4. ACTUALIZAR ÍNDICES
-- ============================================

-- Eliminar índice antiguo si existe
DROP INDEX IF EXISTS idx_strategic_objectives_restaurant;

-- Crear nuevos índices
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company ON public.strategic_objectives(company_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_brand ON public.strategic_objectives(brand_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_address ON public.strategic_objectives(address_id);

-- ============================================
-- 5. AÑADIR CONSTRAINT
-- ============================================

-- company_id es requerido
ALTER TABLE public.strategic_objectives
ADD CONSTRAINT strategic_objectives_company_required
CHECK (company_id IS NOT NULL);

-- ============================================
-- 6. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.strategic_objectives.company_id IS 'ID de compañía del CRP Portal (pk_id_company como TEXT)';
COMMENT ON COLUMN public.strategic_objectives.brand_id IS 'ID de marca/store del CRP Portal (pk_id_store como TEXT)';
COMMENT ON COLUMN public.strategic_objectives.address_id IS 'ID de dirección del CRP Portal (pk_id_address como TEXT)';

-- ============================================
-- 7. ACTUALIZAR RLS POLICIES (opcional)
-- ============================================

-- Eliminar policies antiguas que referencien restaurant_id
DROP POLICY IF EXISTS "Users can view objectives for their restaurants" ON public.strategic_objectives;
DROP POLICY IF EXISTS "Admin/consultant can manage objectives" ON public.strategic_objectives;

-- Crear nuevas policies basadas en company_id
CREATE POLICY "Allow all strategic_objectives" ON public.strategic_objectives
FOR ALL USING (true);
