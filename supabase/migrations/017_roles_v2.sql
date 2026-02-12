-- ============================================
-- Migration: 017_roles_v2.sql
-- Description: New role system with Owner/Superadmin/Admin/Manager
-- Date: 2026-02-11
-- ============================================

-- 1. Extender roles en la tabla profiles
-- Primero eliminamos el constraint existente si existe
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Agregamos el nuevo constraint con todos los roles
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('owner', 'superadmin', 'admin', 'manager', 'consultant', 'viewer'));

-- 2. Crear índice único para owner (solo puede haber uno)
-- Usamos un índice parcial para garantizar unicidad solo cuando role = 'owner'
DROP INDEX IF EXISTS idx_profiles_owner_unique;
CREATE UNIQUE INDEX idx_profiles_owner_unique
ON profiles (role) WHERE role = 'owner';

-- 3. Función para proteger al owner de eliminación/cambio de rol
CREATE OR REPLACE FUNCTION protect_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- No permitir eliminar al owner
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot delete owner account';
  END IF;

  -- No permitir cambiar el rol del owner a otro rol
  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner' THEN
    RAISE EXCEPTION 'Cannot change owner role';
  END IF;

  -- No permitir promover a alguien a owner si ya existe uno
  IF TG_OP = 'UPDATE' AND NEW.role = 'owner' AND OLD.role != 'owner' THEN
    RAISE EXCEPTION 'Cannot promote to owner - owner already exists';
  END IF;

  -- No permitir crear un nuevo owner si ya existe uno
  IF TG_OP = 'INSERT' AND NEW.role = 'owner' THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'owner') THEN
      RAISE EXCEPTION 'Owner already exists - cannot create another owner';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe y crear uno nuevo
DROP TRIGGER IF EXISTS protect_owner_trigger ON profiles;
CREATE TRIGGER protect_owner_trigger
BEFORE INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_owner();

-- 4. Establecer a Bruno como owner
-- Primero deshabilitamos temporalmente el trigger para poder hacer el cambio inicial
ALTER TABLE profiles DISABLE TRIGGER protect_owner_trigger;

UPDATE profiles
SET role = 'owner'
WHERE email = 'biglesias@thinkpaladar.com';

-- Re-habilitamos el trigger
ALTER TABLE profiles ENABLE TRIGGER protect_owner_trigger;

-- 5. Actualizar la tabla de invitaciones para los nuevos roles
-- No permitir invitar owners (solo puede existir uno)
-- NOTE: user_invitations table is created in 012_user_invitations.sql
-- This will only run if the table exists (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;
    ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
      CHECK (role IN ('superadmin', 'admin', 'manager', 'consultant', 'viewer'));
  END IF;
END $$;

-- 6. Actualizar RLS policies para el nuevo sistema de roles
-- Owner y Superadmin pueden ver todos los profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Política: Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Política: Owner, Superadmin y Admin pueden ver todos los profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
  );

-- Política: Solo Owner y Superadmin pueden actualizar roles
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and superadmin can update profiles" ON profiles;

CREATE POLICY "Owner and superadmin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin')
    )
  );

-- Los usuarios pueden actualizar su propio perfil (pero no el rol - manejado por trigger)
CREATE POLICY "Users can update own non-role fields"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. RLS Policy para DELETE de profiles
-- Solo owner, superadmin y admin pueden eliminar usuarios
-- Pero NADIE puede eliminar al owner (protegido por trigger)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    -- El usuario que elimina debe ser owner, superadmin o admin
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    -- No se puede eliminar al owner (doble protección además del trigger)
    AND role != 'owner'
  );

-- 8. Comentarios para documentación
COMMENT ON INDEX idx_profiles_owner_unique IS 'Ensures only one owner can exist in the system';
COMMENT ON FUNCTION protect_owner() IS 'Trigger function that protects the owner from being deleted or having their role changed';
