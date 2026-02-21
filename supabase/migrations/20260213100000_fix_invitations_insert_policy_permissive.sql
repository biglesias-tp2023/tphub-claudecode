-- ============================================
-- FIX ALTERNATIVO: Sistema de Invitaciones en Producción
-- ============================================
-- Usar SOLO si el fix anterior no funciona
-- Date: 2026-02-13
--
-- PRECAUCIÓN: Este script hace la política INSERT más permisiva.
-- Solo usar temporalmente para debugging.
-- ============================================

-- ============================================
-- OPCIÓN TEMPORAL: Política permisiva
-- ============================================
-- Si el fix principal no funciona, usar este para desbloquear.
-- Luego investigar por qué get_current_user_role() o el EXISTS
-- no retornan correctamente.

-- Eliminar política actual
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;

-- Crear política permisiva (cualquier usuario autenticado puede crear)
-- IMPORTANTE: Esto es temporal para debugging!
CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar:
-- 1. Probar crear invitación desde UI
-- 2. Si funciona, el problema está en la validación de rol
-- 3. Revisar qué retorna: SELECT public.get_current_user_role();
-- 4. Revisar el rol en profiles: SELECT email, role FROM profiles WHERE id = auth.uid();

-- ============================================
-- PARA RESTAURAR LA POLÍTICA CORRECTA:
-- ============================================
-- DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
--
-- CREATE POLICY "Admins can create invitations"
-- ON public.user_invitations FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.profiles p
--     WHERE p.id = auth.uid()
--     AND p.role IN ('owner', 'superadmin', 'admin')
--   )
-- );
