import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { sendEmail, buildAlertEmailHtml, type AlertCompanyData } from './email.js';
import { escapeHtml, verifyCronSecret } from './auth.js';

// ============================================
// Types
// ============================================

interface OrderAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  store_name: string;
  address_name: string;
  channel: string;
  yesterday_orders: number;
  yesterday_revenue: number;
  avg_orders_baseline: number;
  avg_revenue_baseline: number;
  orders_deviation_pct: number;
  revenue_deviation_pct: number;
  weeks_with_data: number;
}

interface ReviewAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  store_name: string;
  address_name: string;
  channel: string;
  anomaly_type: string;
  yesterday_reviews: number;
  yesterday_avg_rating: number;
  yesterday_negative_count: number;
  baseline_avg_rating: number;
  baseline_avg_negative_count: number;
  rating_deviation_pct: number;
  negative_spike_pct: number;
  weeks_with_data: number;
}

interface AdsAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  store_name: string;
  address_name: string;
  channel: string;
  anomaly_type: string;
  yesterday_ad_spent: number;
  yesterday_ad_revenue: number;
  yesterday_roas: number;
  yesterday_impressions: number;
  yesterday_clicks: number;
  yesterday_ad_orders: number;
  baseline_avg_ad_spent: number;
  baseline_avg_roas: number;
  baseline_avg_impressions: number;
  roas_deviation_pct: number;
  spend_deviation_pct: number;
  impressions_deviation_pct: number;
  weeks_with_data: number;
}

interface PromoAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  store_name: string;
  address_name: string;
  channel: string;
  anomaly_type: string;
  yesterday_orders: number;
  yesterday_revenue: number;
  yesterday_promos: number;
  yesterday_promo_rate: number;
  baseline_avg_promos: number;
  baseline_avg_promo_rate: number;
  promo_rate_deviation_pct: number;
  promo_spend_deviation_pct: number;
  weeks_with_data: number;
}

interface ConsultantProfile {
  id: string;
  email: string;
  full_name: string;
  assigned_company_ids: string[] | null;
  role: string;
  slack_user_id: string | null;
}

interface DbAlertPreference {
  id: string;
  consultant_id: string;
  company_id: string;
  orders_enabled: boolean;
  reviews_enabled: boolean;
  ads_enabled: boolean;
  promos_enabled: boolean;
  slack_enabled: boolean;
  email_enabled: boolean;
  orders_threshold: number | null;
  reviews_threshold: number | null;
  ads_roas_threshold: number | null;
  promos_threshold: number | null;
}

interface ConsultantGroup {
  consultant: {
    name: string;
    email: string;
    slackUserId: string | null;
  };
  orders: OrderAnomaly[];
  reviews: ReviewAnomaly[];
  ads: AdsAnomaly[];
  promos: PromoAnomaly[];
  /** Whether this consultant wants Slack notifications (default true) */
  wantsSlack: boolean;
  /** Whether this consultant wants Email notifications */
  wantsEmail: boolean;
}

// ============================================
// Helpers
// ============================================

async function sendSlack(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not configured');
    return;
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!response.ok) {
    console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}

function getYesterdayLabel(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]} ${yesterday.getFullYear()}`;
}

function groupAnomaliesByConsultant(
  profiles: ConsultantProfile[],
  orderAnomalies: OrderAnomaly[],
  reviewAnomalies: ReviewAnomaly[],
  adsAnomalies: AdsAnomaly[],
  promoAnomalies: PromoAnomaly[],
  prefsMap: Map<string, DbAlertPreference>,
): Record<string, ConsultantGroup> {
  const groups: Record<string, ConsultantGroup> = {};

  // Build a map: company_id → consultant(s)
  const companyToConsultants = new Map<string, ConsultantProfile[]>();
  for (const profile of profiles) {
    if (!profile.assigned_company_ids) continue;
    for (const companyId of profile.assigned_company_ids) {
      const existing = companyToConsultants.get(companyId) ?? [];
      existing.push(profile);
      companyToConsultants.set(companyId, existing);
    }
  }

  // Helper to get pref for a consultant+company pair
  const getPref = (consultantId: string, companyId: string): DbAlertPreference | undefined =>
    prefsMap.get(`${consultantId}:${companyId}`);

  const getOrCreateGroup = (profile: ConsultantProfile, companyId: string): ConsultantGroup => {
    if (!groups[profile.id]) {
      groups[profile.id] = {
        consultant: {
          name: profile.full_name,
          email: profile.email,
          slackUserId: profile.slack_user_id,
        },
        orders: [],
        reviews: [],
        ads: [],
        promos: [],
        wantsSlack: true,
        wantsEmail: false,
      };
    }
    // Update channel preferences — if any company has email enabled, flag it
    const pref = getPref(profile.id, companyId);
    if (pref) {
      if (pref.email_enabled) groups[profile.id].wantsEmail = true;
      // Only set wantsSlack false if ALL prefs have it disabled
      // (keep default true unless explicitly overridden)
    }
    return groups[profile.id];
  };

  const getUnassignedGroup = (): ConsultantGroup => {
    const key = '__unassigned__';
    if (!groups[key]) {
      groups[key] = {
        consultant: { name: 'Sin asignar', email: '', slackUserId: null },
        orders: [],
        reviews: [],
        ads: [],
        promos: [],
        wantsSlack: true,
        wantsEmail: false,
      };
    }
    return groups[key];
  };

  // Group order anomalies (filtered by preferences)
  for (const anomaly of orderAnomalies) {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        const pref = getPref(c.id, anomaly.company_id);
        // Skip if orders disabled for this consultant+company
        if (pref && !pref.orders_enabled) continue;
        // Check custom threshold
        if (pref?.orders_threshold != null) {
          if (anomaly.orders_deviation_pct > pref.orders_threshold) continue;
        }
        getOrCreateGroup(c, anomaly.company_id).orders.push(anomaly);
      }
    } else {
      getUnassignedGroup().orders.push(anomaly);
    }
  }

  // Group review anomalies
  for (const anomaly of reviewAnomalies) {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        const pref = getPref(c.id, anomaly.company_id);
        if (pref && !pref.reviews_enabled) continue;
        getOrCreateGroup(c, anomaly.company_id).reviews.push(anomaly);
      }
    } else {
      getUnassignedGroup().reviews.push(anomaly);
    }
  }

  // Group ads anomalies
  for (const anomaly of adsAnomalies) {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        const pref = getPref(c.id, anomaly.company_id);
        if (pref && !pref.ads_enabled) continue;
        getOrCreateGroup(c, anomaly.company_id).ads.push(anomaly);
      }
    } else {
      getUnassignedGroup().ads.push(anomaly);
    }
  }

  // Group promo anomalies
  for (const anomaly of promoAnomalies) {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        const pref = getPref(c.id, anomaly.company_id);
        if (pref && !pref.promos_enabled) continue;
        getOrCreateGroup(c, anomaly.company_id).promos.push(anomaly);
      }
    } else {
      getUnassignedGroup().promos.push(anomaly);
    }
  }

  // Bruno Iglesias receives ALL anomalies (global overview)
  const GLOBAL_ALERT_EMAIL = 'biglesias@thinkpaladar.com';
  const brunoProfile = profiles.find((p) => p.email === GLOBAL_ALERT_EMAIL);
  if (brunoProfile) {
    const group = getOrCreateGroup(brunoProfile, '__global__');
    group.wantsEmail = true;
    // Deduplicate: collect company_ids already in his group
    const existingOrderKeys = new Set(group.orders.map((a) => `${a.company_id}:${a.store_name}:${a.channel}`));
    const existingReviewKeys = new Set(group.reviews.map((a) => `${a.company_id}:${a.store_name}:${a.channel}`));
    const existingAdsKeys = new Set(group.ads.map((a) => `${a.company_id}:${a.store_name}:${a.channel}`));
    const existingPromoKeys = new Set(group.promos.map((a) => `${a.company_id}:${a.store_name}:${a.channel}`));

    for (const a of orderAnomalies) {
      const key = `${a.company_id}:${a.store_name}:${a.channel}`;
      if (!existingOrderKeys.has(key)) { group.orders.push(a); existingOrderKeys.add(key); }
    }
    for (const a of reviewAnomalies) {
      const key = `${a.company_id}:${a.store_name}:${a.channel}`;
      if (!existingReviewKeys.has(key)) { group.reviews.push(a); existingReviewKeys.add(key); }
    }
    for (const a of adsAnomalies) {
      const key = `${a.company_id}:${a.store_name}:${a.channel}`;
      if (!existingAdsKeys.has(key)) { group.ads.push(a); existingAdsKeys.add(key); }
    }
    for (const a of promoAnomalies) {
      const key = `${a.company_id}:${a.store_name}:${a.channel}`;
      if (!existingPromoKeys.has(key)) { group.promos.push(a); existingPromoKeys.add(key); }
    }
  }

  return groups;
}

function buildFallbackMessage(groups: Record<string, ConsultantGroup>): string {
  const lines: string[] = [`*Alertas diarias — ${getYesterdayLabel()}*\n`];

  for (const group of Object.values(groups)) {
    const totalAnomalies = group.orders.length + group.reviews.length + group.ads.length + group.promos.length;
    if (totalAnomalies === 0) continue;

    const mention = group.consultant.slackUserId
      ? `<@${group.consultant.slackUserId}>`
      : `*${group.consultant.name}*`;
    lines.push(`\n${mention}\n`);

    if (group.orders.length > 0) {
      lines.push('*Pedidos:*');
      for (const a of group.orders) {
        const emoji = a.orders_deviation_pct <= -25 ? ':red_circle:' : ':large_yellow_circle:';
        lines.push(
          `${emoji} *${a.company_name} — ${a.store_name}* | ${a.address_name} (${a.channel}) — ${a.yesterday_orders} pedidos (media: ${a.avg_orders_baseline}) → *${a.orders_deviation_pct}%*`,
        );
      }
    }

    if (group.reviews.length > 0) {
      lines.push('*Resenas:*');
      for (const a of group.reviews) {
        lines.push(
          `:star: *${a.company_name} — ${a.store_name}* | ${a.address_name} (${a.channel}) — Rating: *${a.yesterday_avg_rating}* (media: ${a.baseline_avg_rating}) | ${a.yesterday_negative_count} negativas`,
        );
      }
    }

    if (group.promos.length > 0) {
      lines.push('*Promos:*');
      for (const a of group.promos) {
        lines.push(
          `:ticket: *${a.company_name} — ${a.store_name}* | ${a.address_name} (${a.channel}) — Promos: *${a.yesterday_promos}€* (${a.yesterday_promo_rate}% de ventas, media: ${a.baseline_avg_promo_rate}%) → *+${a.promo_spend_deviation_pct}%*`,
        );
      }
    }

    if (group.ads.length > 0) {
      lines.push('*Publicidad:*');
      for (const a of group.ads) {
        lines.push(
          `:loudspeaker: *${a.company_name} — ${a.store_name}* | ${a.address_name} (${a.channel}) — ROAS: *${a.yesterday_roas}x* (media: ${a.baseline_avg_roas}x) | Gasto: ${a.yesterday_ad_spent}€`,
        );
      }
    }
  }

  return lines.join('\n');
}

async function formatWithClaude(groups: Record<string, ConsultantGroup>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not configured, using fallback template');
    return buildFallbackMessage(groups);
  }

  const anthropic = new Anthropic({ apiKey });

  // Build data summary for Claude
  const dataForClaude: Record<string, unknown>[] = [];
  for (const group of Object.values(groups)) {
    const totalAnomalies = group.orders.length + group.reviews.length + group.ads.length + group.promos.length;
    if (totalAnomalies === 0) continue;
    dataForClaude.push({
      consultant: group.consultant,
      orders: group.orders,
      reviews: group.reviews,
      promos: group.promos,
      ads: group.ads,
    });
  }

  if (dataForClaude.length === 0) {
    return ':large_green_circle: Todos los restaurantes dentro de rango normal ayer (pedidos, resenas, promos y ads).';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Genera el mensaje de alerta diaria para Slack con estos datos de anomalias de ayer (${getYesterdayLabel()}).

Datos por consultor:
${JSON.stringify(dataForClaude, null, 2)}

REGLAS:
- Formato Slack (emojis, *negrita*, breve)
- Para cada consultor: si tiene slack_user_id, usar <@SLACK_USER_ID> como mencion. Si no, usar *nombre* en negrita.
- PEDIDOS: Agrupa en :red_circle: Criticos (>25% caida) y :large_yellow_circle: Vigilancia (20-25% caida). Formato: Empresa — Marca | Direccion (Canal) — X pedidos (media Y) → Z%
- RESENAS: Usa :star: con rating ayer vs media y negativas. Solo si hay anomalias.
- PROMOS: Usa :ticket: con gasto en promos, % sobre ventas ayer vs media. Solo si hay anomalias.
- ADS: Usa :loudspeaker: con ROAS y gasto. Solo si hay anomalias.
- Si desviacion > 30%, anade hipotesis breve de causa.
- Al final indica cuantos restaurantes estan en rango normal (total activos - anomalias).
- Omite secciones sin anomalias (no pongas "Resenas: todo ok").
- NO inventes datos. Usa SOLO los proporcionados.
- Empieza con *Alertas diarias — ${getYesterdayLabel()}*`,
        },
      ],
      system:
        'Eres un analista de delivery para ThinkPaladar. Genera alertas concisas para Slack en espanol. No uses markdown de headers (##), solo formato Slack (*negrita*, emojis). Maximo 3-4 lineas por restaurante. Se directo y util.',
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock?.text ?? buildFallbackMessage(groups);
  } catch (error) {
    console.error('Claude API error, using fallback:', error);
    return buildFallbackMessage(groups);
  }
}

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[daily-alerts] Starting execution');

  // 1. Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Verify auth (timing-safe comparison)
  if (!verifyCronSecret(req.headers.authorization as string | undefined)) {
    console.log('[daily-alerts] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 3. Create Supabase client with service role key
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[daily-alerts] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 4. Call 4 RPCs in parallel
  const threshold = Number(process.env.ALERT_THRESHOLD ?? -20);
  console.log(`[daily-alerts] Calling RPCs with threshold=${threshold}`);

  const [ordersResult, reviewsResult, adsResult, promosResult] = await Promise.all([
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
    supabase.rpc('get_daily_promo_anomalies', {
      p_promo_rate_threshold: 15,
      p_promo_spike_pct: 50,
      p_min_orders: 10,
    }),
  ]);

  // 5. Check for errors
  const errors = [
    ordersResult.error && `Orders: ${ordersResult.error.message}`,
    reviewsResult.error && `Reviews: ${reviewsResult.error.message}`,
    adsResult.error && `Ads: ${adsResult.error.message}`,
    promosResult.error && `Promos: ${promosResult.error.message}`,
  ].filter(Boolean) as string[];

  if (errors.length > 0) {
    console.error('[daily-alerts] RPC errors:', errors);
    await sendSlack(`:warning: Errores en alertas diarias:\n${errors.join('\n')}`);
    if (errors.length === 4) {
      return res.status(500).json({ error: 'Failed to fetch anomaly data' });
    }
  }

  const orderAnomalies: OrderAnomaly[] = ordersResult.data ?? [];
  const reviewAnomalies: ReviewAnomaly[] = reviewsResult.data ?? [];
  const adsAnomalies: AdsAnomaly[] = adsResult.data ?? [];
  const promoAnomalies: PromoAnomaly[] = promosResult.data ?? [];
  const totalAnomalies = orderAnomalies.length + reviewAnomalies.length + adsAnomalies.length + promoAnomalies.length;

  console.log(
    `[daily-alerts] Found anomalies: orders=${orderAnomalies.length}, reviews=${reviewAnomalies.length}, ads=${adsAnomalies.length}, promos=${promoAnomalies.length}`,
  );

  // 6. No anomalies → send "all ok"
  if (totalAnomalies === 0) {
    await sendSlack(
      `:large_green_circle: *Alertas diarias — ${getYesterdayLabel()}*\nTodos los restaurantes dentro de rango normal ayer (pedidos, resenas, promos y ads).`,
    );
    return res.status(200).json({ message: 'No anomalies', count: 0 });
  }

  // 7. Fetch consultant profiles
  console.log('[daily-alerts] Fetching consultant profiles');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, assigned_company_ids, role, slack_user_id')
    .in('role', ['consultant', 'manager', 'admin']);

  if (profilesError) {
    console.error('[daily-alerts] Profiles query error:', profilesError.message);
  }

  // 7b. Fetch alert preferences
  console.log('[daily-alerts] Fetching alert preferences');
  const { data: prefsData, error: prefsError } = await supabase
    .from('alert_preferences')
    .select('*');

  if (prefsError) {
    console.log('[daily-alerts] Prefs query error (non-fatal, using defaults):', prefsError.message);
  }

  // Build prefs map: key = "consultantId:companyId"
  const prefsMap = new Map<string, DbAlertPreference>();
  if (prefsData) {
    for (const pref of prefsData as DbAlertPreference[]) {
      prefsMap.set(`${pref.consultant_id}:${pref.company_id}`, pref);
    }
  }
  console.log(`[daily-alerts] Loaded ${prefsMap.size} alert preferences`);

  // 8. Group anomalies by consultant (filtered by preferences)
  const groups = groupAnomaliesByConsultant(
    (profiles as ConsultantProfile[]) ?? [],
    orderAnomalies,
    reviewAnomalies,
    adsAnomalies,
    promoAnomalies,
    prefsMap,
  );

  console.log(`[daily-alerts] Grouped into ${Object.keys(groups).length} consultant groups`);

  // 9. Format message with Claude API (fallback to template if unavailable)
  console.log('[daily-alerts] Formatting message');
  const message = await formatWithClaude(groups);

  // 10. Send to Slack
  console.log('[daily-alerts] Sending to Slack');
  await sendSlack(message);

  // 10b. Send email to consultants who have email_enabled
  let emailsSent = 0;
  for (const group of Object.values(groups)) {
    if (!group.wantsEmail || !group.consultant.email) continue;
    const totalAnomalies = group.orders.length + group.reviews.length + group.ads.length + group.promos.length;
    if (totalAnomalies === 0) continue;

    // Group all anomalies by company name for card-based email
    const companyMap = new Map<string, { metrics: AlertCompanyData['metrics']; maxDeviation: number }>();

    for (const a of group.orders) {
      const key = `${a.company_name} — ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Pedidos',
        value: `${a.yesterday_orders} (media: ${a.avg_orders_baseline}) → ${a.orders_deviation_pct}%`,
        threshold: '-20%',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.orders_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.reviews) {
      const key = `${a.company_name} — ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Resenas',
        value: `Rating: ${a.yesterday_avg_rating} (media: ${a.baseline_avg_rating}) | ${a.yesterday_negative_count} negativas`,
        threshold: '3.5',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.rating_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.promos) {
      const key = `${a.company_name} — ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Promos',
        value: `${a.yesterday_promos}\u20AC (${a.yesterday_promo_rate}% de ventas) → +${a.promo_spend_deviation_pct}%`,
        threshold: '15%',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.promo_spend_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.ads) {
      const key = `${a.company_name} — ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Publicidad',
        value: `ROAS: ${a.yesterday_roas}x (media: ${a.baseline_avg_roas}x) | Gasto: ${a.yesterday_ad_spent}\u20AC`,
        threshold: '3.0x',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.roas_deviation_pct));
      companyMap.set(key, entry);
    }

    const emailCompanies: AlertCompanyData[] = Array.from(companyMap.entries())
      .map(([name, data]) => ({
        name,
        severity: (data.maxDeviation >= 50 ? 'critical' : data.maxDeviation >= 25 ? 'warning' : 'attention') as AlertCompanyData['severity'],
        metrics: data.metrics,
      }))
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, attention: 2 };
        return order[a.severity] - order[b.severity];
      });

    const html = buildAlertEmailHtml(
      group.consultant.name,
      getYesterdayLabel(),
      emailCompanies
    );

    const sent = await sendEmail({
      to: group.consultant.email,
      subject: `Alertas diarias — ${getYesterdayLabel()}`,
      html,
    });
    if (sent) emailsSent++;
  }

  if (emailsSent > 0) {
    console.log(`[daily-alerts] Sent ${emailsSent} email(s)`);
  }

  // 11. Respond
  console.log('[daily-alerts] Done');
  return res.status(200).json({
    message: 'Alerts sent',
    order_anomalies: orderAnomalies.length,
    review_anomalies: reviewAnomalies.length,
    ads_anomalies: adsAnomalies.length,
    promo_anomalies: promoAnomalies.length,
    consultants_notified: Object.keys(groups).length,
    emails_sent: emailsSent,
    preferences_loaded: prefsMap.size,
  });
}
