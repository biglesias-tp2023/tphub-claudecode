-- ============================================
-- USER INVITATIONS SYSTEM
-- Sistema para invitar usuarios externos (consultores)
-- con rol y compañías pre-asignadas
-- ============================================

-- ============================================
-- ENUM: invitation_status
-- ============================================

CREATE TYPE public.invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

-- ============================================
-- TABLE: user_invitations
-- Invitaciones pendientes con configuración pre-asignada
-- ============================================

CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email del invitado (no necesita ser @thinkpaladar.com)
  email TEXT NOT NULL,

  -- Rol pre-asignado (se aplicará al crear el perfil)
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'viewer')),

  -- Compañías pre-asignadas (CRP Portal IDs como TEXT)
  assigned_company_ids TEXT[] DEFAULT '{}',

  -- Estado de la invitación
  status public.invitation_status NOT NULL DEFAULT 'pending',

  -- Quién invitó
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Nota opcional del admin
  invitation_note TEXT,

  -- Constraints
  CONSTRAINT unique_pending_invitation UNIQUE (email, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Índices
CREATE INDEX idx_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX idx_invitations_invited_by ON public.user_invitations(invited_by);

-- ============================================
-- FUNCTION: apply_invitation_config
-- Aplica rol y compañías cuando el usuario se registra
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_invitation_config()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Buscar invitación pendiente para este email
  SELECT *
  INTO invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY invited_at DESC
  LIMIT 1;

  -- Si existe invitación, aplicar configuración
  IF FOUND THEN
    -- Actualizar el perfil con rol y compañías
    UPDATE public.profiles
    SET
      role = invitation_record.role,
      assigned_company_ids = invitation_record.assigned_company_ids::UUID[]
    WHERE id = NEW.id;

    -- Marcar invitación como aceptada
    UPDATE public.user_invitations
    SET
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Aplicar configuración al crear perfil
-- ============================================

CREATE TRIGGER on_profile_created_apply_invitation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_invitation_config();

-- ============================================
-- FUNCTION: cleanup_expired_invitations
-- Marca invitaciones expiradas
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todas las invitaciones
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Admins pueden crear invitaciones
CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Admins pueden actualizar invitaciones
CREATE POLICY "Admins can update invitations"
ON public.user_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Admins pueden eliminar invitaciones
CREATE POLICY "Admins can delete invitations"
ON public.user_invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================
-- OPTIONAL: Add kam_display_name to profiles
-- Para vincular con des_key_account_manager
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kam_display_name TEXT;

COMMENT ON COLUMN public.profiles.kam_display_name IS 'Display name for matching with des_key_account_manager in CRP Portal';
