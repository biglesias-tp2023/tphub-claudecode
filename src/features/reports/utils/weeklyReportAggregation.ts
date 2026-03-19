/**
 * Weekly Report Aggregation — client-side port of api/reports/weeklyAggregation.ts.
 * Transforms raw RPC metrics into report sections.
 *
 * @module features/reports/utils/weeklyReportAggregation
 */

import type { ControllingMetricsRow } from '@/services/crp-portal/orders';
import type { SalesProjectionData } from '@/types';
import type { LocationRow, LocationDetail, TopProduct, WeeklyReportData } from '../types';

// ============================================
// Types
// ============================================

export interface DimensionMaps {
  storeNames: Map<string, string>;
  addressNames: Map<string, string>;
}

// ============================================
// Helpers
// ============================================

const PORTAL_CHANNEL: Record<string, 'glovo' | 'ubereats'> = {
  'E22BC362': 'glovo',
  'E22BC362-2': 'glovo',
  '3CCD6861': 'ubereats',
};

function portalToChannel(portalId: string): 'glovo' | 'ubereats' | null {
  return PORTAL_CHANNEL[portalId] ?? null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function semaforo(evSemanalPct: number | null): 'green' | 'yellow' | 'red' {
  if (evSemanalPct == null) return 'green';
  if (evSemanalPct >= 0) return 'green';
  if (evSemanalPct >= -10) return 'yellow';
  return 'red';
}

/**
 * Compute on-track status based on month-to-date ventas vs expected pace.
 * Expected pace = objetivo * (dayOfMonth / daysInMonth).
 * green = ventas >= expectedPace * 0.9
 * yellow = ventas >= expectedPace * 0.7
 * red = below that
 */
function computeEstadoObjetivo(
  ventasMes: number,
  objetivo: number | null,
  weekEnd: string,
): 'green' | 'yellow' | 'red' | null {
  if (objetivo == null || objetivo <= 0) return null;

  const end = new Date(weekEnd + 'T00:00:00');
  const dayOfMonth = end.getDate();
  const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const expectedPace = objetivo * (dayOfMonth / daysInMonth);

  if (ventasMes >= expectedPace * 0.9) return 'green';
  if (ventasMes >= expectedPace * 0.7) return 'yellow';
  return 'red';
}

// ============================================
// Objectives lookup
// ============================================

/**
 * Build a lookup map from projections: "addressId|channelId" → monthly target.
 * Handles 3 scope levels with priority: address > brand > company.
 *
 * Lookup order at resolution time:
 *   1. addressId|channelId  (address-level projection)
 *   2. brand:brandId|channelId  (brand-level projection)
 *   3. __company__|channelId  (company-level projection)
 */
function buildObjectivesMap(
  projections: SalesProjectionData[],
  monthKey: string,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const proj of projections) {
    const monthTargets = proj.targetRevenue[monthKey];
    if (!monthTargets) continue;

    // Determine the key prefix based on projection scope
    let keyPrefix: string;
    if (proj.addressId) {
      keyPrefix = proj.addressId;             // address-level
    } else if (proj.brandId) {
      keyPrefix = `brand:${proj.brandId}`;    // brand-level
    } else {
      keyPrefix = '__company__';              // company-level
    }

    if (monthTargets.glovo > 0) {
      map.set(`${keyPrefix}|glovo`, monthTargets.glovo);
    }
    if (monthTargets.ubereats > 0) {
      map.set(`${keyPrefix}|ubereats`, monthTargets.ubereats);
    }
  }

  return map;
}

// ============================================
// Core aggregation
// ============================================

interface LocationAgg {
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  adSpent: number;
  adRevenue: number;
  deliveryTimeSum: number;
  deliveryTimeCount: number;
  storeId: string;
  addressId: string;
  channelId: 'glovo' | 'ubereats';
}

function aggregateByLocation(rows: ControllingMetricsRow[]): Map<string, LocationAgg> {
  const map = new Map<string, LocationAgg>();

  for (const row of rows) {
    const ch = portalToChannel(row.pfk_id_portal);
    if (!ch) continue;

    const key = `${row.pfk_id_store}|${row.pfk_id_store_address}|${ch}`;
    const existing = map.get(key);
    const dtSum = Number(row.avg_delivery_time || 0) * Number(row.delivery_time_count || 0);
    const dtCount = Number(row.delivery_time_count || 0);
    if (existing) {
      existing.ventas += Number(row.ventas);
      existing.pedidos += Number(row.pedidos);
      existing.nuevos += Number(row.nuevos);
      existing.descuentos += Number(row.descuentos);
      existing.adSpent += Number(row.ad_spent);
      existing.adRevenue += Number(row.ad_revenue);
      existing.deliveryTimeSum += dtSum;
      existing.deliveryTimeCount += dtCount;
    } else {
      map.set(key, {
        ventas: Number(row.ventas),
        pedidos: Number(row.pedidos),
        nuevos: Number(row.nuevos),
        descuentos: Number(row.descuentos),
        adSpent: Number(row.ad_spent),
        adRevenue: Number(row.ad_revenue),
        deliveryTimeSum: dtSum,
        deliveryTimeCount: dtCount,
        storeId: row.pfk_id_store,
        addressId: row.pfk_id_store_address,
        channelId: ch,
      });
    }
  }
  return map;
}

// ============================================
// Email subject
// ============================================

function buildEmailSubject(companyName: string, weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekEnd + 'T00:00:00');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Detect if this is a full month (starts on 1st, ends on last day)
  const isMonthly = start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

  if (isMonthly) {
    return `Informe Mensual | ${companyName} | ${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  // ISO week number
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

  const sDay = start.getDate();
  const sMonth = months[start.getMonth()];
  const eDay = end.getDate();
  const eMonth = months[end.getMonth()];

  const dateRange = start.getMonth() === end.getMonth()
    ? `${sDay} - ${eDay} ${sMonth}`
    : `${sDay} ${sMonth} - ${eDay} ${eMonth}`;

  return `Informe Semanal | ${companyName} | Semana ${weekNum} (${dateRange})`;
}

// ============================================
// Public API
// ============================================

export function aggregateWeeklyReport(
  companyId: string,
  companyName: string,
  weekLabel: string,
  weekStart: string,
  weekEnd: string,
  thisWeekRows: ControllingMetricsRow[],
  prevWeekRows: ControllingMetricsRow[],
  monthRows: ControllingMetricsRow[],
  dims: DimensionMaps,
  projections: SalesProjectionData[],
  /** Map: "addressId|channelId" → top 5 products */
  productsMap: Map<string, TopProduct[]>,
): WeeklyReportData {
  // Month key for objectives (use the month of weekEnd)
  const endDate = new Date(weekEnd + 'T00:00:00');
  const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
  const objectivesMap = buildObjectivesMap(projections, monthKey);

  const thisWeekMap = aggregateByLocation(thisWeekRows);
  const prevWeekMap = aggregateByLocation(prevWeekRows);
  const monthMap = aggregateByLocation(monthRows);

  const allLocations: LocationRow[] = [];
  let glovoVentas = 0, glovoPrev = 0;
  let uberVentas = 0, uberPrev = 0;

  // Collect all keys from both thisWeek and month (some locations may only have month data)
  const allKeys = new Set([...thisWeekMap.keys(), ...monthMap.keys()]);

  for (const key of allKeys) {
    const curr = thisWeekMap.get(key);
    const prev = prevWeekMap.get(key);
    const month = monthMap.get(key);

    // Skip if no data at all for this week (only month data, no current week)
    if (!curr && !month) continue;

    // Use curr for this week's metrics, fallback to zero
    const weekVentas = curr?.ventas ?? 0;
    const monthVentas = month?.ventas ?? 0;

    const storeId = curr?.storeId ?? month!.storeId;
    const addressId = curr?.addressId ?? month!.addressId;
    const channelId = curr?.channelId ?? month!.channelId;

    const evSemanalPct = (prev && curr) ? pctChange(curr.ventas, prev.ventas) : null;

    const storeName = dims.storeNames.get(storeId) ?? storeId;
    const addressName = dims.addressNames.get(addressId) ?? addressId;

    const adSpent = curr?.adSpent ?? 0;
    const adRevenue = curr?.adRevenue ?? 0;
    const descuentos = curr?.descuentos ?? 0;

    const roasAds = adSpent > 0 ? Math.round((adRevenue / adSpent) * 100) / 100 : null;
    const roasPromo = descuentos > 0 ? Math.round((weekVentas / descuentos) * 100) / 100 : null;

    // Look up objective: address → brand → company (most specific wins)
    const objetivo = objectivesMap.get(`${addressId}|${channelId}`)
      ?? objectivesMap.get(`brand:${storeId}|${channelId}`)
      ?? objectivesMap.get(`__company__|${channelId}`)
      ?? null;

    // Consecución mensual = ventasMes / objetivo * 100
    const consecucionMesPct = (objetivo != null && objetivo > 0)
      ? Math.round((monthVentas / objetivo) * 1000) / 10
      : null;

    const loc: LocationRow = {
      storeName,
      addressName,
      channelId,
      ventas: weekVentas,
      pedidos: curr?.pedidos ?? 0,
      nuevos: curr?.nuevos ?? 0,
      recurrentes: (curr?.pedidos ?? 0) - (curr?.nuevos ?? 0),
      descuentos,
      adSpent,
      adRevenue,
      roasAds,
      roasPromo,
      evSemanalPct,
      ventasMes: monthVentas,
      consecucionMesPct,
      objetivoMes: objetivo,
      estadoObjetivo: computeEstadoObjetivo(monthVentas, objetivo, weekEnd),
      semaforo: semaforo(evSemanalPct),
      _rawAddressId: addressId,
    };

    // Only include locations that had activity this week
    if (weekVentas <= 0) continue;

    allLocations.push(loc);

    if (channelId === 'glovo') {
      glovoVentas += weekVentas;
      glovoPrev += prev?.ventas ?? 0;
    } else {
      uberVentas += weekVentas;
      uberPrev += prev?.ventas ?? 0;
    }
  }

  allLocations.sort((a, b) => b.ventas - a.ventas);

  // Build detailed breakdown grouped by store+address
  const detailGroups = new Map<string, LocationDetail>();
  for (const loc of allLocations) {
    const groupKey = `${loc.storeName}|${loc.addressName}`;
    if (!detailGroups.has(groupKey)) {
      detailGroups.set(groupKey, {
        storeName: loc.storeName,
        addressName: loc.addressName,
        channels: [],
      });
    }
    const prodKey = `${loc._rawAddressId}|${loc.channelId}`;
    const topProducts = productsMap.get(prodKey) ?? [];
    // Delivery time from this week's aggregation
    const locKey = [...thisWeekMap.entries()].find(([, v]) => v.addressId === loc._rawAddressId && v.channelId === loc.channelId)?.[1];
    const avgDT = (locKey?.deliveryTimeCount ?? 0) > 0
      ? Math.round(locKey!.deliveryTimeSum / locKey!.deliveryTimeCount * 10) / 10
      : null;

    detailGroups.get(groupKey)!.channels.push({
      channelId: loc.channelId,
      ventas: loc.ventas,
      pedidos: loc.pedidos,
      nuevos: loc.nuevos,
      recurrentes: loc.recurrentes,
      evSemanalPct: loc.evSemanalPct,
      ventasMes: loc.ventasMes,
      consecucionMesPct: loc.consecucionMesPct,
      adSpent: loc.adSpent,
      adRevenue: loc.adRevenue,
      roasAds: loc.roasAds,
      roasPromo: loc.roasPromo,
      descuentos: loc.descuentos,
      objetivoMes: loc.objetivoMes,
      estadoObjetivo: loc.estadoObjetivo,
      semaforo: loc.semaforo,
      avgDeliveryTime: avgDT,
      topProducts,
    });
  }

  const totalVentas = glovoVentas + uberVentas;
  const totalPrev = glovoPrev + uberPrev;

  // Company-level monthly objective: sum from per-location objectives (bottom-up),
  // fallback to company-level projection if no per-location objectives exist.
  const objetivoTotal = (() => {
    // Sum per-location objectives already resolved above
    const locSum = allLocations.reduce((sum, l) => sum + (l.objetivoMes ?? 0), 0);
    if (locSum > 0) return locSum;
    // Fallback: company-level projection
    const companyProj = projections.find((p) => !p.brandId && !p.addressId);
    const monthTargets = companyProj?.targetRevenue[monthKey];
    return monthTargets
      ? (monthTargets.glovo || 0) + (monthTargets.ubereats || 0) + (monthTargets.justeat || 0)
      : null;
  })();
  const ventasMesTotal = allLocations.reduce((sum, l) => sum + l.ventasMes, 0);
  const consecucionTotalPct = (objetivoTotal != null && objetivoTotal > 0)
    ? Math.round((ventasMesTotal / objetivoTotal) * 1000) / 10
    : null;

  return {
    companyId,
    companyName,
    weekLabel,
    emailSubject: buildEmailSubject(companyName, weekStart, weekEnd),
    monthKey,
    totalVentas,
    evSemanalPct: pctChange(totalVentas, totalPrev) ?? 0,
    glovoVentas,
    glovoEvPct: pctChange(glovoVentas, glovoPrev) ?? 0,
    uberVentas,
    uberEvPct: pctChange(uberVentas, uberPrev) ?? 0,
    objetivoTotal: objetivoTotal && objetivoTotal > 0 ? objetivoTotal : null,
    ventasMesTotal,
    consecucionTotalPct,
    alerts: allLocations.filter((l) => l.evSemanalPct != null && l.evSemanalPct <= -15),
    highlights: allLocations.filter((l) => l.evSemanalPct != null && l.evSemanalPct >= 10),
    investments: allLocations.filter((l) => l.adSpent > 0),
    allLocations,
    locationDetails: Array.from(detailGroups.values()),
  };
}
