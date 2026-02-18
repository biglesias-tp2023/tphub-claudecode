/**
 * useWeeklyRevenue Hook
 *
 * Fetches revenue data for the last 6 complete weeks (Mon-Sun) for each
 * entity in the Controlling hierarchy table.
 *
 * Makes 6 parallel calls to fetchControllingMetricsRPC (one per week) and
 * aggregates revenue by hierarchy row ID to produce sparkline data.
 *
 * @module features/controlling/hooks/useWeeklyRevenue
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { fetchControllingMetricsRPC, PORTAL_IDS } from '@/services/crp-portal';
import type { ControllingMetricsRow } from '@/services/crp-portal';
import type { ChannelId } from '@/types';

// ============================================
// HELPERS
// ============================================

/**
 * Format a Date to YYYY-MM-DD string (local time).
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface WeekRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/**
 * Calculate 6 complete week ranges (Mon-Sun) going backwards from the
 * most recent completed week.
 *
 * Example (if today is Wed Feb 18, 2026):
 * - Week 8 (most recent complete): Feb 9-15
 * - Week 7: Feb 2-8
 * - ...
 * - Week 1 (oldest): Dec 22-28
 */
function getLast6Weeks(): WeekRange[] {
  const today = new Date();
  // Current day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const dow = today.getDay();
  // Days since last Monday (if today is Monday, we go back 7 to get the previous Monday)
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;

  // Most recent Monday (start of current incomplete week)
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: WeekRange[] = [];

  for (let i = 1; i <= 8; i++) {
    // Go back i weeks from current Monday
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    weeks.unshift({
      start: formatDate(weekStart),
      end: formatDate(weekEnd),
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

/**
 * Aggregate RPC metrics rows into:
 * - byRowId: hierarchy row ID → total revenue
 * - byChannel: channel ID → total revenue (for channel cards)
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

    // Company level
    addRow(`company-${companyId}`, revenue);

    // Brand/store level
    addRow(`brand::${companyId}::${storeId}`, revenue);

    // Address level
    addRow(`address::${companyId}::${addressId}`, revenue);

    // Channel/portal level
    addRow(`channel::${companyId}::${addressId}::${portalId}`, revenue);

    // Channel aggregate (for channel cards)
    const channelId = portalToChannel(portalId);
    if (channelId) {
      byChannel.set(channelId, (byChannel.get(channelId) || 0) + revenue);
    }
  }

  return { byRowId, byChannel };
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches weekly revenue for the last 6 complete weeks for sparkline display.
 *
 * @returns weeklyRevenue - Map<rowId, number[]> with 6 values per entity
 * @returns isLoading - Whether data is still loading
 */
export function useWeeklyRevenue() {
  const { companyIds } = useGlobalFiltersStore();

  // Stable week ranges (recalculated only when component mounts)
  const weeks = useMemo(() => getLast6Weeks(), []);

  interface WeeklyRevenueData {
    byRowId: Map<string, number[]>;
    byChannel: Map<ChannelId, number[]>;
  }

  const query = useQuery<WeeklyRevenueData>({
    queryKey: ['weekly-revenue', companyIds.sort().join(',')],
    queryFn: async () => {
      // Fetch all 8 weeks in parallel
      const weeklyResults = await Promise.all(
        weeks.map((week) =>
          fetchControllingMetricsRPC(companyIds, week.start, week.end)
        )
      );

      // Aggregate each week's data
      const weeklyAggs = weeklyResults.map(aggregateRevenueByRowId);

      // Build row-level map: rowId → [week1, ..., week8]
      const allRowIds = new Set<string>();
      for (const agg of weeklyAggs) {
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

      return { byRowId, byChannel };
    },
    enabled: companyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    weeklyRevenue: query.data?.byRowId || new Map<string, number[]>(),
    channelWeeklyRevenue: query.data?.byChannel || new Map<ChannelId, number[]>(),
    isLoading: query.isLoading,
  };
}
