-- =============================================================================
-- Alert Preferences
-- Allows consultants to configure per-company alert settings:
-- - Enable/disable alert categories (orders, reviews, ads, promos)
-- - Choose notification channels (Slack, Email)
-- - Set custom thresholds per company
-- =============================================================================

-- Table
CREATE TABLE IF NOT EXISTS alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id text NOT NULL,  -- CRP Portal company ID (text, not FK)

  -- Alert categories (on/off)
  orders_enabled boolean NOT NULL DEFAULT true,
  reviews_enabled boolean NOT NULL DEFAULT true,
  ads_enabled boolean NOT NULL DEFAULT true,
  promos_enabled boolean NOT NULL DEFAULT true,

  -- Notification channels
  slack_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,

  -- Custom thresholds (NULL = use global defaults)
  orders_threshold numeric DEFAULT NULL,      -- % order drop (e.g. -30)
  reviews_threshold numeric DEFAULT NULL,     -- min rating (e.g. 3.5)
  ads_roas_threshold numeric DEFAULT NULL,    -- min ROAS (e.g. 3.0)
  promos_threshold numeric DEFAULT NULL,      -- max promo rate % (e.g. 15)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (consultant_id, company_id)
);

COMMENT ON TABLE alert_preferences IS 'Per-company alert configuration for consultants';
COMMENT ON COLUMN alert_preferences.company_id IS 'CRP Portal company ID (text reference, not FK)';
COMMENT ON COLUMN alert_preferences.orders_threshold IS 'Custom order drop threshold %. NULL = use global default (-20%)';
COMMENT ON COLUMN alert_preferences.reviews_threshold IS 'Custom min rating threshold. NULL = use global default (3.5)';
COMMENT ON COLUMN alert_preferences.ads_roas_threshold IS 'Custom min ROAS threshold. NULL = use global default (3.0)';
COMMENT ON COLUMN alert_preferences.promos_threshold IS 'Custom max promo rate %. NULL = use global default (15%)';

-- Indexes
CREATE INDEX idx_alert_prefs_consultant ON alert_preferences(consultant_id);
CREATE INDEX idx_alert_prefs_company ON alert_preferences(company_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Consultants can manage their own preferences
CREATE POLICY "Users can view own alert preferences"
  ON alert_preferences FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "Users can insert own alert preferences"
  ON alert_preferences FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "Users can update own alert preferences"
  ON alert_preferences FOR UPDATE
  USING (consultant_id = auth.uid());

CREATE POLICY "Users can delete own alert preferences"
  ON alert_preferences FOR DELETE
  USING (consultant_id = auth.uid());

-- Admins can manage all preferences
CREATE POLICY "Admins can view all alert preferences"
  ON alert_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin', 'owner')
    )
  );

CREATE POLICY "Admins can insert any alert preferences"
  ON alert_preferences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin', 'owner')
    )
  );

CREATE POLICY "Admins can update any alert preferences"
  ON alert_preferences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin', 'owner')
    )
  );

CREATE POLICY "Admins can delete any alert preferences"
  ON alert_preferences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin', 'owner')
    )
  );
