/**
 * useActualRevenueByMonth - Fetches real revenue from CRP Portal
 * broken down by channel and month for the GridChannelMonth component.
 *
 * Uses fetchCrpOrdersAggregated to get revenue per month.
 * Includes past closed months AND the current month (up to yesterday).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchCrpOrdersAggregated } from '@/services/crp-portal';
import type { GridChannelMonthData } from '@/types';

interface UseActualRevenueParams {
  /** CRP company ID (required) */
  companyId: string | null;
  /** CRP brand IDs (optional - for filtering by brand) */
  brandIds?: string[];
  /** CRP address IDs (optional - for filtering by address/restaurant) */
  addressIds?: string[];
  /** Number of past months to fetch (default: 6). Current month is always included. */
  monthsCount?: number;
}

interface ActualRevenueResult {
  /** Revenue by month×channel in GridChannelMonthData format (includes current month) */
  revenueByMonth: GridChannelMonthData;
  /** Total revenue of the last complete (closed) month (for baseline) */
  lastMonthRevenue: number;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * Gets the start/end dates for a given month offset from today.
 * offset=0 = current month (end = yesterday), offset=-1 = last month, etc.
 */
function getMonthRange(offset: number): { start: string; end: string; key: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);

  const year = d.getFullYear();
  const month = d.getMonth();

  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  let end: string;
  if (offset === 0) {
    // Current month: end = yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    end = yesterday.toISOString().split('T')[0];
  } else {
    // Past months: end = last day of the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const key = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start, end, key };
}

export function useActualRevenueByMonth({
  companyId,
  brandIds,
  addressIds,
  monthsCount = 6,
}: UseActualRevenueParams): ActualRevenueResult {
  const enabled = !!companyId;

  const { data, isLoading } = useQuery({
    queryKey: ['actual-revenue-by-month', companyId, brandIds, addressIds, monthsCount],
    queryFn: async () => {
      if (!companyId) return null;

      const companyIds = [parseInt(companyId, 10)].filter((n) => !isNaN(n));
      const numericBrandIds = brandIds?.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
      const numericAddressIds = addressIds?.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));

      // Past months + current month (offset 0)
      const pastMonths = Array.from({ length: monthsCount }, (_, i) => getMonthRange(-(monthsCount - i)));
      const currentMonth = getMonthRange(0);
      const allMonths = [...pastMonths, currentMonth];

      const results = await Promise.all(
        allMonths.map((m) =>
          fetchCrpOrdersAggregated({
            companyIds,
            brandIds: numericBrandIds?.length ? numericBrandIds : undefined,
            addressIds: numericAddressIds?.length ? numericAddressIds : undefined,
            startDate: m.start,
            endDate: m.end,
          }).then((agg) => ({ key: m.key, agg }))
        )
      );

      // Build GridChannelMonthData
      const revenueByMonth: GridChannelMonthData = {};
      for (const { key, agg } of results) {
        revenueByMonth[key] = {
          glovo: Math.round(agg.byChannel.glovo.revenue),
          ubereats: Math.round(agg.byChannel.ubereats.revenue),
          justeat: Math.round(agg.byChannel.justeat.revenue),
        };
      }

      // Last complete (closed) month revenue (offset -1)
      const lastMonth = getMonthRange(-1);
      const lastMonthData = results.find((r) => r.key === lastMonth.key);
      const lastMonthRevenue = lastMonthData ? Math.round(lastMonthData.agg.totalRevenue) : 0;

      return { revenueByMonth, lastMonthRevenue };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    revenueByMonth: data?.revenueByMonth ?? {},
    lastMonthRevenue: data?.lastMonthRevenue ?? 0,
    isLoading: enabled && isLoading,
  };
}
