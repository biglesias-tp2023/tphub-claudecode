-- ============================================
-- FIX: Sistema de Invitaciones en Producción
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Date: 2026-02-13
--
-- Problema: La política RLS de INSERT en user_invitations
-- no funciona correctamente con get_current_user_role()
-- ============================================

-- ============================================
-- PASO 1: DIAGNÓSTICO
-- ============================================
-- Ejecutar primero para verificar estado actual:

-- Ver tu rol actual
-- SELECT email, role FROM profiles WHERE email = 'biglesias@thinkpaladar.com';

-- Ver qué retorna la función (debe ser 'owner')
-- SELECT public.get_current_user_role();

-- ============================================
-- PASO 2: Asegurar que el perfil tiene rol owner
-- ============================================
-- Ejecutar si el rol es NULL o incorrecto:

UPDATE profiles
SET role = 'owner'
WHERE email = 'biglesias@thinkpaladar.com';

-- ============================================
-- PASO 3: Simplificar política INSERT
-- ============================================
-- La política anterior usaba get_current_user_role() que puede
-- no funcionar correctamente en contextos de INSERT.
-- Usamos una versión más directa.

-- Eliminar política actual
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;

-- Crear política más permisiva usando subquery directa
-- Esto evita dependencia en la función get_current_user_role()
CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'superadmin', 'admin')
  )
);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verificar con:

-- Ver que la política existe
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'user_invitations';

-- Ver invitaciones existentes
-- SELECT * FROM user_invitations;

-- ============================================
-- FIN DEL FIX
-- ============================================
