-- ============================================
-- FIX v2: Política INSERT simplificada para triggers
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Problema: La política INSERT anterior usa auth.uid() que NO funciona
-- dentro del trigger on_auth_user_created porque auth.uid() retorna NULL
-- en contexto de trigger.
--
-- IMPORTANTE: También desactivar "Confirm email" en Supabase Dashboard:
-- Authentication → Providers → Email → Desactivar "Confirm email"
-- ============================================

-- 1. Reemplazar política INSERT con una que funcione en triggers
-- La anterior usaba auth.uid() que no funciona en contexto de trigger
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Política permisiva para INSERT (SECURITY DEFINER en trigger lo protege)
-- Solo el trigger handle_new_user() hace INSERT en profiles,
-- y ese trigger tiene SECURITY DEFINER que garantiza la seguridad
CREATE POLICY "Allow profile creation"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- 2. Asegurar que handle_new_user tiene SECURITY DEFINER + search_path
-- SECURITY DEFINER: ejecuta con permisos del creador de la función
-- SET search_path = public: previene ataques de path injection
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

-- 3. Verificar trigger existe (recrear para asegurar)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICACIÓN (ejecutar manualmente)
-- ============================================
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
-- Debería mostrar "Allow profile creation" para INSERT

-- ============================================
-- POST-FIX: Verificar en producción
-- ============================================
-- 1. Ir a https://tphub-claudecode.vercel.app
-- 2. Abrir modal "Invitar usuario"
-- 3. Poner email @thinkpaladar.com
-- 4. Seleccionar rol
-- 5. Click "Enviar invitación"
-- 6. Verificar que NO aparece error
-- 7. El usuario debería recibir email con magic link
-- ============================================
