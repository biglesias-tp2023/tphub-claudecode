import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Backup watchdog running on Vercel Cron (every 10 min).
 * Checks if pg_cron watchdog is alive. If dead, reads job_registry
 * for issues and alerts Slack directly.
 *
 * Also triggers pending retries for failed jobs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check pg_cron watchdog heartbeat
    const { data: heartbeat } = await supabase
      .from('watchdog_heartbeat')
      .select('last_beat_at, issues_found')
      .eq('id', 1)
      .single();

    const heartbeatAge = heartbeat?.last_beat_at
      ? Date.now() - new Date(heartbeat.last_beat_at).getTime()
      : Infinity;
    const pgCronAlive = heartbeatAge < 15 * 60 * 1000; // 15 min

    // 2. Check for problematic jobs
    const { data: problemJobs } = await supabase
      .from('job_registry')
      .select('id, display_name, status, consecutive_failures, max_retries, last_success_at, last_failure_at, metadata')
      .in('status', ['failed', 'dead', 'running']);

    const issues: string[] = [];

    if (!pgCronAlive) {
      const ageMin = Math.round(heartbeatAge / 60000);
      issues.push(`:warning: pg_cron watchdog stale — last heartbeat ${ageMin} min ago`);
    }

    // 3. Trigger pending retries for failed jobs
    const pendingRetries = (problemJobs ?? []).filter(
      (j) => j.status === 'failed' && j.metadata?.pending_retry === true
    );

    for (const job of pendingRetries) {
      issues.push(`:arrows_counterclockwise: Triggering retry for *${job.display_name}*`);

      // Clear pending_retry flag
      await supabase
        .from('job_registry')
        .update({ metadata: { ...job.metadata, pending_retry: false } })
        .eq('id', job.id);

      // Trigger the job endpoint
      try {
        const jobEndpoint = await supabase
          .from('job_registry')
          .select('endpoint')
          .eq('id', job.id)
          .single();

        if (jobEndpoint.data?.endpoint) {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://hub.thinkpaladar.com';

          await fetch(`${baseUrl}${jobEndpoint.data.endpoint}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${secret}` },
          });
        }
      } catch (retryErr) {
        console.error(`[watchdog] Failed to trigger retry for ${job.id}:`, retryErr);
      }
    }

    // 4. Report dead jobs
    const deadJobs = (problemJobs ?? []).filter((j) => j.status === 'dead');
    for (const job of deadJobs) {
      issues.push(`:skull: *${job.display_name}* is DEAD — ${job.consecutive_failures}/${job.max_retries} retries exhausted`);
    }

    // 5. Alert Slack if issues found and pg_cron isn't handling it
    if (issues.length > 0 && slackWebhookUrl && (!pgCronAlive || deadJobs.length > 0)) {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Vercel Watchdog: ${issues.length} issue(s)`,
          username: 'TPHub Watchdog (Vercel)',
          icon_url: 'https://hub.thinkpaladar.com/images/logo/logo.png',
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '\uD83D\uDD0D Vercel Watchdog Report', emoji: true } },
            { type: 'section', text: { type: 'mrkdwn', text: issues.join('\n') } },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `pg_cron: ${pgCronAlive ? 'alive' : 'STALE'} · Vercel backup watchdog` }] },
          ],
        }),
      });
    }

    return res.status(200).json({
      pg_cron_alive: pgCronAlive,
      heartbeat_age_min: Math.round(heartbeatAge / 60000),
      problem_jobs: problemJobs?.length ?? 0,
      retries_triggered: pendingRetries.length,
      issues: issues.length,
    });
  } catch (err) {
    console.error('[watchdog] Error:', err);
    return res.status(500).json({ error: 'Watchdog check failed' });
  }
}
