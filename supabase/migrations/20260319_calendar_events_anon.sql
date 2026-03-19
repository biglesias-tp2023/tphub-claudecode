-- Allow anon SELECT on calendar_events for public calendar views
-- Holidays and events must be visible on shared calendars

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'calendar_events'
      AND policyname = 'calendar_events_anon_select'
  ) THEN
    CREATE POLICY calendar_events_anon_select ON calendar_events
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Allow anon SELECT on promotional_campaigns via share link config
-- The application layer filters by share link config params
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'promotional_campaigns'
      AND policyname = 'promotional_campaigns_anon_select'
  ) THEN
    CREATE POLICY promotional_campaigns_anon_select ON promotional_campaigns
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
