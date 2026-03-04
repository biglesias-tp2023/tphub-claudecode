/**
 * usePnLData — React Query hook for the Finance P&L dashboard.
 *
 * Orchestrates:
 * 1. Order data by period (RPC get_pnl_periods)
 * 2. Ad spend timeseries (daily) → re-aggregated by period client-side
 * 3. Company commission rates (from cached companies)
 * 4. Configurable food cost %
 *
 * @module features/finance/hooks/usePnLData
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns';
import { es } from 'date-fns/locale';

import { useCompanyIds, useBrandIds, useDateFilters } from '@/stores/filtersStore';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/hooks/useBrands';
import { useRestaurants } from '@/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from '@/hooks/idExpansion';
import { useCompaniesById } from '@/features/clients/hooks/useCompanies';
import { fetchPnLPeriods } from '@/services/crp-portal';
import { fetchAdsTimeseries } from '@/services/crp-portal';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { formatDate } from '@/utils/dateUtils';

import type {
  PnLGranularity,
  PnLChannelTab,
  PnLData,
  PnLPeriodData,
  PnLCellData,
} from '../types';

// ============================================
// HELPERS
// ============================================

/** Truncate a date string to period start based on granularity */
function dateToPeriodKey(dateStr: string, granularity: PnLGranularity): string {
  const d = new Date(dateStr);
  switch (granularity) {
    case 'week':
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(d), 'yyyy-MM-dd');
    case 'quarter':
      return format(startOfQuarter(d), 'yyyy-MM-dd');
  }
}

/** Human-readable label for a period */
function periodLabel(periodStart: string, granularity: PnLGranularity): string {
  const d = new Date(periodStart);
  switch (granularity) {
    case 'week': {
      const day = d.getDate();
      const month = format(d, 'MMM', { locale: es });
      return `${day} ${month}`;
    }
    case 'month':
      return format(d, 'MMM yy', { locale: es });
    case 'quarter': {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `Q${q} ${d.getFullYear().toString().slice(-2)}`;
    }
  }
}

/** Compute % change between current and previous values */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ============================================
// HOOK
// ============================================

interface UsePnLDataParams {
  granularity: PnLGranularity;
  channelTab: PnLChannelTab;
  foodCostPct: number;
}

export function usePnLData({ granularity, channelTab, foodCostPct }: UsePnLDataParams) {
  // 1. Read from stores
  // NOTE: We intentionally do NOT read channelIds from the store here.
  // The Finance page hides the channel selector and uses its own channelTab control.
  // Reading stale channelIds from the store (set on other pages like Controlling)
  // would cause incorrect client-side filtering.
  const companyIds = useCompanyIds();
  const brandIds = useBrandIds();
  const { dateRange } = useDateFilters();
  const restaurantIds = useDashboardFiltersStore((s) => s.restaurantIds);

  // 2. Expand IDs for multi-portal support
  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();
  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  // 3. Companies for commission data
  const companies = useCompaniesById(companyIds);

  // 4. Build date strings
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  // 5. Fetch P&L period data (orders aggregated by period + portal)
  const pnlQuery = useQuery({
    queryKey: [
      'pnl-periods',
      granularity,
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      expandedBrandIds.length > 0 ? [...expandedBrandIds].sort().join(',') : '',
      expandedRestaurantIds.length > 0 ? [...expandedRestaurantIds].sort().join(',') : '',
    ],
    queryFn: () =>
      fetchPnLPeriods({
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
        addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
        startDate,
        endDate,
        granularity,
      }),
    enabled: companyIds.length > 0,
    retry: false,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });

  // 6. Fetch ads timeseries (daily) for ad spend
  const adsQuery = useQuery({
    queryKey: [
      'pnl-ads',
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      expandedBrandIds.length > 0 ? [...expandedBrandIds].sort().join(',') : '',
      expandedRestaurantIds.length > 0 ? [...expandedRestaurantIds].sort().join(',') : '',
    ],
    queryFn: () =>
      fetchAdsTimeseries({
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
        addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
        startDate,
        endDate,
      }),
    enabled: companyIds.length > 0,
    retry: false,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });

  // 7. Calculate weighted average commission rate
  const commissionRates = useMemo(() => {
    if (companies.length === 0) {
      return { glovo: 0.30, ubereats: 0.30, justeat: 0.30 };
    }
    // Average across selected companies
    let glovoSum = 0, glovoCount = 0;
    let uberSum = 0, uberCount = 0;
    for (const c of companies) {
      if (c.commissionGlovo != null) { glovoSum += c.commissionGlovo; glovoCount++; }
      if (c.commissionUbereats != null) { uberSum += c.commissionUbereats; uberCount++; }
    }
    return {
      glovo: glovoCount > 0 ? glovoSum / glovoCount : 0.30,
      ubereats: uberCount > 0 ? uberSum / uberCount : 0.30,
      justeat: 0.30, // Not in DB yet
    };
  }, [companies]);

  // 8. Compute final P&L data
  const data = useMemo<PnLData | undefined>(() => {
    if (!pnlQuery.data) return undefined;

    const pnlRows = pnlQuery.data;
    const adsRows = adsQuery.data || [];

    // --- Step A: Aggregate ads by period ---
    const adsByPeriod = new Map<string, number>();
    for (const row of adsRows) {
      const key = dateToPeriodKey(row.day, granularity);
      adsByPeriod.set(key, (adsByPeriod.get(key) || 0) + row.adSpent);
    }

    // --- Step B: Aggregate order data by period, optionally filtered by channel tab ---
    interface PeriodAgg {
      gmv: number;
      promos: number;
      refunds: number;
      commissionsWeighted: number;
      orders: number;
    }
    const periodMap = new Map<string, PeriodAgg>();

    for (const row of pnlRows) {
      // RPC returns channel names directly: 'glovo', 'ubereats', 'other'
      const channel = row.channel as 'glovo' | 'ubereats' | 'other';

      // Filter by channel tab
      if (channelTab !== 'total' && channel !== channelTab) continue;

      const key = row.periodStart;
      const existing = periodMap.get(key);

      // Calculate commission for this row based on its channel
      const commRate = (channel === 'glovo' || channel === 'ubereats')
        ? commissionRates[channel]
        : 0.30;
      const commAmount = row.revenue * commRate;

      if (existing) {
        existing.gmv += row.revenue;
        existing.promos += row.promos;
        existing.refunds += row.refunds;
        existing.commissionsWeighted += commAmount;
        existing.orders += row.orderCount;
      } else {
        periodMap.set(key, {
          gmv: row.revenue,
          promos: row.promos,
          refunds: row.refunds,
          commissionsWeighted: commAmount,
          orders: row.orderCount,
        });
      }
    }

    // Sort periods chronologically
    const periods = [...periodMap.keys()].sort();

    if (periods.length === 0) {
      return { periods: [], periodLabels: [], byPeriod: {} };
    }

    const labels = periods.map((p) => periodLabel(p, granularity));

    // --- Step C: Build P&L line items per period ---
    const byPeriod: Record<string, PnLPeriodData> = {};

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const agg = periodMap.get(period)!;
      const prevPeriod = i > 0 ? periods[i - 1] : null;
      const prevAgg = prevPeriod ? periodMap.get(prevPeriod) : null;

      const gmv = agg.gmv;
      const refunds = agg.refunds;
      const adsPromos = agg.promos;
      const adsVisibility = adsByPeriod.get(period) || 0;
      const commissions = agg.commissionsWeighted;
      const cogs = gmv * (foodCostPct / 100);
      const netRevenue = gmv - refunds - adsPromos - adsVisibility - commissions - cogs;
      const grossProfit = gmv - commissions - cogs;
      const netMargin = gmv > 0 ? (netRevenue / gmv) * 100 : 0;

      // Previous period values for % change
      const prevGmv = prevAgg?.gmv ?? 0;
      const prevRefunds = prevAgg?.refunds ?? 0;
      const prevAdsPromos = prevAgg?.promos ?? 0;
      const prevAdsVisibility = prevPeriod ? (adsByPeriod.get(prevPeriod) || 0) : 0;
      const prevCommissions = prevAgg?.commissionsWeighted ?? 0;
      const prevCogs = prevGmv * (foodCostPct / 100);
      const prevNetRevenue = prevGmv - prevRefunds - prevAdsPromos - prevAdsVisibility - prevCommissions - prevCogs;
      const prevGrossProfit = prevGmv - prevCommissions - prevCogs;
      const prevNetMargin = prevGmv > 0 ? (prevNetRevenue / prevGmv) * 100 : 0;

      const buildCell = (value: number, prev: number, isPercentage: boolean): PnLCellData => ({
        value,
        pctOfGmv: !isPercentage && gmv > 0 ? (value / gmv) * 100 : 0,
        pctChange: prevAgg ? pctChange(value, prev) : null,
      });

      const pd: PnLPeriodData = {
        gmv: buildCell(gmv, prevGmv, false),
        refunds: buildCell(refunds, prevRefunds, false),
        ads_promos: buildCell(adsPromos, prevAdsPromos, false),
        ads_visibility: buildCell(adsVisibility, prevAdsVisibility, false),
        commissions: buildCell(commissions, prevCommissions, false),
        cogs: buildCell(cogs, prevCogs, false),
        net_revenue: buildCell(netRevenue, prevNetRevenue, false),
        gross_profit: buildCell(grossProfit, prevGrossProfit, false),
        net_margin: {
          value: netMargin,
          pctOfGmv: 0,
          pctChange: prevAgg ? pctChange(netMargin, prevNetMargin) : null,
        },
      };

      byPeriod[period] = pd;
    }

    return { periods, periodLabels: labels, byPeriod };
  }, [pnlQuery.data, adsQuery.data, channelTab, granularity, foodCostPct, commissionRates]);

  return {
    data,
    isLoading: pnlQuery.isLoading || adsQuery.isLoading,
    isFetching: pnlQuery.isFetching || adsQuery.isFetching,
    error: pnlQuery.error || adsQuery.error,
    refetch: () => {
      pnlQuery.refetch();
      adsQuery.refetch();
    },
  };
}
