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

interface DeliveryTimeAnomaly {
  company_id: string;
  company_name: string;
  key_account_manager: string | null;
  store_name: string;
  address_name: string;
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
    body: JSON.stringify({
      text: message,
      username: 'TPHub Alertas',
      icon_url: 'https://hub.thinkpaladar.com/images/logo/logo.png',
    }),
  });
  if (!response.ok) {
    console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Extract city name from address string.
 * Examples:
 *   "Carrer de Jaume I, 7, 08002 Barcelona, España" → "Barcelona"
 *   "Calle Gran Via, 42, 28013 Madrid, Spain" → "Madrid"
 *   "Av. Diagonal, 123, Barcelona" → "Barcelona"
 *   "Carrer de Mallorca 270" → "" (no city found)
 */
function extractCity(address: string): string {
  // Try: match city after 5-digit postal code
  const postalMatch = address.match(/\b\d{5}\s+([A-ZÀ-Ú][a-záéíóúñàèìòùü]+(?:\s+[a-záéíóúñàèìòùüA-ZÀ-Ú]+)*)/);
  if (postalMatch) return postalMatch[1].trim();

  // Known Spanish cities — match if present in the address
  const knownCities = [
    'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga', 'Málaga',
    'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Cordoba', 'Córdoba', 'Valladolid',
    'Vigo', 'Gijon', 'Gijón', 'Hospitalet', "L'Hospitalet", 'Vitoria', 'Granada',
    'Elche', 'Oviedo', 'Badalona', 'Terrassa', 'Cartagena', 'Sabadell', 'Jerez',
    'Mostoles', 'Móstoles', 'Alcalá', 'Pamplona', 'Fuenlabrada', 'Almería',
    'Leganés', 'Donostia', 'San Sebastián', 'Santander', 'Burgos', 'Castellón',
    'Alcorcón', 'Getafe', 'Las Palmas', 'Logroño', 'Badajoz', 'Salamanca',
    'Huelva', 'Lleida', 'Tarragona', 'León', 'Cádiz', 'Jaén', 'Ourense',
    'Marbella', 'Torrejón', 'Reus', 'Girona', 'Lugo', 'Cáceres', 'Lorca',
    'Pontevedra', 'Toledo', 'Torrevieja',
  ];
  const addrLower = address.toLowerCase();
  for (const city of knownCities) {
    if (addrLower.includes(city.toLowerCase())) return city;
  }

  // Fallback: last comma-separated segment before "España"/"Spain"
  const parts = address.split(',').map((s) => s.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].replace(/\b(España|Spain)\b/gi, '').trim();
    // Must look like a city name (starts with uppercase, no pure numbers, no street prefixes)
    if (part && /^[A-ZÀ-Ú]/.test(part) && !/^\d+$/.test(part) && part.length > 2
      && !/^(Calle|Carrer|Av\.|Avda|C\/|Pza|Plaza|Paseo|Ronda|Camino)/i.test(part)) {
      return part;
    }
  }
  return '';
}

type AnyAnomaly = OrderAnomaly | ReviewAnomaly | AdsAnomaly | PromoAnomaly | DeliveryTimeAnomaly;

/** Apply strict filters — only keep critical anomalies for Slack */
function filterCriticalAnomalies(group: ConsultantGroup): ConsultantGroup {
  return {
    ...group,
    orders: group.orders.filter((a) => a.orders_deviation_pct <= -25),
    reviews: group.reviews.filter(
      (a) => a.yesterday_avg_rating < 4.0 || a.yesterday_negative_count >= 3,
    ),
    ads: group.ads.filter(
      (a) => a.yesterday_roas < 2.0 || (a.yesterday_ad_spent > 0 && a.yesterday_ad_orders === 0),
    ),
    promos: group.promos.filter((a) => (a.promo_rate_deviation_pct ?? 0) >= 30),
    deliveryTime: group.deliveryTime, // already filtered at RPC level (>40 min)
  };
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
  deliveryTimeAnomalies: DeliveryTimeAnomaly[],
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
        deliveryTime: [],
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
        deliveryTime: [],
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

  // Group delivery time anomalies
  for (const anomaly of deliveryTimeAnomalies) {
    const consultants = companyToConsultants.get(anomaly.company_id);
    if (consultants && consultants.length > 0) {
      for (const c of consultants) {
        getOrCreateGroup(c, anomaly.company_id).deliveryTime.push(anomaly);
      }
    } else {
      getUnassignedGroup().deliveryTime.push(anomaly);
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
    const existingDeliveryKeys = new Set(group.deliveryTime.map((a) => `${a.company_id}:${a.store_name}:${a.channel}`));

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
    for (const a of deliveryTimeAnomalies) {
      const key = `${a.company_id}:${a.store_name}:${a.channel}`;
      if (!existingDeliveryKeys.has(key)) { group.deliveryTime.push(a); existingDeliveryKeys.add(key); }
    }
  }

  return groups;
}

/** Build a Slack message for a single consultant, grouped by client (company+store+channel) */
function buildConsultantMessage(group: ConsultantGroup): string {
  const filtered = filterCriticalAnomalies(group);
  const allAnomalies: { key: string; city: string; anomaly: AnyAnomaly; type: string }[] = [];

  for (const a of filtered.orders) {
    const key = `${a.company_name}|${a.store_name}|${a.channel}`;
    allAnomalies.push({ key, city: extractCity(a.address_name), anomaly: a, type: 'orders' });
  }
  for (const a of filtered.reviews) {
    const key = `${a.company_name}|${a.store_name}|${a.channel}`;
    allAnomalies.push({ key, city: extractCity(a.address_name), anomaly: a, type: 'reviews' });
  }
  for (const a of filtered.ads) {
    const key = `${a.company_name}|${a.store_name}|${a.channel}`;
    allAnomalies.push({ key, city: extractCity(a.address_name), anomaly: a, type: 'ads' });
  }
  for (const a of filtered.promos) {
    const key = `${a.company_name}|${a.store_name}|${a.channel}`;
    allAnomalies.push({ key, city: extractCity(a.address_name), anomaly: a, type: 'promos' });
  }
  for (const a of filtered.deliveryTime) {
    const key = `${a.company_name}|${a.store_name}|${a.channel}`;
    allAnomalies.push({ key, city: extractCity(a.address_name), anomaly: a, type: 'deliveryTime' });
  }

  if (allAnomalies.length === 0) return '';

  // Group by client key
  const byClient = new Map<string, typeof allAnomalies>();
  for (const item of allAnomalies) {
    const existing = byClient.get(item.key) ?? [];
    existing.push(item);
    byClient.set(item.key, existing);
  }

  const mention = group.consultant.slackUserId
    ? `<@${group.consultant.slackUserId}>`
    : `*${group.consultant.name}*`;

  const lines: string[] = [
    `:bell: *Alertas — ${getYesterdayLabel()}*\n`,
    mention,
    '',
  ];

  for (const [clientKey, items] of byClient) {
    const [companyName, storeName, channel] = clientKey.split('|');
    const city = items[0].city;
    const locationParts = [storeName, city, channel].filter(Boolean);
    lines.push(`*${companyName}* · ${locationParts.join(' · ')}`);

    for (const { anomaly, type } of items) {
      if (type === 'orders') {
        const a = anomaly as OrderAnomaly;
        lines.push(`  :chart_with_downwards_trend: Pedidos: ${a.yesterday_orders} (media ${Math.round(a.avg_orders_baseline)}) → *${a.orders_deviation_pct}%*`);
      } else if (type === 'reviews') {
        const a = anomaly as ReviewAnomaly;
        lines.push(`  :star: Rating: ${a.yesterday_avg_rating} vs ${a.baseline_avg_rating} · ${a.yesterday_negative_count} negativas`);
      } else if (type === 'ads') {
        const a = anomaly as AdsAnomaly;
        const extra = a.yesterday_ad_orders === 0 && a.yesterday_clicks > 0
          ? ` · ${a.yesterday_clicks} clics sin conversion`
          : '';
        lines.push(`  :loudspeaker: ROAS: ${a.yesterday_roas}x vs ${a.baseline_avg_roas}x · Gasto ${a.yesterday_ad_spent}\u20AC${extra}`);
      } else if (type === 'promos') {
        const a = anomaly as PromoAnomaly;
        lines.push(`  :ticket: Promos: ${a.yesterday_promo_rate}% de ventas (media ${a.baseline_avg_promo_rate}%) → *+${a.promo_rate_deviation_pct}%*`);
      } else if (type === 'deliveryTime') {
        const a = anomaly as DeliveryTimeAnomaly;
        const baseline = a.baseline_avg_delivery_min != null ? ` (media ${a.baseline_avg_delivery_min} min)` : '';
        lines.push(`  :stopwatch: Delivery: *${a.yesterday_avg_delivery_min} min*${baseline} · ${a.yesterday_orders_with_time} pedidos`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
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

  // 4. Call 5 RPCs in parallel
  const threshold = Number(process.env.ALERT_THRESHOLD ?? -20);
  console.log(`[daily-alerts] Calling RPCs with threshold=${threshold}`);

  const [ordersResult, reviewsResult, adsResult, promosResult, deliveryResult] = await Promise.all([
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
    supabase.rpc('get_daily_delivery_time_anomalies', {
      p_max_minutes: 40,
      p_min_orders: 5,
    }),
  ]);

  // 5. Check for errors — deduplicate by error message
  const errorEntries = [
    ordersResult.error && { label: 'Orders', msg: ordersResult.error.message },
    reviewsResult.error && { label: 'Reviews', msg: reviewsResult.error.message },
    adsResult.error && { label: 'Ads', msg: adsResult.error.message },
    promosResult.error && { label: 'Promos', msg: promosResult.error.message },
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
    await sendSlack(`:warning: Errores en alertas diarias:\n${deduped.join('\n')}`);
    if (errorEntries.length === 5) {
      return res.status(500).json({ error: 'Failed to fetch anomaly data' });
    }
  }

  const orderAnomalies: OrderAnomaly[] = ordersResult.data ?? [];
  const reviewAnomalies: ReviewAnomaly[] = reviewsResult.data ?? [];
  const adsAnomalies: AdsAnomaly[] = adsResult.data ?? [];
  const promoAnomalies: PromoAnomaly[] = promosResult.data ?? [];
  const deliveryTimeAnomalies: DeliveryTimeAnomaly[] = deliveryResult.data ?? [];
  const totalAnomalies = orderAnomalies.length + reviewAnomalies.length + adsAnomalies.length + promoAnomalies.length + deliveryTimeAnomalies.length;

  console.log(
    `[daily-alerts] Found anomalies: orders=${orderAnomalies.length}, reviews=${reviewAnomalies.length}, ads=${adsAnomalies.length}, promos=${promoAnomalies.length}, delivery=${deliveryTimeAnomalies.length}`,
  );

  // 6. No anomalies → send "all ok"
  if (totalAnomalies === 0) {
    await sendSlack(
      `:large_green_circle: *Alertas — ${getYesterdayLabel()}*\nTodos los restaurantes dentro de rango normal ayer.`,
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
    deliveryTimeAnomalies,
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
    const criticalCount = filtered.orders.length + filtered.reviews.length + filtered.ads.length + filtered.promos.length + filtered.deliveryTime.length;
    if (criticalCount === 0) continue;

    const message = buildConsultantMessage(group);
    if (message) {
      await sendSlack(message);
      slackMessagesSent++;
    }
  }

  console.log(`[daily-alerts] Sent ${slackMessagesSent} Slack message(s)`);

  // 10. Send email to consultants who have email_enabled
  let emailsSent = 0;
  for (const group of Object.values(groups)) {
    if (!group.wantsEmail || !group.consultant.email) continue;
    const groupTotal = group.orders.length + group.reviews.length + group.ads.length + group.promos.length + group.deliveryTime.length;
    if (groupTotal === 0) continue;

    // Group all anomalies by company name for card-based email
    const companyMap = new Map<string, { metrics: AlertCompanyData['metrics']; maxDeviation: number }>();

    for (const a of group.orders) {
      const key = `${a.company_name} \u2014 ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Pedidos',
        value: `${a.yesterday_orders} (media: ${a.avg_orders_baseline}) \u2192 ${a.orders_deviation_pct}%`,
        threshold: '-25%',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.orders_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.reviews) {
      const key = `${a.company_name} \u2014 ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Resenas',
        value: `Rating: ${a.yesterday_avg_rating} (media: ${a.baseline_avg_rating}) | ${a.yesterday_negative_count} negativas`,
        threshold: '4.0',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.rating_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.promos) {
      const key = `${a.company_name} \u2014 ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Promos',
        value: `${a.yesterday_promos}\u20AC (${a.yesterday_promo_rate}% de ventas) \u2192 +${a.promo_spend_deviation_pct}%`,
        threshold: '30%',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.promo_spend_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.ads) {
      const key = `${a.company_name} \u2014 ${a.store_name}`;
      const entry = companyMap.get(key) ?? { metrics: [], maxDeviation: 0 };
      entry.metrics.push({
        label: 'Publicidad',
        value: `ROAS: ${a.yesterday_roas}x (media: ${a.baseline_avg_roas}x) | Gasto: ${a.yesterday_ad_spent}\u20AC`,
        threshold: '2.0x',
      });
      entry.maxDeviation = Math.max(entry.maxDeviation, Math.abs(a.roas_deviation_pct));
      companyMap.set(key, entry);
    }

    for (const a of group.deliveryTime) {
      const key = `${a.company_name} \u2014 ${a.store_name}`;
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
      getYesterdayLabel(),
      emailCompanies
    );

    const sent = await sendEmail({
      to: group.consultant.email,
      subject: `Alertas diarias \u2014 ${getYesterdayLabel()}`,
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
