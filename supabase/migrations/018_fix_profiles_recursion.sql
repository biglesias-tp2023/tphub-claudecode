-- ============================================
-- Migration: 018_fix_profiles_recursion.sql
-- Description: Fix infinite recursion in profiles RLS policies
-- Date: 2026-02-12
-- Problem: Policies query profiles table to check roles, causing infinite recursion
-- Solution: Use SECURITY DEFINER function that bypasses RLS
-- ============================================

-- 1. Crear función SECURITY DEFINER para obtener el rol del usuario actual
-- Esta función NO activa RLS porque es SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Permisos para que los usuarios autenticados puedan llamar esta función
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 2. Eliminar todas las políticas existentes de profiles que causan recursión
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own non-role fields" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- 3. Crear nuevas políticas usando la función (sin recursión)

-- SELECT: Usuarios ven su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- SELECT: Owner, Superadmin, Admin ven todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() IN ('owner', 'superadmin', 'admin'));

-- UPDATE: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Owner y Superadmin pueden actualizar cualquier perfil
CREATE POLICY "Owner and superadmin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.get_current_user_role() IN ('owner', 'superadmin'))
  WITH CHECK (public.get_current_user_role() IN ('owner', 'superadmin'));

-- DELETE: Solo admins pueden eliminar (excepto owner)
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
    AND role != 'owner'
  );

-- 4. Comentario de documentación
COMMENT ON FUNCTION public.get_current_user_role() IS
  'Returns the role of the current authenticated user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
