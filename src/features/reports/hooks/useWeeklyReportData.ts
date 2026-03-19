/**
 * React Query hook for fetching weekly report data.
 * Fetches 3 RPC periods + dimensions + sales projections + top products in parallel.
 *
 * @module features/reports/hooks/useWeeklyReportData
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchControllingMetricsRPC } from '@/services/crp-portal/orders';
import { fetchAllDimensions } from '@/services/crp-portal/hierarchyBuilder';
import { fetchSalesProjectionsByCompanyIds, fetchAllChildProjections } from '@/services/data/sales-projections';
import { fetchProductSales } from '@/services/crp-portal/productSales';
import { PORTAL_IDS } from '@/services/crp-portal/types';
import { aggregateWeeklyReport } from '../utils/weeklyReportAggregation';
import type { DimensionMaps } from '../utils/weeklyReportAggregation';
import type { WeeklyReportData, TopProduct } from '../types';

interface UseWeeklyReportParams {
  companyId: string;
  companyName: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  enabled: boolean;
}

function getPrevWeekDates(weekStart: string): { start: string; end: string } {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  const start = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 6);
  const end = d.toISOString().slice(0, 10);
  return { start, end };
}

function getMonthToDateRange(weekEnd: string): { start: string; end: string } {
  const end = weekEnd;
  const d = new Date(weekEnd + 'T00:00:00');
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end };
}

function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekEnd + 'T00:00:00');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const weekNum = getISOWeekNumber(weekStart);

  const sDay = start.getDate();
  const eDay = end.getDate();

  if (start.getMonth() === end.getMonth()) {
    return `Semana ${weekNum} (${sDay} a ${eDay} de ${months[start.getMonth()]})`;
  }
  return `Semana ${weekNum} (${sDay} de ${months[start.getMonth()]} a ${eDay} de ${months[end.getMonth()]})`;
}

const CHANNEL_TO_PORTAL: Record<string, string> = {
  glovo: PORTAL_IDS.GLOVO,
  ubereats: PORTAL_IDS.UBEREATS,
};

/**
 * Fetch top 5 products per address+channel combo.
 * Collects unique combos from thisWeek metrics, then fetches in parallel.
 */
async function fetchTopProductsMap(
  companyId: string,
  thisWeekRows: { pfk_id_store_address: string; pfk_id_portal: string }[],
  weekStart: string,
  weekEnd: string,
): Promise<Map<string, TopProduct[]>> {
  const PORTAL_CHANNEL: Record<string, string> = {
    'E22BC362': 'glovo',
    'E22BC362-2': 'glovo',
    '3CCD6861': 'ubereats',
  };

  // Collect unique address+channel combos
  const combos = new Map<string, { addressId: string; channelId: string; portalId: string }>();
  for (const row of thisWeekRows) {
    const ch = PORTAL_CHANNEL[row.pfk_id_portal];
    if (!ch) continue;
    const key = `${row.pfk_id_store_address}|${ch}`;
    if (!combos.has(key)) {
      combos.set(key, {
        addressId: row.pfk_id_store_address,
        channelId: ch,
        portalId: CHANNEL_TO_PORTAL[ch],
      });
    }
  }

  if (combos.size === 0) return new Map();

  // Fetch top 5 products per combo in parallel
  const entries = Array.from(combos.entries());
  const results = await Promise.all(
    entries.map(async ([key, combo]) => {
      try {
        const products = await fetchProductSales({
          companyIds: [companyId],
          addressIds: [combo.addressId],
          portalIds: [combo.portalId],
          startDate: weekStart,
          endDate: weekEnd,
          limit: 5,
        });
        if (products.length === 0) {
          console.warn(
            `[reports] No products for ${key} (company=${companyId}, address=${combo.addressId}, portal=${combo.portalId})`,
          );
        }
        const top5: TopProduct[] = products.slice(0, 5).map((p) => ({
          name: p.productName,
          quantity: p.totalQuantity,
          revenue: p.totalRevenue,
          isPromo: p.promoOrderRatio >= 0.75,
        }));
        return [key, top5] as [string, TopProduct[]];
      } catch (err) {
        console.error(`[reports] Failed to fetch products for ${key}:`, err);
        return [key, [] as TopProduct[]] as [string, TopProduct[]];
      }
    }),
  );

  return new Map<string, TopProduct[]>(results);
}

export function useWeeklyReportData({
  companyId,
  companyName,
  weekStart,
  weekEnd,
  enabled,
}: UseWeeklyReportParams) {
  return useQuery<WeeklyReportData>({
    queryKey: queryKeys.reports.weekly(companyId, weekStart),
    queryFn: async () => {
      const prevWeek = getPrevWeekDates(weekStart);
      const monthRange = getMonthToDateRange(weekEnd);
      const ids = [companyId];

      const [thisWeekRows, prevWeekRows, monthRows, allDims, companyProjections, childProjections] = await Promise.all([
        fetchControllingMetricsRPC(ids, weekStart, weekEnd),
        fetchControllingMetricsRPC(ids, prevWeek.start, prevWeek.end),
        fetchControllingMetricsRPC(ids, monthRange.start, monthRange.end),
        fetchAllDimensions(ids),
        fetchSalesProjectionsByCompanyIds(ids),
        fetchAllChildProjections(companyId),
      ]);
      // Combine company-level + all child projections (brand + address level)
      const projections = [...companyProjections, ...childProjections];

      // Fetch top products (after we have thisWeekRows to know which combos to query)
      const productsMap = await fetchTopProductsMap(companyId, thisWeekRows, weekStart, weekEnd);

      // Map ALL IDs (not just primary) to names
      const storeNames = new Map<string, string>();
      for (const s of allDims.stores) {
        for (const id of s.allIds) {
          storeNames.set(id, s.name);
        }
      }
      const addressNames = new Map<string, string>();
      for (const a of allDims.addresses) {
        for (const id of a.allIds) {
          addressNames.set(id, a.name);
        }
      }
      const dims: DimensionMaps = { storeNames, addressNames };

      return aggregateWeeklyReport(
        companyId,
        companyName,
        formatWeekLabel(weekStart, weekEnd),
        weekStart,
        weekEnd,
        thisWeekRows,
        prevWeekRows,
        monthRows,
        dims,
        projections,
        productsMap,
      );
    },
    enabled: enabled && !!companyId && !!weekStart,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}
