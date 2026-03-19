-- Calendar share links
-- Generalizes the share link pattern for calendar views

CREATE TABLE IF NOT EXISTS calendar_share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  created_by  UUID REFERENCES auth.users(id),
  config      JSONB NOT NULL DEFAULT '{}',
  -- config stores: companyIds, brandIds, platformFilters, categoryFilters, region
  is_active   BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  view_count  INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_calendar_share_links_token ON calendar_share_links(token);

-- Updated_at trigger
CREATE TRIGGER set_calendar_share_links_updated_at
  BEFORE UPDATE ON calendar_share_links
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE calendar_share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own links
CREATE POLICY calendar_share_links_auth_select ON calendar_share_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY calendar_share_links_auth_insert ON calendar_share_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY calendar_share_links_auth_update ON calendar_share_links
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY calendar_share_links_auth_delete ON calendar_share_links
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Anon can read by token (for public calendar access)
CREATE POLICY calendar_share_links_anon_select ON calendar_share_links
  FOR SELECT TO anon USING (true);

-- Anon can increment view_count
CREATE POLICY calendar_share_links_anon_update ON calendar_share_links
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
