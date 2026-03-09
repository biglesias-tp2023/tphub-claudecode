import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Simple watchdog status endpoint for UptimeRobot.
 * Returns 200 if pg_cron watchdog heartbeat is fresh (< 15 min), 500 if stale.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ status: 'error', message: 'Missing Supabase config' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('watchdog_heartbeat')
      .select('last_beat_at, jobs_checked, issues_found')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return res.status(500).json({ status: 'error', message: 'No heartbeat found' });
    }

    const diffMs = Date.now() - new Date(data.last_beat_at).getTime();
    const staleMinutes = 15;
    const isAlive = diffMs < staleMinutes * 60 * 1000;

    return res.status(isAlive ? 200 : 500).json({
      status: isAlive ? 'alive' : 'stale',
      last_beat_at: data.last_beat_at,
      age_minutes: Math.round(diffMs / 60000),
      jobs_checked: data.jobs_checked,
      issues_found: data.issues_found,
    });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Check failed' });
  }
}
