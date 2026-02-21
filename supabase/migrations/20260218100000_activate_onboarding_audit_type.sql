-- ============================================
-- Activate onboarding audit type
-- ============================================

UPDATE public.audit_types
SET is_active = true,
    name = 'Onboarding',
    description = 'Ficha de cliente: competencia, horarios, perfiles y marketing',
    field_schema = '{"sections": []}'::jsonb
WHERE slug = 'onboarding';
