import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Test endpoint for daily alerts.
 * Runs the same RPC queries as daily.ts but does NOT:
 * - Send to Slack
 * - Call Claude API for formatting
 *
 * Returns raw JSON with anomalies and groupings for debugging.
 * Accepts GET (browser testing) and POST.
 */

interface ConsultantProfile {
  id: string;
  email: string;
  full_name: string;
  assigned_company_ids: string[] | null;
  role: string;
  slack_user_id: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[daily-alerts-test] Starting execution');

  // Accept GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Create Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Call 3 RPCs in parallel
  const threshold = Number(process.env.ALERT_THRESHOLD ?? -20);

  const [ordersResult, reviewsResult, adsResult] = await Promise.all([
    supabase.rpc('get_daily_order_anomalies', { p_threshold: threshold }),
    supabase.rpc('get_daily_review_anomalies', {
      p_min_reviews: 3,
      p_rating_threshold: 3.5,
      p_negative_spike_pct: 50,
    }),
    supabase.rpc('get_daily_ads_anomalies', {
      p_roas_threshold: 3.0,
      p_spend_threshold: 10,
      p_spend_deviation_pct: 50,
    }),
  ]);

  // Collect errors
  const errors = [
    ordersResult.error && { rpc: 'orders', message: ordersResult.error.message },
    reviewsResult.error && { rpc: 'reviews', message: reviewsResult.error.message },
    adsResult.error && { rpc: 'ads', message: adsResult.error.message },
  ].filter(Boolean);

  const orderAnomalies = ordersResult.data ?? [];
  const reviewAnomalies = reviewsResult.data ?? [];
  const adsAnomalies = adsResult.data ?? [];

  // Fetch profiles for grouping
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, assigned_company_ids, role, slack_user_id')
    .in('role', ['consultant', 'manager', 'admin']);

  // Group by consultant
  const companyToConsultants = new Map<string, ConsultantProfile[]>();
  if (profiles) {
    for (const profile of profiles as ConsultantProfile[]) {
      if (!profile.assigned_company_ids) continue;
      for (const companyId of profile.assigned_company_ids) {
        const existing = companyToConsultants.get(companyId) ?? [];
        existing.push(profile);
        companyToConsultants.set(companyId, existing);
      }
    }
  }

  // Build grouped view
  type AnomalyItem = { company_id: string; [key: string]: unknown };
  const grouped: Record<string, { consultant: string; email: string; slackUserId: string | null; orders: unknown[]; reviews: unknown[]; ads: unknown[] }> = {};

  const assignAnomaly = (anomaly: AnomalyItem, type: 'orders' | 'reviews' | 'ads') => {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        if (!grouped[c.id]) {
          grouped[c.id] = { consultant: c.full_name, email: c.email, slackUserId: c.slack_user_id, orders: [], reviews: [], ads: [] };
        }
        grouped[c.id][type].push(anomaly);
      }
    } else {
      if (!grouped['__unassigned__']) {
        grouped['__unassigned__'] = { consultant: 'Sin asignar', email: '', slackUserId: null, orders: [], reviews: [], ads: [] };
      }
      grouped['__unassigned__'][type].push(anomaly);
    }
  };

  for (const a of orderAnomalies) assignAnomaly(a, 'orders');
  for (const a of reviewAnomalies) assignAnomaly(a, 'reviews');
  for (const a of adsAnomalies) assignAnomaly(a, 'ads');

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    threshold,
    errors: errors.length > 0 ? errors : undefined,
    profiles_error: profilesError?.message,
    summary: {
      order_anomalies: orderAnomalies.length,
      review_anomalies: reviewAnomalies.length,
      ads_anomalies: adsAnomalies.length,
      total: orderAnomalies.length + reviewAnomalies.length + adsAnomalies.length,
      consultants: Object.keys(grouped).length,
    },
    raw: {
      orders: orderAnomalies,
      reviews: reviewAnomalies,
      ads: adsAnomalies,
    },
    grouped,
  });
}
