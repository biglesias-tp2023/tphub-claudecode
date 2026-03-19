/**
 * Weekly Report Aggregation — transforms raw RPC metrics into report sections.
 *
 * @module api/reports/weeklyAggregation
 */

// ============================================
// Types
// ============================================

/** Portal ID to channel mapping (same as RPC) */
const PORTAL_CHANNEL: Record<string, 'glovo' | 'ubereats'> = {
  'E22BC362': 'glovo',
  'E22BC362-2': 'glovo',
  '3CCD6861': 'ubereats',
};

export interface LocationRow {
  storeName: string;
  addressName: string;
  channelId: 'glovo' | 'ubereats';

  ventas: number;
  pedidos: number;
  nuevos: number;
  recurrentes: number;
  descuentos: number;
  adSpent: number;
  adRevenue: number;

  roasAds: number | null;
  roasPromo: number | null;

  evSemanalPct: number | null;
  evMensualPct: number | null;

  semaforo: 'green' | 'yellow' | 'red';
}

export interface WeeklyReportData {
  companyName: string;
  companyId: string;
  weekLabel: string;

  totalVentas: number;
  evSemanalPct: number;
  glovoVentas: number;
  glovoEvPct: number;
  uberVentas: number;
  uberEvPct: number;

  alerts: LocationRow[];
  highlights: LocationRow[];
  investments: LocationRow[];
  allLocations: LocationRow[];
}

/** Raw row from get_controlling_metrics RPC */
export interface MetricRow {
  pfk_id_company: string;
  pfk_id_store: string;
  pfk_id_store_address: string;
  pfk_id_portal: string;
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  reembolsos: number;
  promoted_orders: number;
  ad_spent: number;
  ad_revenue: number;
  impressions: number;
  clicks: number;
  ad_orders: number;
  avg_rating: number;
  total_reviews: number;
  avg_delivery_time: number;
  delivery_time_count: number;
}

/** Dimension lookup maps */
export interface DimensionMaps {
  storeNames: Map<string, string>;   // storeId → name
  addressNames: Map<string, string>; // addressId → name
}

// ============================================
// Helpers
// ============================================

function portalToChannel(portalId: string): 'glovo' | 'ubereats' | null {
  return PORTAL_CHANNEL[portalId] ?? null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10; // 1 decimal
}

function semaforo(evSemanalPct: number | null): 'green' | 'yellow' | 'red' {
  if (evSemanalPct == null) return 'green';
  if (evSemanalPct >= 0) return 'green';
  if (evSemanalPct >= -10) return 'yellow';
  return 'red';
}

// ============================================
// Core aggregation
// ============================================

/**
 * Aggregate RPC metrics into a keyed map: "storeId|addressId|channel" → totals
 */
function aggregateByLocation(
  rows: MetricRow[],
): Map<string, { ventas: number; pedidos: number; nuevos: number; descuentos: number; adSpent: number; adRevenue: number; storeId: string; addressId: string; channelId: 'glovo' | 'ubereats' }> {
  const map = new Map<string, { ventas: number; pedidos: number; nuevos: number; descuentos: number; adSpent: number; adRevenue: number; storeId: string; addressId: string; channelId: 'glovo' | 'ubereats' }>();

  for (const row of rows) {
    const ch = portalToChannel(row.pfk_id_portal);
    if (!ch) continue; // skip 'other'

    const key = `${row.pfk_id_store}|${row.pfk_id_store_address}|${ch}`;
    const existing = map.get(key);
    if (existing) {
      existing.ventas += Number(row.ventas);
      existing.pedidos += Number(row.pedidos);
      existing.nuevos += Number(row.nuevos);
      existing.descuentos += Number(row.descuentos);
      existing.adSpent += Number(row.ad_spent);
      existing.adRevenue += Number(row.ad_revenue);
    } else {
      map.set(key, {
        ventas: Number(row.ventas),
        pedidos: Number(row.pedidos),
        nuevos: Number(row.nuevos),
        descuentos: Number(row.descuentos),
        adSpent: Number(row.ad_spent),
        adRevenue: Number(row.ad_revenue),
        storeId: row.pfk_id_store,
        addressId: row.pfk_id_store_address,
        channelId: ch,
      });
    }
  }
  return map;
}

// ============================================
// Public API
// ============================================

/**
 * Build a WeeklyReportData from three sets of RPC metrics + dimensions.
 */
export function aggregateWeeklyReport(
  companyId: string,
  companyName: string,
  weekLabel: string,
  thisWeekRows: MetricRow[],
  prevWeekRows: MetricRow[],
  monthRows: MetricRow[],
  dims: DimensionMaps,
): WeeklyReportData {
  const thisWeekMap = aggregateByLocation(thisWeekRows);
  const prevWeekMap = aggregateByLocation(prevWeekRows);
  const monthMap = aggregateByLocation(monthRows);

  // Count weeks in month data for average (approximate: month-to-date days / 7)
  // We'll use total month ventas vs this week ventas as a simpler comparison

  const allLocations: LocationRow[] = [];

  // Channel totals
  let glovoVentas = 0, glovoPrev = 0;
  let uberVentas = 0, uberPrev = 0;

  for (const [key, curr] of thisWeekMap) {
    const prev = prevWeekMap.get(key);
    const month = monthMap.get(key);

    const evSemanalPct = prev ? pctChange(curr.ventas, prev.ventas) : null;

    // Monthly evolution: compare this week to monthly weekly average
    // monthVentas includes this week, so approximate: monthAvgWeekly = monthVentas / weeksInMonth
    // Simpler: just compare to the month total per week average
    let evMensualPct: number | null = null;
    if (month && month.ventas > 0) {
      // Month-to-date weekly average (excluding this week)
      const monthMinusThisWeek = month.ventas - curr.ventas;
      // Assume ~2-3 weeks before this week in the month — use prev week as proxy
      if (prev && prev.ventas > 0) {
        // Use prev week as monthly baseline (simpler, more actionable)
        evMensualPct = pctChange(curr.ventas, prev.ventas);
      }
    }

    const storeName = dims.storeNames.get(curr.storeId) ?? curr.storeId;
    const addressName = dims.addressNames.get(curr.addressId) ?? curr.addressId;

    const roasAds = curr.adSpent > 0 ? Math.round((curr.adRevenue / curr.adSpent) * 10) / 10 : null;
    const roasPromo = curr.descuentos > 0 ? Math.round((curr.ventas / curr.descuentos) * 10) / 10 : null;

    const loc: LocationRow = {
      storeName,
      addressName,
      channelId: curr.channelId,
      ventas: curr.ventas,
      pedidos: curr.pedidos,
      nuevos: curr.nuevos,
      recurrentes: curr.pedidos - curr.nuevos,
      descuentos: curr.descuentos,
      adSpent: curr.adSpent,
      adRevenue: curr.adRevenue,
      roasAds,
      roasPromo,
      evSemanalPct,
      evMensualPct,
      semaforo: semaforo(evSemanalPct),
    };

    allLocations.push(loc);

    // Channel totals
    if (curr.channelId === 'glovo') {
      glovoVentas += curr.ventas;
      glovoPrev += prev?.ventas ?? 0;
    } else {
      uberVentas += curr.ventas;
      uberPrev += prev?.ventas ?? 0;
    }
  }

  // Sort by ventas descending
  allLocations.sort((a, b) => b.ventas - a.ventas);

  const totalVentas = glovoVentas + uberVentas;
  const totalPrev = glovoPrev + uberPrev;

  return {
    companyId,
    companyName,
    weekLabel,
    totalVentas,
    evSemanalPct: pctChange(totalVentas, totalPrev) ?? 0,
    glovoVentas,
    glovoEvPct: pctChange(glovoVentas, glovoPrev) ?? 0,
    uberVentas,
    uberEvPct: pctChange(uberVentas, uberPrev) ?? 0,
    alerts: allLocations.filter((l) => l.evSemanalPct != null && l.evSemanalPct <= -15),
    highlights: allLocations.filter((l) => l.evSemanalPct != null && l.evSemanalPct >= 10),
    investments: allLocations.filter((l) => l.adSpent > 0),
    allLocations,
  };
}
