/**
 * useDetailSegments Hook
 *
 * Lazy-loads customer segments for a specific hierarchy row when the
 * detail panel opens. Uses 8 sequential calls to the single-week RPC
 * (get_customer_segments) which is reliable and avoids the batch RPC
 * row-limit issues.
 *
 * @module features/controlling/hooks/useDetailSegments
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchWeeklyCustomerSegments } from '@/services/crp-portal';
import type { CustomerSegmentRow } from '@/services/crp-portal';
import { QUERY_STALE_MEDIUM, QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { getLastNWeeks } from '@/utils/dateUtils';
import type { WeekSegmentData } from './useWeeklyRevenue';

const SPARKLINE_WEEKS = 8;

function emptySegments() {
  return { newCustomers: 0, occasionalCustomers: 0, frequentCustomers: 0 };
}

/**
 * Aggregate customer segment rows into a map by hierarchy row ID.
 */
function aggregateSegmentsByRowId(rows: CustomerSegmentRow[]) {
  const byRowId = new Map<string, { newCustomers: number; occasionalCustomers: number; frequentCustomers: number }>();

  const getOrCreate = (key: string) => {
    let s = byRowId.get(key);
    if (!s) {
      s = emptySegments();
      byRowId.set(key, s);
    }
    return s;
  };

  for (const row of rows) {
    const companyId = row.pfk_id_company;
    const storeId = row.pfk_id_store;
    const addressId = row.pfk_id_store_address;
    const portalId = row.pfk_id_portal;

    const add = (s: ReturnType<typeof emptySegments>) => {
      s.newCustomers += row.new_customers || 0;
      s.occasionalCustomers += row.occasional_customers || 0;
      s.frequentCustomers += row.frequent_customers || 0;
    };

    add(getOrCreate(`company-${companyId}`));
    add(getOrCreate(`brand::${companyId}::${storeId}`));
    add(getOrCreate(`address::${companyId}::${addressId}`));
    add(getOrCreate(`channel::${companyId}::${addressId}::${portalId}`));
  }

  return byRowId;
}

/**
 * Fetches customer segments on-demand for a specific row when the detail panel opens.
 *
 * Uses 8 sequential calls to the single-week RPC to avoid batch RPC issues.
 *
 * @param rowId - The hierarchy row ID to fetch segments for (null = disabled)
 * @returns segments - WeekSegmentData[] for 8 weeks, or null if not ready
 * @returns isLoading - Whether segments are still loading
 */
/**
 * Extract the company ID from a hierarchy row ID.
 * Row formats: company-{id}, brand::{companyId}::..., address::{companyId}::..., channel::{companyId}::...
 */
function extractCompanyId(rowId: string): string | null {
  if (rowId.startsWith('company-')) return rowId.replace('company-', '');
  const parts = rowId.split('::');
  return parts.length >= 2 ? parts[1] : null;
}

export function useDetailSegments(rowIds: string[]) {
  const weeks = useMemo(() => getLastNWeeks(SPARKLINE_WEEKS), []);

  // Only query the single company for the clicked row (not all 80)
  const targetCompanyId = rowIds.length > 0 ? extractCompanyId(rowIds[0]) : null;

  // Stable query key: sort IDs to avoid cache misses from ordering
  const sortedIds = useMemo(() => [...rowIds].sort(), [rowIds]);

  const query = useQuery<WeekSegmentData[]>({
    queryKey: ['detail-segments', sortedIds, targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId || rowIds.length === 0) return [];

      // Fetch 8 weeks sequentially, only for the target company
      const weekResults: CustomerSegmentRow[][] = [];
      for (const week of weeks) {
        const rows = await fetchWeeklyCustomerSegments(
          [targetCompanyId],
          week.start,
          week.end,
        );
        weekResults.push(rows);
      }

      // Aggregate each week and sum segments across all provided rowIds
      return weeks.map((w, i) => {
        const weekAgg = aggregateSegmentsByRowId(weekResults[i] ?? []);
        const totals = emptySegments();
        for (const rid of rowIds) {
          const s = weekAgg.get(rid);
          if (s) {
            totals.newCustomers += s.newCustomers;
            totals.occasionalCustomers += s.occasionalCustomers;
            totals.frequentCustomers += s.frequentCustomers;
          }
        }
        return { weekLabel: w.label, ...totals };
      });
    },
    enabled: rowIds.length > 0 && !!targetCompanyId,
    staleTime: QUERY_STALE_MEDIUM,
    gcTime: QUERY_GC_MEDIUM,
  });

  return {
    segments: query.data ?? null,
    isLoading: query.isLoading,
  };
}
