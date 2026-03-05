import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildAlertEmailHtml, type AlertCompanyData } from './email.js';
import { escapeHtml, verifyCronSecret } from './auth.js';

// ============================================
// Types
// ============================================

interface OrderAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
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

interface DeliveryTimeAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  channel: string;
  yesterday_avg_delivery_min: number;
  yesterday_orders_with_time: number;
  baseline_avg_delivery_min: number | null;
  delivery_time_deviation_pct: number | null;
  weeks_with_data: number;
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
  deliveryTime: DeliveryTimeAnomaly[];
  /** Low-volume companies with 0 orders yesterday (baseline < minAvgOrders) — informational only */
  noiseOrders: OrderAnomaly[];
  /** Whether this consultant wants Slack notifications (default true) */
  wantsSlack: boolean;
  /** Whether this consultant wants Email notifications */
  wantsEmail: boolean;
}

// ============================================
// Helpers
// ============================================

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text?: string | { type: string; text: string; emoji?: boolean }; url?: string }>;
  accessory?: { type: string; text: { type: string; text: string; emoji?: boolean }; url: string; style?: string };
}

const TPHUB_URL = 'https://hub.thinkpaladar.com/controlling';

/** Max blocks per Slack message (Slack limit is 50) */
const SLACK_MAX_BLOCKS = 48;

async function sendSlackRaw(text: string, blocks?: SlackBlock[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not configured');
    return;
  }
  const payload: Record<string, unknown> = {
    text,
    username: 'TPHub Alertas',
    icon_url: 'https://hub.thinkpaladar.com/images/logo/logo.png',
  };
  if (blocks) payload.blocks = blocks;
  const body = JSON.stringify(payload);
  console.log(`[slack] Sending message: ${body.length} bytes, ${blocks?.length ?? 0} blocks`);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) {
    const respBody = await response.text().catch(() => '');
    console.error(`Slack webhook failed: ${response.status} ${response.statusText} — ${respBody}`);
  }
}

/** Send to Slack, splitting into multiple messages if blocks exceed limit */
async function sendSlack(text: string, blocks?: SlackBlock[]): Promise<void> {
  if (!blocks || blocks.length <= SLACK_MAX_BLOCKS) {
    return sendSlackRaw(text, blocks);
  }

  // Split blocks into chunks of SLACK_MAX_BLOCKS
  for (let i = 0; i < blocks.length; i += SLACK_MAX_BLOCKS) {
    const chunk = blocks.slice(i, i + SLACK_MAX_BLOCKS);
    const partText = i === 0 ? text : `${text} (cont.)`;
    await sendSlackRaw(partText, chunk);
  }
}

type AnyAnomaly = OrderAnomaly | ReviewAnomaly | AdsAnomaly | PromoAnomaly | DeliveryTimeAnomaly;

/** Apply strict filters — only keep critical anomalies for Slack */
function filterCriticalAnomalies(group: ConsultantGroup): ConsultantGroup {
  return {
    ...group,
    orders: group.orders.filter(
      (a) => a.orders_deviation_pct <= -25 && a.avg_orders_baseline >= 5,
    ),
    reviews: group.reviews.filter(
      (a) => a.yesterday_avg_rating < 4.0 || a.yesterday_negative_count >= 3,
    ),
    ads: [],      // disabled — not critical daily
    promos: [],   // disabled — not critical daily
    deliveryTime: group.deliveryTime, // already filtered at RPC level (>45 min)
  };
}

function getYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

/** "miércoles, 4 de marzo, 2026" — for Slack header */
function getYesterdayLabel(): string {
  const d = getYesterday();
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

/** "Martes, 3 de marzo de 2026" — for email header */
function getYesterdayLong(): string {
  const d = getYesterday();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "Martes, 03/03/2026" — for email subject */
function getYesterdayShort(): string {
  const d = getYesterday();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${days[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`;
}

/** Strip diacritics: "María" → "Maria", "Inés" → "Ines" */
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Match a CRP key_account_manager name to a consultant profile.
 * Handles variations like "Bruno R. Iglesias" → "Bruno Iglesias",
 * "Inés Gallarde" → "Inés Gallarde Llevat".
 * Accent-insensitive: "María" matches "Maria".
 */
function matchConsultant(
  managerName: string | null,
  profiles: ConsultantProfile[],
): ConsultantProfile | null {
  if (!managerName) return null;
  const parts = managerName.trim().split(/\s+/).filter((p) => !/^[A-Z]\.?$/.test(p)); // remove initials like "R."
  if (parts.length < 2) return null;
  const firstName = stripAccents(parts[0].toLowerCase());
  const lastName = stripAccents(parts[parts.length - 1].toLowerCase());

  for (const p of profiles) {
    const nameLower = stripAccents(p.full_name.toLowerCase());
    if (nameLower.includes(firstName) && nameLower.includes(lastName)) {
      return p;
    }
  }
  return null;
}

function groupAnomaliesByConsultant(
  profiles: ConsultantProfile[],
  orderAnomalies: OrderAnomaly[],
  reviewAnomalies: ReviewAnomaly[],
  adsAnomalies: AdsAnomaly[],
  promoAnomalies: PromoAnomaly[],
  deliveryTimeAnomalies: DeliveryTimeAnomaly[],
  noiseOrderAnomalies: OrderAnomaly[],
  prefsMap: Map<string, DbAlertPreference>,
): Record<string, ConsultantGroup> {
  const groups: Record<string, ConsultantGroup> = {};

  const getOrCreateGroup = (profile: ConsultantProfile): ConsultantGroup => {
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
        deliveryTime: [],
        noiseOrders: [],
        wantsSlack: true,
        wantsEmail: false,
      };
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
        deliveryTime: [],
        noiseOrders: [],
        wantsSlack: true,
        wantsEmail: false,
      };
    }
    return groups[key];
  };

  // Route anomaly to consultant matched by key_account_manager name
  const route = <T extends { key_account_manager: string | null }>(
    anomaly: T,
    target: keyof Pick<ConsultantGroup, 'orders' | 'reviews' | 'ads' | 'promos' | 'deliveryTime' | 'noiseOrders'>,
  ) => {
    const consultant = matchConsultant(anomaly.key_account_manager, profiles);
    if (consultant) {
      (getOrCreateGroup(consultant)[target] as unknown as T[]).push(anomaly);
    } else {
      (getUnassignedGroup()[target] as unknown as T[]).push(anomaly);
    }
  };

  for (const a of orderAnomalies) route(a, 'orders');
  for (const a of reviewAnomalies) route(a, 'reviews');
  for (const a of adsAnomalies) route(a, 'ads');
  for (const a of promoAnomalies) route(a, 'promos');
  for (const a of deliveryTimeAnomalies) route(a, 'deliveryTime');
  for (const a of noiseOrderAnomalies) route(a, 'noiseOrders');

  // All consultants get email
  for (const group of Object.values(groups)) {
    if (group.consultant.email) {
      group.wantsEmail = true;
    }
  }

  return groups;
}

/** Capitalize channel name: glovo → Glovo, ubereats → UberEats */
function formatChannel(ch: string): string {
  if (ch === 'glovo') return 'Glovo';
  if (ch === 'ubereats') return 'UberEats';
  if (ch === 'justeat') return 'JustEat';
  return ch;
}

/** Format a single KPI line — no labels, just icon + data */
function formatKpiLine(anomaly: AnyAnomaly, type: string): string {
  if (type === 'orders') {
    const a = anomaly as OrderAnomaly;
    return `:chart_with_downwards_trend: ${a.yesterday_orders} (media ${Math.round(a.avg_orders_baseline)}) → *${a.orders_deviation_pct}%*`;
  } else if (type === 'reviews') {
    const a = anomaly as ReviewAnomaly;
    return `:star: ${a.yesterday_avg_rating} vs ${a.baseline_avg_rating} · ${a.yesterday_negative_count} negativas`;
  } else if (type === 'ads') {
    const a = anomaly as AdsAnomaly;
    const extra = a.yesterday_ad_orders === 0 && a.yesterday_clicks > 0
      ? ` · ${a.yesterday_clicks} clics sin conversión`
      : '';
    return `:loudspeaker: ${a.yesterday_roas}x vs ${a.baseline_avg_roas}x · ${a.yesterday_ad_spent}\u20AC${extra}`;
  } else if (type === 'promos') {
    const a = anomaly as PromoAnomaly;
    return `:label: ${a.yesterday_promo_rate}% (media ${a.baseline_avg_promo_rate}%) → *+${a.promo_rate_deviation_pct}%*`;
  } else {
    const a = anomaly as DeliveryTimeAnomaly;
    const baseline = a.baseline_avg_delivery_min != null ? ` (media ${a.baseline_avg_delivery_min})` : '';
    return `:motor_scooter: *${a.yesterday_avg_delivery_min} min*${baseline} · ${a.yesterday_orders_with_time} pedidos`;
  }
}

/** Build a Block Kit Slack message for a single consultant: Company → Channel → KPIs */
function buildConsultantMessage(group: ConsultantGroup): { text: string; blocks: SlackBlock[] } | null {
  const filtered = filterCriticalAnomalies(group);
  type Item = { companyName: string; channel: string; anomaly: AnyAnomaly; type: string };
  const allItems: Item[] = [];

  const collect = <T extends AnyAnomaly>(list: T[], type: string) => {
    for (const a of list) {
      allItems.push({
        companyName: (a as unknown as Record<string, string>).company_name,
        channel: (a as unknown as Record<string, string>).channel,
        anomaly: a,
        type,
      });
    }
  };

  collect(filtered.orders, 'orders');
  collect(filtered.reviews, 'reviews');
  collect(filtered.ads, 'ads');
  collect(filtered.promos, 'promos');
  collect(filtered.deliveryTime, 'deliveryTime');

  if (allItems.length === 0) return null;

  // Group by company
  const byCompany = new Map<string, Item[]>();
  for (const item of allItems) {
    const existing = byCompany.get(item.companyName) ?? [];
    existing.push(item);
    byCompany.set(item.companyName, existing);
  }

  const BRUNO_SLACK_ID = 'U06010KKQSX';
  const mention = group.consultant.slackUserId
    ? `<@${group.consultant.slackUserId}>`
    : `*${group.consultant.name}*`;

  // Fallback text (notifications, screen readers)
  const fallbackText = `Alertas — ${getYesterdayLabel()} | ${allItems.length} KPIs para revisar`;

  const blocks: SlackBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: `\uD83D\uDD14 Alertas del ${getYesterdayLabel()}`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `<@${BRUNO_SLACK_ID}> _Buenos días, estos son los KPIs que deben ser revisados:_` } },
    { type: 'section', text: { type: 'mrkdwn', text: mention } },
    { type: 'divider' },
  ];

  for (const [companyName, items] of byCompany) {
    // All KPI lines for this company — channel included in each line
    const kpiLines = items.map(({ anomaly, type, channel }) =>
      `${formatKpiLine(anomaly, type)} _(${formatChannel(channel)})_`,
    );
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${companyName}*\n${kpiLines.join('\n')}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Ver en TPHub', emoji: true },
        url: TPHUB_URL,
        style: 'primary',
      },
    });
    blocks.push({ type: 'divider' });
  }

  // Noise section: 0 orders with low baseline (informational)
  if (group.noiseOrders.length > 0) {
    const noiseItems = group.noiseOrders.map(
      (a) => `${a.company_name} (${formatChannel(a.channel)})`,
    );
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_0 pedidos ayer pero media <3:_ ${noiseItems.join(', ')}` }],
    });
  }

  // Footer
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: 'TPHub Alertas · 08:30' }],
  });

  return { text: fallbackText, blocks };
}

// No Claude API formatting — deterministic template is faster and more consistent

// ============================================
// Handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[daily-alerts] Starting execution');

  // 1. Accept GET (Vercel Cron) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
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

  // 4. Call RPCs in parallel (orders, reviews, delivery + noise)
  const threshold = Number(process.env.ALERT_THRESHOLD ?? -20);
  const minAvgOrders = Number(process.env.ALERT_MIN_AVG_ORDERS ?? 3);
  console.log(`[daily-alerts] Calling RPCs with threshold=${threshold}, minAvgOrders=${minAvgOrders}`);

  const [ordersResult, reviewsResult, deliveryResult, noiseOrdersResult] = await Promise.all([
    supabase.rpc('get_daily_order_anomalies', { p_threshold: threshold, p_min_avg_orders: minAvgOrders }),
    supabase.rpc('get_daily_review_anomalies', {
      p_min_reviews: 3,
      p_rating_threshold: 3.5,
      p_negative_spike_pct: 50,
    }),
    supabase.rpc('get_daily_delivery_time_anomalies', {
      p_max_minutes: 45,
      p_min_orders: 5,
    }),
    // Noise: 0-order companies with low baseline (media < minAvgOrders)
    supabase.rpc('get_daily_order_anomalies', { p_threshold: -99, p_min_avg_orders: 0 }),
  ]);

  // 5. Check for errors — deduplicate by error message
  const errorEntries = [
    ordersResult.error && { label: 'Orders', msg: ordersResult.error.message },
    reviewsResult.error && { label: 'Reviews', msg: reviewsResult.error.message },
    deliveryResult.error && { label: 'Delivery', msg: deliveryResult.error.message },
  ].filter(Boolean) as { label: string; msg: string }[];

  if (errorEntries.length > 0) {
    // Deduplicate: group labels by error message
    const byMessage = new Map<string, string[]>();
    for (const { label, msg } of errorEntries) {
      const existing = byMessage.get(msg) ?? [];
      existing.push(label);
      byMessage.set(msg, existing);
    }
    const deduped = Array.from(byMessage.entries()).map(
      ([msg, labels]) => `\u2022 ${labels.join(', ')}: ${msg}`,
    );
    console.error('[daily-alerts] RPC errors:', errorEntries);
    const errorText = `Errores en alertas diarias: ${deduped.join(' | ')}`;
    const errorBlocks: SlackBlock[] = [
      { type: 'header', text: { type: 'plain_text', text: '\u26A0\uFE0F Errores en alertas diarias', emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: deduped.join('\n') } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `TPHub Alertas · ${getYesterdayLabel()}` }] },
    ];
    await sendSlack(errorText, errorBlocks);
    if (errorEntries.length === 3) {
      return res.status(500).json({ error: 'Failed to fetch anomaly data' });
    }
  }

  const orderAnomalies: OrderAnomaly[] = ordersResult.data ?? [];
  const reviewAnomalies: ReviewAnomaly[] = reviewsResult.data ?? [];
  const adsAnomalies: AdsAnomaly[] = [];
  const promoAnomalies: PromoAnomaly[] = [];
  const deliveryTimeAnomalies: DeliveryTimeAnomaly[] = deliveryResult.data ?? [];
  // Noise: 0 orders yesterday + baseline < minAvgOrders (not in main results)
  const noiseOrderAnomalies: OrderAnomaly[] = ((noiseOrdersResult.data ?? []) as OrderAnomaly[]).filter(
    (a) => a.yesterday_orders === 0 && a.avg_orders_baseline < minAvgOrders,
  );
  const totalAnomalies = orderAnomalies.length + reviewAnomalies.length + deliveryTimeAnomalies.length;

  console.log(
    `[daily-alerts] Found anomalies: orders=${orderAnomalies.length}, reviews=${reviewAnomalies.length}, delivery=${deliveryTimeAnomalies.length}, noise=${noiseOrderAnomalies.length}`,
  );

  // 6. No anomalies → send "all ok"
  if (totalAnomalies === 0) {
    const okText = 'Alertas — No hay KPIs que revisar. Todo OK!';
    const okBlocks: SlackBlock[] = [
      { type: 'header', text: { type: 'plain_text', text: `\uD83C\uDF89 Alertas del ${getYesterdayLabel()}`, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: ':white_check_mark: Enhorabuena, no hay ningún KPI que revisar del día de ayer. *Todo OK!*' } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'TPHub Alertas · 08:30' }] },
    ];
    await sendSlack(okText, okBlocks);
    return res.status(200).json({ message: 'No anomalies', count: 0 });
  }

  // 7. Fetch consultant profiles
  console.log('[daily-alerts] Fetching consultant profiles');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, slack_user_id')
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
    deliveryTimeAnomalies,
    noiseOrderAnomalies,
    prefsMap,
  );

  console.log(`[daily-alerts] Grouped into ${Object.keys(groups).length} consultant groups`);

  // 8b. Log slack_user_id mapping for diagnostics
  for (const group of Object.values(groups)) {
    console.log(
      `[daily-alerts] Consultant: ${group.consultant.name} | email: ${group.consultant.email} | slack_user_id: ${group.consultant.slackUserId ?? 'NULL'}`,
    );
  }

  // 9. Send one Slack message per consultant (with critical filter)
  // Skip __unassigned__ group — no consultant to notify
  console.log('[daily-alerts] Formatting and sending Slack messages per consultant');
  let slackMessagesSent = 0;

  for (const [groupId, group] of Object.entries(groups)) {
    if (groupId === '__unassigned__') continue;
    if (!group.wantsSlack) continue;
    const filtered = filterCriticalAnomalies(group);
    const criticalCount = filtered.orders.length + filtered.reviews.length + filtered.deliveryTime.length;
    if (criticalCount === 0) continue;

    const result = buildConsultantMessage(group);
    if (result) {
      await sendSlack(result.text, result.blocks);
      slackMessagesSent++;
    }
  }

  console.log(`[daily-alerts] Sent ${slackMessagesSent} Slack message(s)`);

  // 10. Send email to each consultant (Bruno CC'd on all)
  const BRUNO_EMAIL = 'biglesias@thinkpaladar.com';
  let emailsSent = 0;
  for (const [groupId, group] of Object.entries(groups)) {
    if (groupId === '__unassigned__') continue;
    if (!group.wantsEmail || !group.consultant.email) continue;
    // Email only includes: orders, reviews, delivery time (no ads/promos)
    const filtered = filterCriticalAnomalies(group);
    const groupTotal = filtered.orders.length + filtered.reviews.length + filtered.deliveryTime.length;
    if (groupTotal === 0) continue;

    // Group all anomalies by company name for card-based email
    const companyMap = new Map<string, { metrics: AlertCompanyData['metrics']; maxDeviation: number }>();

    for (const a of filtered.orders) {
      const key = `${a.company_name} \u2014 ${formatChannel(a.channel)}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Pedidos',
        value: `${a.yesterday_orders} (media: ${a.avg_orders_baseline}) \u2192 ${a.orders_deviation_pct}%`,
        threshold: '-25%',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.orders_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of filtered.reviews) {
      const key = `${a.company_name} \u2014 ${formatChannel(a.channel)}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Resenas',
        value: `Rating: ${a.yesterday_avg_rating} (media: ${a.baseline_avg_rating}) | ${a.yesterday_negative_count} negativas`,
        threshold: '4.0',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.rating_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of filtered.deliveryTime) {
      const key = `${a.company_name} \u2014 ${formatChannel(a.channel)}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      const baseline = a.baseline_avg_delivery_min != null ? ` (media: ${a.baseline_avg_delivery_min} min)` : '';
      entry.metrics.push({
        label: 'Delivery Time',
        value: `${a.yesterday_avg_delivery_min} min${baseline} | ${a.yesterday_orders_with_time} pedidos`,
        threshold: '40 min',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, a.yesterday_avg_delivery_min);
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
      getYesterdayLong(),
      emailCompanies
    );

    // CC Bruno on all consultant emails (skip if this IS Bruno)
    const cc = group.consultant.email !== BRUNO_EMAIL ? BRUNO_EMAIL : undefined;
    const sent = await sendEmail({
      to: group.consultant.email,
      cc,
      subject: `\u26A0\uFE0F TP Hub: alertas de ${group.consultant.name.split(' ')[0]} (${getYesterdayShort()})`,
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
    delivery_time_anomalies: deliveryTimeAnomalies.length,
    slack_messages_sent: slackMessagesSent,
    consultants_notified: Object.keys(groups).length,
    emails_sent: emailsSent,
    preferences_loaded: prefsMap.size,
  });
}
