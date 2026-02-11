-- ============================================
-- AUDITORÍAS FASE 1 - Nuevas columnas y tablas
-- ============================================

-- ============================================
-- 1. NUEVAS COLUMNAS EN audits
-- ============================================

-- store_id: ID del establecimiento (pk_id_store del CRP Portal)
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS store_id TEXT;

-- portal_id: ID del portal/plataforma (Glovo, UberEats, JustEat)
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS portal_id TEXT;

-- consultant_user_id: Consultor asignado a esta auditoría
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS consultant_user_id UUID REFERENCES auth.users(id);

-- kam_user_id: Key Account Manager asignado
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS kam_user_id UUID REFERENCES auth.users(id);

-- title: Título descriptivo de la auditoría
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS title TEXT;

-- notes: Notas adicionales
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS notes TEXT;

-- score_total: Puntuación total calculada
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS score_total NUMERIC;

-- delivered_at: Fecha de entrega al cliente
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ============================================
-- 2. ACTUALIZAR CONSTRAINT DE STATUS
-- ============================================

-- Eliminar constraint anterior
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_status_check;

-- Nueva constraint con 'delivered'
ALTER TABLE public.audits ADD CONSTRAINT audits_status_check
  CHECK (status IN ('draft', 'in_progress', 'completed', 'delivered'));

-- ============================================
-- 3. ÍNDICES PARA NUEVAS COLUMNAS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audits_store ON public.audits(store_id);
CREATE INDEX IF NOT EXISTS idx_audits_portal ON public.audits(portal_id);
CREATE INDEX IF NOT EXISTS idx_audits_consultant ON public.audits(consultant_user_id);
CREATE INDEX IF NOT EXISTS idx_audits_kam ON public.audits(kam_user_id);

-- ============================================
-- 4. TABLA audit_responses
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('rating', 'text', 'select', 'multi_select', 'number', 'date', 'time', 'image')),
  value_text TEXT,
  value_number NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, field_key)
);

-- Índices para audit_responses
CREATE INDEX IF NOT EXISTS idx_audit_responses_audit ON public.audit_responses(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_responses_section ON public.audit_responses(section);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_audit_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_audit_responses_updated_at ON public.audit_responses;
CREATE TRIGGER trigger_update_audit_responses_updated_at
  BEFORE UPDATE ON public.audit_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_responses_updated_at();

-- ============================================
-- 5. TABLA audit_images
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para audit_images
CREATE INDEX IF NOT EXISTS idx_audit_images_audit ON public.audit_images(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_images_field ON public.audit_images(field_key);

-- ============================================
-- 6. RENOMBRAR delivery → onboarding
-- ============================================

UPDATE public.audit_types
SET slug = 'onboarding',
    name = 'Onboarding',
    description = 'Auditoría inicial del cliente'
WHERE slug = 'delivery';

-- ============================================
-- 7. RLS POLICIES PARA NUEVAS TABLAS
-- ============================================

ALTER TABLE public.audit_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_images ENABLE ROW LEVEL SECURITY;

-- audit_responses: usuarios ven respuestas de auditorías a las que tienen acceso
DROP POLICY IF EXISTS "Users view audit responses" ON public.audit_responses;
CREATE POLICY "Users view audit responses"
ON public.audit_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.audits a
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE a.id = audit_responses.audit_id
      AND (
        p.role = 'admin'
        OR a.company_id = ANY(p.assigned_company_ids::text[])
      )
  )
);

-- audit_responses: admin y consultant pueden crear/modificar
DROP POLICY IF EXISTS "Admins and consultants can manage audit responses" ON public.audit_responses;
CREATE POLICY "Admins and consultants can manage audit responses"
ON public.audit_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- audit_images: usuarios ven imágenes de auditorías a las que tienen acceso
DROP POLICY IF EXISTS "Users view audit images" ON public.audit_images;
CREATE POLICY "Users view audit images"
ON public.audit_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.audits a
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE a.id = audit_images.audit_id
      AND (
        p.role = 'admin'
        OR a.company_id = ANY(p.assigned_company_ids::text[])
      )
  )
);

-- audit_images: admin y consultant pueden crear/modificar
DROP POLICY IF EXISTS "Admins and consultants can manage audit images" ON public.audit_images;
CREATE POLICY "Admins and consultants can manage audit images"
ON public.audit_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- ============================================
-- 8. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.audits.store_id IS 'ID del establecimiento del CRP Portal (pk_id_store como TEXT)';
COMMENT ON COLUMN public.audits.portal_id IS 'Plataforma de delivery (glovo, ubereats, justeat)';
COMMENT ON COLUMN public.audits.consultant_user_id IS 'UUID del consultor asignado';
COMMENT ON COLUMN public.audits.kam_user_id IS 'UUID del Key Account Manager asignado';
COMMENT ON COLUMN public.audits.title IS 'Título descriptivo de la auditoría';
COMMENT ON COLUMN public.audits.notes IS 'Notas adicionales';
COMMENT ON COLUMN public.audits.score_total IS 'Puntuación total calculada';
COMMENT ON COLUMN public.audits.delivered_at IS 'Fecha de entrega al cliente';

COMMENT ON TABLE public.audit_responses IS 'Respuestas individuales de cada campo en una auditoría';
COMMENT ON TABLE public.audit_images IS 'Imágenes subidas en una auditoría';
