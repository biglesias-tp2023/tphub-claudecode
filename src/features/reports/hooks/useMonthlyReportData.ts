/**
 * React Query hook for fetching monthly report data.
 *
 * @module features/reports/hooks/useMonthlyReportData
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchControllingMetricsRPC } from '@/services/crp-portal/orders';
import { fetchAllDimensions } from '@/services/crp-portal/hierarchyBuilder';
import { fetchSalesProjectionsByCompanyIds, fetchAllChildProjections } from '@/services/data/sales-projections';
import { fetchProductSales } from '@/services/crp-portal/productSales';
import { aggregateMonthlyReport } from '../utils/monthlyReportAggregation';
import type { DimensionMaps } from '../utils/weeklyReportAggregation';
import type { MonthlyReportData, TopProduct } from '../types';

interface UseMonthlyReportParams {
  companyId: string;
  companyName: string;
  monthStart: string; // YYYY-MM-DD (first day)
  monthEnd: string;   // YYYY-MM-DD (last day)
  enabled: boolean;
}

function getPrevMonthRange(monthStart: string): { start: string; end: string } {
  const d = new Date(monthStart + 'T00:00:00');
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function useMonthlyReportData({
  companyId,
  companyName,
  monthStart,
  monthEnd,
  enabled,
}: UseMonthlyReportParams) {
  const monthKey = monthStart.slice(0, 7); // "YYYY-MM"

  return useQuery<MonthlyReportData>({
    queryKey: queryKeys.reports.monthly(companyId, monthKey),
    queryFn: async () => {
      const prevMonth = getPrevMonthRange(monthStart);
      const ids = [companyId];

      const [thisMonthRows, prevMonthRows, allDims, companyProjections, childProjections] = await Promise.all([
        fetchControllingMetricsRPC(ids, monthStart, monthEnd),
        fetchControllingMetricsRPC(ids, prevMonth.start, prevMonth.end),
        fetchAllDimensions(ids),
        fetchSalesProjectionsByCompanyIds(ids),
        fetchAllChildProjections(companyId),
      ]);

      const projections = [...companyProjections, ...childProjections];

      // Fetch top 10 products aggregated (no address filter)
      let topProducts: TopProduct[] = [];
      try {
        const products = await fetchProductSales({
          companyIds: ids,
          startDate: monthStart,
          endDate: monthEnd,
          limit: 10,
        });
        topProducts = products.slice(0, 10).map((p) => ({
          name: p.productName,
          quantity: p.totalQuantity,
          revenue: p.totalRevenue,
          isPromo: p.promoOrderRatio >= 0.75,
        }));
      } catch (err) {
        console.error('[monthly-report] Failed to fetch top products:', err);
      }

      // Map IDs to names
      const storeNames = new Map<string, string>();
      for (const s of allDims.stores) {
        for (const id of s.allIds) storeNames.set(id, s.name);
      }
      const addressNames = new Map<string, string>();
      for (const a of allDims.addresses) {
        for (const id of a.allIds) addressNames.set(id, a.name);
      }
      const dims: DimensionMaps = { storeNames, addressNames };

      return aggregateMonthlyReport(
        companyId,
        companyName,
        monthKey,
        monthStart,
        monthEnd,
        thisMonthRows,
        prevMonthRows,
        dims,
        projections,
        topProducts,
      );
    },
    enabled: enabled && !!companyId && !!monthStart,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}
