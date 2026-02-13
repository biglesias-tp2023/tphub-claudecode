-- ============================================
-- Security Audit Migration
-- TPHub Security Hardening
-- Created: 2026-02-13
-- ============================================

-- ============================================
-- 1. AUDIT LOG TABLE
-- Track role changes and sensitive operations
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by performer and target
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_user ON audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only owner/superadmin can view audit logs
CREATE POLICY "Owner and superadmin can view audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('owner', 'superadmin')
  )
);

-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 2. TRIGGER FOR ROLE CHANGES
-- Automatically log when a user's role changes
-- ============================================

CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_log (
      action,
      performed_by,
      target_user_id,
      old_value,
      new_value,
      metadata
    ) VALUES (
      'role_change',
      auth.uid(),
      NEW.id,
      OLD.role,
      NEW.role,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS trigger_log_role_change ON profiles;
CREATE TRIGGER trigger_log_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

-- ============================================
-- 3. EMAIL DOMAIN CONSTRAINT ON INVITATIONS
-- Only allow @thinkpaladar.com emails
-- ============================================

-- Add constraint if user_invitations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_invitations'
  ) THEN
    -- Drop existing constraint if any
    ALTER TABLE user_invitations
    DROP CONSTRAINT IF EXISTS valid_invitation_email_domain;

    -- Add new constraint
    ALTER TABLE user_invitations
    ADD CONSTRAINT valid_invitation_email_domain
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@thinkpaladar\.com$');
  END IF;
END $$;

-- ============================================
-- 4. RLS POLICY FOR ANON ON INVITATIONS
-- Explicitly deny anonymous access
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_invitations'
  ) THEN
    -- Drop existing policy if any
    DROP POLICY IF EXISTS "Anon cannot access invitations" ON user_invitations;

    -- Create explicit deny policy for anon
    CREATE POLICY "Anon cannot access invitations"
    ON user_invitations
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- ============================================
-- 5. INVITATION RATE LIMITING TABLE
-- Prevent invitation spam
-- ============================================

CREATE TABLE IF NOT EXISTS invitation_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invitation_id UUID REFERENCES user_invitations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invitation_rate_limit_admin
ON invitation_rate_limit(admin_id, invited_at DESC);

-- Enable RLS
ALTER TABLE invitation_rate_limit ENABLE ROW LEVEL SECURITY;

-- Admins can see their own rate limit entries
CREATE POLICY "Admins can view own rate limits"
ON invitation_rate_limit FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

-- Function to check rate limit (max 10 invitations per hour)
CREATE OR REPLACE FUNCTION check_invitation_rate_limit(admin_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM invitation_rate_limit
  WHERE admin_id = admin_uuid
  AND invited_at > NOW() - INTERVAL '1 hour';

  RETURN recent_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE audit_log IS 'Security audit trail for sensitive operations like role changes';
COMMENT ON TABLE invitation_rate_limit IS 'Rate limiting for user invitations - max 10/hour per admin';
COMMENT ON FUNCTION log_role_change IS 'Trigger function to log role changes to audit_log';
COMMENT ON FUNCTION check_invitation_rate_limit IS 'Returns TRUE if admin can send more invitations (under rate limit)';
