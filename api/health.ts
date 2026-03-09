import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'critical';
  message?: string;
  critical: boolean;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: HealthCheck[] = [];
  const startTime = Date.now();

  // 1. Check env vars
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SLACK_WEBHOOK_URL', 'CRON_SECRET'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.push({
    name: 'env_vars',
    status: missingVars.length > 0 ? 'critical' : 'ok',
    message: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : undefined,
    critical: true,
  });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Supabase connection check
    try {
      const { error } = await supabase.from('job_registry').select('id').limit(1);
      checks.push({
        name: 'supabase_connection',
        status: error ? 'critical' : 'ok',
        message: error ? 'Query failed' : undefined,
        critical: true,
      });
    } catch {
      checks.push({
        name: 'supabase_connection',
        status: 'critical',
        message: 'Connection failed',
        critical: true,
      });
    }

    // 3. Data freshness — critical jobs with last_success_at > 48h
    try {
      const { data: staleJobs } = await supabase
        .from('job_registry')
        .select('id, display_name, last_success_at')
        .eq('is_critical', true)
        .not('cron_expr', 'is', null);

      const stale = (staleJobs ?? []).filter((j: { last_success_at: string | null }) => {
        if (!j.last_success_at) return true;
        const diff = Date.now() - new Date(j.last_success_at).getTime();
        return diff > 48 * 60 * 60 * 1000;
      });

      checks.push({
        name: 'data_freshness',
        status: stale.length > 0 ? 'critical' : 'ok',
        message: stale.length > 0 ? `${stale.length} job(s) stale >48h` : undefined,
        critical: true,
      });
    } catch {
      checks.push({
        name: 'data_freshness',
        status: 'warning',
        message: 'Could not check freshness',
        critical: false,
      });
    }

    // 4. Watchdog alive — heartbeat < 15 min
    try {
      const { data: heartbeat } = await supabase
        .from('watchdog_heartbeat')
        .select('last_beat_at')
        .eq('id', 1)
        .single();

      if (heartbeat?.last_beat_at) {
        const diff = Date.now() - new Date(heartbeat.last_beat_at).getTime();
        const stale = diff > 15 * 60 * 1000;
        checks.push({
          name: 'watchdog_alive',
          status: stale ? 'warning' : 'ok',
          message: stale ? 'Heartbeat stale >15min' : undefined,
          critical: false,
        });
      } else {
        checks.push({
          name: 'watchdog_alive',
          status: 'warning',
          message: 'No heartbeat found',
          critical: false,
        });
      }
    } catch {
      checks.push({
        name: 'watchdog_alive',
        status: 'warning',
        message: 'Could not check heartbeat',
        critical: false,
      });
    }

    // 5. Jobs health — no dead jobs
    try {
      const { data: deadJobs } = await supabase
        .from('job_registry')
        .select('id')
        .eq('status', 'dead');

      const deadCount = deadJobs?.length ?? 0;
      checks.push({
        name: 'jobs_health',
        status: deadCount > 0 ? 'critical' : 'ok',
        message: deadCount > 0 ? `${deadCount} dead job(s)` : undefined,
        critical: true,
      });
    } catch {
      checks.push({
        name: 'jobs_health',
        status: 'warning',
        message: 'Could not check jobs',
        critical: false,
      });
    }
  }

  // Determine overall status
  const hasCriticalFailure = checks.some((c) => c.critical && c.status === 'critical');
  const hasWarning = checks.some((c) => c.status === 'warning' || (!c.critical && c.status === 'critical'));
  const overallStatus = hasCriticalFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

  const statusCode = overallStatus === 'unhealthy' ? 500 : 200;

  return res.status(statusCode).json({
    status: overallStatus,
    checks: checks.map(({ name, status, message }) => ({ name, status, message })),
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
    duration_ms: Date.now() - startTime,
  });
}
