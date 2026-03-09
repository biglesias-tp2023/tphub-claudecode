-- ============================================
-- Self-Healing System: Job Tracking + Watchdog
-- ============================================
-- Provides:
--   1. job_registry — registered jobs with status, retries, timeouts
--   2. job_execution_log — history of every execution
--   3. watchdog_heartbeat — single-row proof that pg_cron is alive
--   4. watchdog_check_jobs() — pg_cron function that detects stuck/failed jobs
--   5. Cleanup of old execution logs (weekly)

-- ============================================
-- 1. Tables
-- ============================================

CREATE TABLE IF NOT EXISTS job_registry (
  id            TEXT PRIMARY KEY,                     -- e.g. 'daily-alerts'
  display_name  TEXT NOT NULL,                        -- human-readable name
  endpoint      TEXT NOT NULL,                        -- e.g. '/api/alerts/daily'
  cron_expr     TEXT,                                 -- e.g. '0 7 * * 1-5' (NULL = on-demand)
  is_critical   BOOLEAN NOT NULL DEFAULT true,        -- escalate faster if critical
  timeout_minutes INT NOT NULL DEFAULT 5,             -- max allowed runtime
  max_retries   INT NOT NULL DEFAULT 3,               -- retries before marking dead
  status        TEXT NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle','running','failed','completed','dead')),
  current_run_id UUID,                                -- UUID of current/last execution
  last_started_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  next_retry_at  TIMESTAMPTZ,                         -- backoff-calculated retry time
  escalated_at   TIMESTAMPTZ,                         -- last time Slack was notified
  metadata       JSONB DEFAULT '{}',                  -- last execution summary
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_execution_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      TEXT NOT NULL REFERENCES job_registry(id) ON DELETE CASCADE,
  run_id      UUID NOT NULL,                          -- correlates with job_registry.current_run_id
  status      TEXT NOT NULL DEFAULT 'running'
              CHECK (status IN ('running','completed','failed')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,                                    -- computed on completion
  error       TEXT,                                   -- error message if failed
  metadata    JSONB DEFAULT '{}',                     -- execution details (counts, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_execution_log_job_id
  ON job_execution_log(job_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_execution_log_run_id
  ON job_execution_log(run_id);

CREATE TABLE IF NOT EXISTS watchdog_heartbeat (
  id           INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single-row
  last_beat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jobs_checked INT NOT NULL DEFAULT 0,
  issues_found INT NOT NULL DEFAULT 0
);

-- Insert single row
INSERT INTO watchdog_heartbeat (id, last_beat_at) VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

-- updated_at trigger for job_registry
CREATE OR REPLACE FUNCTION update_job_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_registry_updated_at ON job_registry;
CREATE TRIGGER trg_job_registry_updated_at
  BEFORE UPDATE ON job_registry
  FOR EACH ROW EXECUTE FUNCTION update_job_registry_updated_at();

-- ============================================
-- 2. Watchdog Function
-- ============================================

CREATE OR REPLACE FUNCTION watchdog_check_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stuck_count   INT := 0;
  v_retry_count   INT := 0;
  v_dead_count    INT := 0;
  v_stale_count   INT := 0;
  v_alert_messages TEXT[] := '{}';
  v_job           RECORD;
  v_webhook_url   TEXT;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Advisory lock: only one watchdog runs at a time
  IF NOT pg_try_advisory_lock(hashtext('watchdog_check_jobs')) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'another instance running');
  END IF;

  v_webhook_url := current_setting('app.settings.slack_webhook_url', true);

  -- ── 2a. Detect STUCK jobs (running longer than timeout) ──
  FOR v_job IN
    SELECT id, display_name, timeout_minutes, last_started_at, current_run_id,
           consecutive_failures, max_retries, is_critical
    FROM job_registry
    WHERE status = 'running'
      AND last_started_at < v_now - (timeout_minutes || ' minutes')::INTERVAL
    FOR UPDATE SKIP LOCKED
  LOOP
    v_stuck_count := v_stuck_count + 1;

    -- Mark as failed
    UPDATE job_registry SET
      status = 'failed',
      last_failure_at = v_now,
      consecutive_failures = consecutive_failures + 1,
      next_retry_at = CASE
        WHEN consecutive_failures + 1 < max_retries
        THEN v_now + (power(2, consecutive_failures + 1) * interval '5 minutes')
        ELSE NULL
      END
    WHERE id = v_job.id;

    -- Update execution log
    UPDATE job_execution_log SET
      status = 'failed',
      finished_at = v_now,
      duration_ms = EXTRACT(EPOCH FROM (v_now - started_at))::INT * 1000,
      error = 'Watchdog: exceeded timeout of ' || v_job.timeout_minutes || ' minutes'
    WHERE run_id = v_job.current_run_id AND status = 'running';

    v_alert_messages := array_append(v_alert_messages,
      ':warning: *' || v_job.display_name || '* stuck — exceeded ' || v_job.timeout_minutes || 'min timeout');
  END LOOP;

  -- ── 2b. Detect RETRYABLE jobs (failed with next_retry_at in the past) ──
  FOR v_job IN
    SELECT id, display_name, endpoint, consecutive_failures, max_retries
    FROM job_registry
    WHERE status = 'failed'
      AND next_retry_at IS NOT NULL
      AND next_retry_at <= v_now
      AND consecutive_failures < max_retries
    FOR UPDATE SKIP LOCKED
  LOOP
    v_retry_count := v_retry_count + 1;

    -- Mark as pending retry (the Vercel backup watchdog will trigger the actual call)
    -- We set next_retry_at to NULL so we don't re-trigger on next watchdog cycle
    UPDATE job_registry SET
      next_retry_at = NULL,
      metadata = jsonb_set(COALESCE(metadata, '{}'), '{pending_retry}', 'true')
    WHERE id = v_job.id;

    v_alert_messages := array_append(v_alert_messages,
      ':arrows_counterclockwise: *' || v_job.display_name || '* retry #' || v_job.consecutive_failures || ' pending');
  END LOOP;

  -- ── 2c. Detect DEAD jobs (exceeded max retries) ──
  FOR v_job IN
    SELECT id, display_name, consecutive_failures, max_retries, escalated_at, is_critical
    FROM job_registry
    WHERE status = 'failed'
      AND consecutive_failures >= max_retries
      AND status != 'dead'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Only escalate if not recently escalated (6h cooldown)
    IF v_job.escalated_at IS NULL OR v_job.escalated_at < v_now - interval '6 hours' THEN
      v_dead_count := v_dead_count + 1;

      UPDATE job_registry SET
        status = 'dead',
        escalated_at = v_now
      WHERE id = v_job.id;

      v_alert_messages := array_append(v_alert_messages,
        ':skull: *' || v_job.display_name || '* DEAD — ' || v_job.consecutive_failures || '/' || v_job.max_retries || ' retries exhausted');
    END IF;
  END LOOP;

  -- ── 2d. Detect STALE data (critical jobs not succeeded in 24h) ──
  FOR v_job IN
    SELECT id, display_name, last_success_at, is_critical, escalated_at
    FROM job_registry
    WHERE is_critical = true
      AND status NOT IN ('dead')
      AND (last_success_at IS NULL OR last_success_at < v_now - interval '24 hours')
      AND cron_expr IS NOT NULL  -- only scheduled jobs
  LOOP
    IF v_job.escalated_at IS NULL OR v_job.escalated_at < v_now - interval '6 hours' THEN
      v_stale_count := v_stale_count + 1;

      UPDATE job_registry SET escalated_at = v_now WHERE id = v_job.id;

      v_alert_messages := array_append(v_alert_messages,
        ':hourglass: *' || v_job.display_name || '* stale — no success in 24h (last: ' ||
        COALESCE(to_char(v_job.last_success_at, 'DD/MM HH24:MI'), 'never') || ')');
    END IF;
  END LOOP;

  -- ── 2e. Send Slack alert if any issues ──
  IF array_length(v_alert_messages, 1) > 0 AND v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
    PERFORM net.http_post(
      url := v_webhook_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'text', 'Watchdog: ' || array_length(v_alert_messages, 1) || ' issue(s) detected',
        'username', 'TPHub Watchdog',
        'icon_url', 'https://hub.thinkpaladar.com/images/logo/logo.png',
        'blocks', jsonb_build_array(
          jsonb_build_object('type', 'header', 'text',
            jsonb_build_object('type', 'plain_text', 'text', '🔍 Watchdog Report', 'emoji', true)),
          jsonb_build_object('type', 'section', 'text',
            jsonb_build_object('type', 'mrkdwn', 'text', array_to_string(v_alert_messages, E'\n'))),
          jsonb_build_object('type', 'context', 'elements',
            jsonb_build_array(jsonb_build_object('type', 'mrkdwn', 'text',
              'TPHub Watchdog · ' || to_char(v_now, 'DD/MM HH24:MI'))))
        )
      )
    );
  END IF;

  -- ── 2f. Update heartbeat ──
  UPDATE watchdog_heartbeat SET
    last_beat_at = v_now,
    jobs_checked = (SELECT count(*) FROM job_registry),
    issues_found = v_stuck_count + v_retry_count + v_dead_count + v_stale_count
  WHERE id = 1;

  -- Release advisory lock
  PERFORM pg_advisory_unlock(hashtext('watchdog_check_jobs'));

  RETURN jsonb_build_object(
    'checked_at', v_now,
    'stuck', v_stuck_count,
    'retries_pending', v_retry_count,
    'dead', v_dead_count,
    'stale', v_stale_count,
    'alerts_sent', array_length(v_alert_messages, 1)
  );
END;
$$;

-- ============================================
-- 3. Seed: Register existing jobs
-- ============================================

INSERT INTO job_registry (id, display_name, endpoint, cron_expr, is_critical, timeout_minutes, max_retries)
VALUES
  ('daily-alerts', 'Alertas Diarias', '/api/alerts/daily', '0 7 * * 1-5', true, 5, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. pg_cron: Watchdog every 5 minutes
-- ============================================
-- NOTE: Requires pg_cron and pg_net extensions enabled in Supabase.
-- If not available, the Vercel backup watchdog (/api/cron/watchdog) covers this.

-- Uncomment after verifying pg_cron is enabled:
-- SELECT cron.schedule('watchdog-check-jobs', '*/5 * * * *', 'SELECT watchdog_check_jobs()');

-- ============================================
-- 5. Cleanup: Delete logs older than 30 days (weekly)
-- ============================================

-- Uncomment after verifying pg_cron is enabled:
-- SELECT cron.schedule('cleanup-job-logs', '0 3 * * 0', $$DELETE FROM job_execution_log WHERE started_at < now() - interval '30 days'$$);

-- ============================================
-- 6. RLS: service_role only
-- ============================================

ALTER TABLE job_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchdog_heartbeat ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS by default, so no explicit policies needed.
-- Block anon/authenticated from accessing these tables.
CREATE POLICY "Deny all for anon" ON job_registry FOR ALL TO anon USING (false);
CREATE POLICY "Deny all for authenticated" ON job_registry FOR ALL TO authenticated USING (false);

CREATE POLICY "Deny all for anon" ON job_execution_log FOR ALL TO anon USING (false);
CREATE POLICY "Deny all for authenticated" ON job_execution_log FOR ALL TO authenticated USING (false);

CREATE POLICY "Deny all for anon" ON watchdog_heartbeat FOR ALL TO anon USING (false);
CREATE POLICY "Deny all for authenticated" ON watchdog_heartbeat FOR ALL TO authenticated USING (false);

-- ============================================
-- 7. Helper: Job check-in / check-out functions
-- ============================================

-- Called at the start of a job execution
CREATE OR REPLACE FUNCTION job_checkin(p_job_id TEXT, p_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_registry SET
    status = 'running',
    current_run_id = p_run_id,
    last_started_at = now()
  WHERE id = p_job_id;

  INSERT INTO job_execution_log (job_id, run_id, status, started_at)
  VALUES (p_job_id, p_run_id, 'running', now());
END;
$$;

-- Called at the end of a successful job execution
CREATE OR REPLACE FUNCTION job_checkout_success(p_run_id UUID, p_metadata JSONB DEFAULT '{}')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id TEXT;
  v_started TIMESTAMPTZ;
BEGIN
  SELECT job_id, started_at INTO v_job_id, v_started
  FROM job_execution_log
  WHERE run_id = p_run_id AND status = 'running'
  LIMIT 1;

  IF v_job_id IS NULL THEN RETURN; END IF;

  UPDATE job_execution_log SET
    status = 'completed',
    finished_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - v_started))::INT * 1000,
    metadata = p_metadata
  WHERE run_id = p_run_id AND status = 'running';

  UPDATE job_registry SET
    status = 'completed',
    last_success_at = now(),
    consecutive_failures = 0,
    next_retry_at = NULL,
    metadata = p_metadata
  WHERE id = v_job_id;
END;
$$;

-- Called when a job fails
CREATE OR REPLACE FUNCTION job_checkout_failure(p_run_id UUID, p_error TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id TEXT;
  v_started TIMESTAMPTZ;
  v_failures INT;
  v_max_retries INT;
BEGIN
  SELECT job_id, started_at INTO v_job_id, v_started
  FROM job_execution_log
  WHERE run_id = p_run_id AND status = 'running'
  LIMIT 1;

  IF v_job_id IS NULL THEN RETURN; END IF;

  UPDATE job_execution_log SET
    status = 'failed',
    finished_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - v_started))::INT * 1000,
    error = p_error,
    metadata = p_metadata
  WHERE run_id = p_run_id AND status = 'running';

  SELECT consecutive_failures + 1, max_retries
  INTO v_failures, v_max_retries
  FROM job_registry WHERE id = v_job_id;

  UPDATE job_registry SET
    status = 'failed',
    last_failure_at = now(),
    consecutive_failures = v_failures,
    next_retry_at = CASE
      WHEN v_failures < v_max_retries
      THEN now() + (power(2, v_failures) * interval '5 minutes')
      ELSE NULL
    END,
    metadata = p_metadata
  WHERE id = v_job_id;
END;
$$;
