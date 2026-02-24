/**
 * useWeeklyRevenue Hook
 *
 * Fetches revenue data for the last 8 complete weeks (Mon-Sun) for each
 * entity in the Controlling hierarchy table.
 *
 * Makes 8 parallel calls to fetchControllingMetricsRPC (one per week) and
 * aggregates revenue by hierarchy row ID to produce sparkline data.
 *
 * Also aggregates ALL metrics per row for the detail panel charts.
 *
 * @module features/controlling/hooks/useWeeklyRevenue
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCompanyIds } from '@/stores/filtersStore';
import { fetchControllingMetricsRPC, PORTAL_IDS } from '@/services/crp-portal';
import type { ControllingMetricsRow } from '@/services/crp-portal';
import type { ChannelId } from '@/types';
import { formatDate } from '@/utils/dateUtils';

interface WeekRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string; // Short label like "S1", "S2"...
}

/** Full metrics for a single week, for a given row ID */
export interface WeekMetrics {
  weekLabel: string;
  weekStart: string;
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  promotedOrders: number;
  adSpent: number;
  adRevenue: number;
  impressions: number;
  clicks: number;
  adOrders: number;
  // Per-channel breakdown
  ventasGlovo: number;
  ventasUbereats: number;
  pedidosGlovo: number;
  pedidosUbereats: number;
}

/**
 * Calculate 8 complete week ranges (Mon-Sun) going backwards from the
 * most recent completed week.
 */
function getLast8Weeks(): WeekRange[] {
  const today = new Date();
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;

  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: WeekRange[] = [];

  for (let i = 1; i <= 8; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.unshift({
      start: formatDate(weekStart),
      end: formatDate(weekEnd),
      label: `S${9 - i}`,
    });
  }

  return weeks;
}

/**
 * Maps a portal ID to a channel ID.
 */
function portalToChannel(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO || portalId === PORTAL_IDS.GLOVO_NEW) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  return null;
}

interface AggregatedWeek {
  byRowId: Map<string, number>;
  byChannel: Map<ChannelId, number>;
}

/** Full metrics aggregation for a single week */
interface AggregatedWeekMetrics {
  byRowId: Map<string, Omit<WeekMetrics, 'weekLabel' | 'weekStart'>>;
}

/**
 * Aggregate RPC metrics rows into revenue-only maps (for sparklines).
 */
function aggregateRevenueByRowId(rows: ControllingMetricsRow[]): AggregatedWeek {
  const byRowId = new Map<string, number>();
  const byChannel = new Map<ChannelId, number>();

  const addRow = (key: string, amount: number) => {
    byRowId.set(key, (byRowId.get(key) || 0) + amount);
  };

  for (const row of rows) {
    const revenue = row.ventas || 0;
    const companyId = row.pfk_id_company;
    const storeId = row.pfk_id_store;
    const addressId = row.pfk_id_store_address;
    const portalId = row.pfk_id_portal;

    addRow(`company-${companyId}`, revenue);
    addRow(`brand::${companyId}::${storeId}`, revenue);
    addRow(`address::${companyId}::${addressId}`, revenue);
    addRow(`channel::${companyId}::${addressId}::${portalId}`, revenue);

    const channelId = portalToChannel(portalId);
    if (channelId) {
      byChannel.set(channelId, (byChannel.get(channelId) || 0) + revenue);
    }
  }

  return { byRowId, byChannel };
}

/** Empty WeekMetrics (without label/start) */
function emptyMetrics(): Omit<WeekMetrics, 'weekLabel' | 'weekStart'> {
  return {
    ventas: 0, pedidos: 0, nuevos: 0, descuentos: 0,
    promotedOrders: 0, adSpent: 0, adRevenue: 0,
    impressions: 0, clicks: 0, adOrders: 0,
    ventasGlovo: 0, ventasUbereats: 0,
    pedidosGlovo: 0, pedidosUbereats: 0,
  };
}

/**
 * Aggregate ALL metrics from RPC rows into a map by row ID.
 */
function aggregateAllMetricsByRowId(rows: ControllingMetricsRow[]): AggregatedWeekMetrics {
  const byRowId = new Map<string, Omit<WeekMetrics, 'weekLabel' | 'weekStart'>>();

  const getOrCreate = (key: string) => {
    let m = byRowId.get(key);
    if (!m) {
      m = emptyMetrics();
      byRowId.set(key, m);
    }
    return m;
  };

  const addToMetrics = (m: Omit<WeekMetrics, 'weekLabel' | 'weekStart'>, row: ControllingMetricsRow, channelId: ChannelId | null) => {
    m.ventas += row.ventas || 0;
    m.pedidos += row.pedidos || 0;
    m.nuevos += row.nuevos || 0;
    m.descuentos += row.descuentos || 0;
    m.promotedOrders += row.promoted_orders || 0;
    m.adSpent += row.ad_spent || 0;
    m.adRevenue += row.ad_revenue || 0;
    m.impressions += row.impressions || 0;
    m.clicks += row.clicks || 0;
    m.adOrders += row.ad_orders || 0;
    if (channelId === 'glovo') {
      m.ventasGlovo += row.ventas || 0;
      m.pedidosGlovo += row.pedidos || 0;
    } else if (channelId === 'ubereats') {
      m.ventasUbereats += row.ventas || 0;
      m.pedidosUbereats += row.pedidos || 0;
    }
  };

  for (const row of rows) {
    const companyId = row.pfk_id_company;
    const storeId = row.pfk_id_store;
    const addressId = row.pfk_id_store_address;
    const portalId = row.pfk_id_portal;
    const channelId = portalToChannel(portalId);

    addToMetrics(getOrCreate(`company-${companyId}`), row, channelId);
    addToMetrics(getOrCreate(`brand::${companyId}::${storeId}`), row, channelId);
    addToMetrics(getOrCreate(`address::${companyId}::${addressId}`), row, channelId);
    addToMetrics(getOrCreate(`channel::${companyId}::${addressId}::${portalId}`), row, channelId);
  }

  return { byRowId };
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches weekly revenue for the last 8 complete weeks for sparkline display
 * and full metrics for the detail panel.
 *
 * @returns weeklyRevenue - Map<rowId, number[]> with 8 values per entity
 * @returns weeklyMetrics - Map<rowId, WeekMetrics[]> with 8 full metric snapshots per entity
 * @returns weekLabels - string[] with week labels (S1..S8)
 * @returns isLoading - Whether data is still loading
 */
export function useWeeklyRevenue() {
  const companyIds = useCompanyIds();

  const weeks = useMemo(() => getLast8Weeks(), []);

  interface WeeklyRevenueData {
    byRowId: Map<string, number[]>;
    byChannel: Map<ChannelId, number[]>;
    metricsByRowId: Map<string, WeekMetrics[]>;
  }

  const query = useQuery<WeeklyRevenueData>({
    queryKey: ['weekly-revenue', [...companyIds].sort().join(',')],
    queryFn: async () => {
      // Fetch all 8 weeks in parallel
      const weeklyResults = await Promise.all(
        weeks.map((week) =>
          fetchControllingMetricsRPC(companyIds, week.start, week.end)
        )
      );

      // Aggregate each week's data (revenue-only for sparklines)
      const weeklyAggs = weeklyResults.map(aggregateRevenueByRowId);

      // Aggregate each week's FULL metrics (for detail panel)
      const weeklyMetricsAggs = weeklyResults.map(aggregateAllMetricsByRowId);

      // Build row-level map: rowId → [week1, ..., week8] (revenue only)
      const allRowIds = new Set<string>();
      for (const agg of weeklyAggs) {
        for (const key of agg.byRowId.keys()) {
          allRowIds.add(key);
        }
      }
      for (const agg of weeklyMetricsAggs) {
        for (const key of agg.byRowId.keys()) {
          allRowIds.add(key);
        }
      }

      const byRowId = new Map<string, number[]>();
      for (const rowId of allRowIds) {
        byRowId.set(
          rowId,
          weeklyAggs.map((agg) => agg.byRowId.get(rowId) || 0)
        );
      }

      // Build channel-level map: channelId → [week1, ..., week8]
      const channelIds: ChannelId[] = ['glovo', 'ubereats', 'justeat'];
      const byChannel = new Map<ChannelId, number[]>();
      for (const ch of channelIds) {
        byChannel.set(
          ch,
          weeklyAggs.map((agg) => agg.byChannel.get(ch) || 0)
        );
      }

      // Build full metrics map: rowId → WeekMetrics[]
      const metricsByRowId = new Map<string, WeekMetrics[]>();
      for (const rowId of allRowIds) {
        metricsByRowId.set(
          rowId,
          weeklyMetricsAggs.map((agg, i) => {
            const m = agg.byRowId.get(rowId) || emptyMetrics();
            return {
              ...m,
              weekLabel: weeks[i].label,
              weekStart: weeks[i].start,
            };
          })
        );
      }

      return { byRowId, byChannel, metricsByRowId };
    },
    enabled: companyIds.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const emptyRowMap = useMemo(() => new Map<string, number[]>(), []);
  const emptyChannelMap = useMemo(() => new Map<ChannelId, number[]>(), []);
  const emptyMetricsMap = useMemo(() => new Map<string, WeekMetrics[]>(), []);

  return {
    weeklyRevenue: query.data?.byRowId || emptyRowMap,
    channelWeeklyRevenue: query.data?.byChannel || emptyChannelMap,
    weeklyMetrics: query.data?.metricsByRowId || emptyMetricsMap,
    weekLabels: weeks.map((w) => w.label),
    isLoading: query.isLoading,
  };
}
