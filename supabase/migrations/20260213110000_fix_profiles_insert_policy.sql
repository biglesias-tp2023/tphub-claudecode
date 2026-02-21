-- ============================================
-- FIX: Permitir INSERT en profiles para nuevos usuarios
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Problema: Al invitar usuarios, el trigger handle_new_user() falla
-- porque RLS bloquea el INSERT en profiles (falta política INSERT)
-- ============================================

-- 1. Ver políticas actuales de profiles (diagnóstico)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 2. Añadir política INSERT para usuarios autenticados
-- Permite que un usuario cree su propio perfil (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 3. Verificar que handle_new_user existe y tiene SECURITY DEFINER + search_path
-- SECURITY DEFINER permite que el trigger bypasee RLS
-- SET search_path = public previene ataques de path injection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Verificar trigger existe (recrear para asegurar)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificación final
SELECT 'Políticas de profiles:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

SELECT 'Trigger en auth.users:' as info;
SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- ============================================
-- VERIFICATION
-- ============================================
-- Después de ejecutar, probar:
-- 1. Ir a https://tphub-claudecode.vercel.app
-- 2. Abrir modal "Invitar usuario"
-- 3. Poner email de consultor @thinkpaladar.com
-- 4. Seleccionar rol (ej: Consultor)
-- 5. Click "Enviar invitación"
-- 6. Verificar que NO aparece error
-- 7. El consultor debería recibir email con magic link
-- ============================================
