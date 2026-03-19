/**
 * Monthly Report Aggregation — transforms RPC metrics into MonthlyReportData.
 *
 * @module features/reports/utils/monthlyReportAggregation
 */

import type { ControllingMetricsRow } from '@/services/crp-portal/orders';
import type { SalesProjectionData } from '@/types';
import type {
  MonthlyReportData,
  MonthlyChannelBreakdown,
  MonthlyLocationRevenue,
  MonthlyROIRow,
  MonthlyOpsRow,
  MonthlyChannelTarget,
  TopProduct,
} from '../types';

import type { DimensionMaps } from './weeklyReportAggregation';

// ============================================
// Helpers
// ============================================

function portalToChannel(portalId: string): 'glovo' | 'ubereats' | null {
  if (portalId.startsWith('E22BC362')) return 'glovo';
  if (portalId === '3CCD6861') return 'ubereats';
  return null;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev <= 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

interface LocationAgg {
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  adSpent: number;
  adRevenue: number;
  deliveryTimeSum: number;
  deliveryTimeCount: number;
  avgRating: number;
  ratingCount: number;
  totalReviews: number;
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
    const dtSum = Number(row.avg_delivery_time || 0) * Number(row.delivery_time_count || 0);
    const dtCount = Number(row.delivery_time_count || 0);
    const rating = Number(row.avg_rating || 0);
    const reviews = Number(row.total_reviews || 0);

    const existing = map.get(key);
    if (existing) {
      existing.ventas += Number(row.ventas);
      existing.pedidos += Number(row.pedidos);
      existing.nuevos += Number(row.nuevos);
      existing.descuentos += Number(row.descuentos);
      existing.adSpent += Number(row.ad_spent);
      existing.adRevenue += Number(row.ad_revenue);
      existing.deliveryTimeSum += dtSum;
      existing.deliveryTimeCount += dtCount;
      // Weighted average for rating
      const prevTotal = existing.ratingCount;
      existing.ratingCount += reviews;
      if (existing.ratingCount > 0) {
        existing.avgRating = (existing.avgRating * prevTotal + rating * reviews) / existing.ratingCount;
      }
      existing.totalReviews += reviews;
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
        avgRating: rating,
        ratingCount: reviews,
        totalReviews: reviews,
        storeId: row.pfk_id_store,
        addressId: row.pfk_id_store_address,
        channelId: ch,
      });
    }
  }
  return map;
}

// ============================================
// Objectives lookup
// ============================================

function buildObjectivesMap(
  projections: SalesProjectionData[],
  monthKey: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of projections) {
    const monthTargets = p.targetRevenue[monthKey];
    if (!monthTargets) continue;
    for (const [ch, amount] of Object.entries(monthTargets)) {
      if (amount <= 0) continue;
      if (p.addressId) {
        map.set(`${p.addressId}|${ch}`, amount);
      } else if (p.brandId) {
        map.set(`brand:${p.brandId}|${ch}`, amount);
      } else {
        map.set(`__company__|${ch}`, amount);
      }
    }
  }
  return map;
}

// ============================================
// Main aggregation
// ============================================

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function aggregateMonthlyReport(
  companyId: string,
  companyName: string,
  monthKey: string,
  _monthStart: string,
  _monthEnd: string,
  thisMonthRows: ControllingMetricsRow[],
  prevMonthRows: ControllingMetricsRow[],
  dims: DimensionMaps,
  projections: SalesProjectionData[],
  topProducts: TopProduct[],
): MonthlyReportData {
  const thisMonthMap = aggregateByLocation(thisMonthRows);
  const prevMonthMap = aggregateByLocation(prevMonthRows);
  const objectivesMap = buildObjectivesMap(projections, monthKey);

  const [, m] = monthKey.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const year = monthKey.split('-')[0];
  const monthLabel = `${MONTH_NAMES[monthIdx]} ${year}`;

  // Group by channel
  const byChannel = new Map<'glovo' | 'ubereats', { locs: MonthlyLocationRevenue[]; total: number; prevTotal: number }>();

  const roiPromos: MonthlyROIRow[] = [];
  const roiAds: MonthlyROIRow[] = [];
  const operations: MonthlyOpsRow[] = [];

  let totalRevenue = 0;
  let totalPedidos = 0;
  let totalPrevRevenue = 0;

  for (const [key, curr] of thisMonthMap) {
    const prev = prevMonthMap.get(key);
    const storeName = dims.storeNames.get(curr.storeId) ?? curr.storeId;
    const addressName = dims.addressNames.get(curr.addressId) ?? curr.addressId;
    const prevRevenue = prev?.ventas ?? 0;

    totalRevenue += curr.ventas;
    totalPedidos += curr.pedidos;
    totalPrevRevenue += prevRevenue;

    // Revenue by channel
    if (!byChannel.has(curr.channelId)) {
      byChannel.set(curr.channelId, { locs: [], total: 0, prevTotal: 0 });
    }
    const chGroup = byChannel.get(curr.channelId)!;
    chGroup.total += curr.ventas;
    chGroup.prevTotal += prevRevenue;
    chGroup.locs.push({
      storeName,
      addressName,
      revenue: curr.ventas,
      prevMonthRevenue: prevRevenue,
      momChangePct: pctChange(curr.ventas, prevRevenue),
      pctOfTotal: 0, // computed after
    });

    // ROI Promos
    if (curr.descuentos > 0) {
      roiPromos.push({
        storeName,
        addressName,
        channelId: curr.channelId,
        investment: curr.descuentos,
        revenue: curr.ventas,
        roas: Math.round((curr.ventas / curr.descuentos) * 100) / 100,
      });
    }

    // ROI Ads
    if (curr.adSpent > 0) {
      roiAds.push({
        storeName,
        addressName,
        channelId: curr.channelId,
        investment: curr.adSpent,
        revenue: curr.adRevenue,
        roas: Math.round((curr.adRevenue / curr.adSpent) * 100) / 100,
      });
    }

    // Operations
    const avgDT = curr.deliveryTimeCount > 0
      ? Math.round(curr.deliveryTimeSum / curr.deliveryTimeCount * 10) / 10
      : null;
    operations.push({
      storeName,
      addressName,
      channelId: curr.channelId,
      avgDeliveryTime: avgDT,
      avgRating: curr.totalReviews > 0 ? Math.round(curr.avgRating * 100) / 100 : null,
      totalReviews: curr.totalReviews,
      pedidos: curr.pedidos,
      ticketMedio: curr.pedidos > 0 ? Math.round(curr.ventas / curr.pedidos) : null,
    });
  }

  // Compute % of channel total
  const revenueByChannel: MonthlyChannelBreakdown[] = [];
  for (const [channelId, group] of byChannel) {
    for (const loc of group.locs) {
      loc.pctOfTotal = group.total > 0 ? Math.round((loc.revenue / group.total) * 1000) / 10 : 0;
    }
    group.locs.sort((a, b) => b.revenue - a.revenue);
    revenueByChannel.push({
      channelId,
      totalRevenue: group.total,
      prevTotalRevenue: group.prevTotal,
      momChangePct: pctChange(group.total, group.prevTotal),
      locations: group.locs,
    });
  }
  revenueByChannel.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Sort ROI by ROAS desc
  roiPromos.sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));
  roiAds.sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));

  // Sort operations by ventas desc
  operations.sort((a, b) => (b.pedidos) - (a.pedidos));

  // Channel targets
  const channelTargets: MonthlyChannelTarget[] = [];
  for (const ch of ['glovo', 'ubereats'] as const) {
    const chRevenue = byChannel.get(ch)?.total ?? 0;
    if (chRevenue <= 0) continue;
    // Sum all objectives for this channel across all locations
    let target = 0;
    let hasTarget = false;
    for (const [k, v] of objectivesMap) {
      if (k.endsWith(`|${ch}`)) {
        target += v;
        hasTarget = true;
      }
    }
    channelTargets.push({
      channelId: ch,
      target: hasTarget ? target : null,
      actual: chRevenue,
      achievementPct: hasTarget && target > 0 ? Math.round((chRevenue / target) * 1000) / 10 : null,
    });
  }

  // Total target
  const totalTarget = channelTargets.reduce((sum, ct) => sum + (ct.target ?? 0), 0) || null;
  const targetAchievementPct = totalTarget && totalTarget > 0
    ? Math.round((totalRevenue / totalTarget) * 1000) / 10
    : null;

  // Email subject
  const prevMonth = MONTH_NAMES[monthIdx];
  const emailSubject = `Informe Mensual ${prevMonth} ${year} — ${companyName}`;

  return {
    companyId,
    companyName,
    monthLabel,
    monthKey,
    emailSubject,
    totalRevenue,
    totalPedidos,
    momChangePct: pctChange(totalRevenue, totalPrevRevenue),
    totalTarget,
    targetAchievementPct,
    channelTargets,
    revenueByChannel,
    roiPromos,
    roiAds,
    operations,
    topProducts,
  };
}
