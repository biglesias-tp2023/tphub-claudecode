/**
 * useActualRevenueByMonth - Fetches real revenue from CRP Portal
 * broken down by channel and month for the GridChannelMonth component.
 *
 * Uses the lightweight `get_monthly_revenue_by_channel` RPC that returns
 * all months×channels in ONE call (instead of 6 separate heavy RPCs).
 */
import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { fetchMonthlyRevenueByChannel } from '@/services/crp-portal';
import type { GridChannelMonthData } from '@/types';
import type { ChannelId } from '@/types';

interface UseActualRevenueParams {
  /** CRP company ID (single, for backward compat) */
  companyId?: string | null;
  /** CRP company IDs (array, preferred) */
  companyIds?: string[];
  /** CRP brand IDs (optional - for filtering by brand) */
  brandIds?: string[];
  /** CRP address IDs (optional - for filtering by address/restaurant) */
  addressIds?: string[];
  /** Number of past months to fetch (default: 6). Current month is always included. */
  monthsCount?: number;
  /** Explicit month offsets from today (e.g. [-2,-1,0,1,2,3]). Overrides monthsCount. */
  monthOffsets?: number[];
}

interface ActualRevenueResult {
  /** Revenue by month×channel in GridChannelMonthData format (includes current month) */
  revenueByMonth: GridChannelMonthData;
  /** Promos (discounts) by month×channel in GridChannelMonthData format */
  promosByMonth: GridChannelMonthData;
  /** Ads (ad spend) by month×channel in GridChannelMonthData format */
  adsByMonth: GridChannelMonthData;
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
    // Current month: end = yesterday (use local date, not UTC)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    end = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  } else {
    // Past/future months: end = last day of the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const key = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start, end, key };
}

export function useActualRevenueByMonth({
  companyId,
  companyIds: companyIdsProp,
  brandIds,
  addressIds,
  monthsCount = 6,
  monthOffsets,
}: UseActualRevenueParams): ActualRevenueResult {
  // Support both single companyId and array companyIds
  const resolvedCompanyIds = companyIdsProp?.length
    ? companyIdsProp
    : companyId
      ? [companyId]
      : [];

  const { data, isLoading } = useQuery({
    queryKey: ['actual-revenue-by-month', resolvedCompanyIds, brandIds, addressIds, monthOffsets ?? monthsCount],
    queryFn: async () => {
      // Use explicit offsets if provided, otherwise past months + current month
      const allMonths = monthOffsets
        ? monthOffsets.map((o) => getMonthRange(o))
        : [...Array.from({ length: monthsCount }, (_, i) => getMonthRange(-(monthsCount - i))), getMonthRange(0)];

      // Full date range for the single RPC call
      const startDate = allMonths[0].start;
      const endDate = allMonths[allMonths.length - 1].end;

      // ONE call instead of 6 — the RPC groups by month+channel server-side
      const rows = await fetchMonthlyRevenueByChannel({
        companyIds: resolvedCompanyIds.length > 0 ? resolvedCompanyIds : undefined,
        brandIds: brandIds?.length ? brandIds : undefined,
        addressIds: addressIds?.length ? addressIds : undefined,
        startDate,
        endDate,
      });

      // Initialize all months with zero values
      const revenueByMonth: GridChannelMonthData = {};
      const promosByMonth: GridChannelMonthData = {};
      const adsByMonth: GridChannelMonthData = {};
      for (const m of allMonths) {
        revenueByMonth[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
        promosByMonth[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
        adsByMonth[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
      }

      // Fill from RPC results (~12 rows: 6 months × 2 channels)
      for (const row of rows) {
        const monthKey = row.month_key;
        const channel = row.channel as ChannelId;

        // Only process known months and channels
        if (!revenueByMonth[monthKey]) continue;
        if (channel !== 'glovo' && channel !== 'ubereats' && channel !== 'justeat') continue;

        revenueByMonth[monthKey][channel] = Math.round(Number(row.total_revenue) || 0);
        promosByMonth[monthKey][channel] = Math.round(Math.abs(Number(row.total_discounts) || 0));
        adsByMonth[monthKey][channel] = Math.round(Number(row.total_ad_spent) || 0);
      }

      // Last complete (closed) month revenue (offset -1)
      const lastMonth = getMonthRange(-1);
      const lm = revenueByMonth[lastMonth.key];
      const lastMonthRevenue = lm ? lm.glovo + lm.ubereats + lm.justeat : 0;

      return { revenueByMonth, promosByMonth, adsByMonth, lastMonthRevenue };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: QUERY_GC_MEDIUM,
  });

  return {
    revenueByMonth: data?.revenueByMonth ?? {},
    promosByMonth: data?.promosByMonth ?? {},
    adsByMonth: data?.adsByMonth ?? {},
    lastMonthRevenue: data?.lastMonthRevenue ?? 0,
    isLoading,
  };
}
