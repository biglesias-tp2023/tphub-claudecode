/**
 * useMarketingData Hook
 *
 * Orchestrates marketing/advertising data from two sources:
 * 1. useOrdersData (existing) — totals + % changes for scorecards
 * 2. useAdsTimeseries (new) — daily timeseries for the area chart
 *
 * @module features/marketing/hooks/useMarketingData
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useOrdersData } from '@/features/controlling/hooks/useOrdersData';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from '@/features/controlling/hooks/idExpansion';
import { formatDate } from '@/utils/dateUtils';
import { fetchAdsTimeseries } from '@/services/crp-portal';
import type { AdsTimeseriesRow } from '@/services/crp-portal';

// ============================================
// TYPES
// ============================================

export interface MarketingScorecard {
  label: string;
  value: number;
  change: number;
  format: 'number' | 'currency' | 'percent' | 'ratio';
}

export interface MarketingData {
  scorecards: {
    impressions: MarketingScorecard;
    clicks: MarketingScorecard;
    adOrders: MarketingScorecard;
    adSpent: MarketingScorecard;
    roas: MarketingScorecard;
    ctr: MarketingScorecard;
    cpc: MarketingScorecard;
    cac: MarketingScorecard;
  };
  timeseries: AdsTimeseriesRow[];
}

// ============================================
// HOOK
// ============================================

export function useMarketingData() {
  const companyIds = useGlobalFiltersStore((s) => s.companyIds);
  const {
    brandIds,
    restaurantIds,
    channelIds,
    dateRange,
    datePreset,
  } = useDashboardFiltersStore();

  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();

  // Expand multi-portal IDs
  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  // Orders data (totals + comparison) — reuses existing hook
  const ordersQuery = useOrdersData({
    companyIds,
    brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
    addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
    channelIds: channelIds.length > 0 ? channelIds : undefined,
    dateRange,
    datePreset,
  });

  // Date strings for timeseries query
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  // Ads daily timeseries
  const timeseriesQuery = useQuery<AdsTimeseriesRow[]>({
    queryKey: [
      'ads-timeseries',
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      expandedBrandIds.length > 0 ? [...expandedBrandIds].sort().join(',') : '',
      expandedRestaurantIds.length > 0 ? [...expandedRestaurantIds].sort().join(',') : '',
      channelIds.length > 0 ? [...channelIds].sort().join(',') : '',
    ],
    queryFn: () =>
      fetchAdsTimeseries({
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
        addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
        channelIds: channelIds.length > 0 ? channelIds : undefined,
        startDate,
        endDate,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Build scorecards from orders data + timeseries totals
  const data = useMemo((): MarketingData | undefined => {
    if (!ordersQuery.data) return undefined;

    const current = ordersQuery.data.current;
    const previous = ordersQuery.data.previous;

    const calcChange = (curr: number, prev: number): number =>
      prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    // CTR = clicks / impressions * 100
    const currentCtr = current.totalImpressions > 0
      ? (current.totalClicks / current.totalImpressions) * 100
      : 0;
    const previousCtr = previous.totalImpressions > 0
      ? (previous.totalClicks / previous.totalImpressions) * 100
      : 0;

    // CPC = ad_spent / clicks
    const currentCpc = current.totalClicks > 0
      ? current.totalAdSpent / current.totalClicks
      : 0;
    const previousCpc = previous.totalClicks > 0
      ? previous.totalAdSpent / previous.totalClicks
      : 0;

    // CAC = ad_spent / ad_orders
    const currentCac = current.totalAdOrders > 0
      ? current.totalAdSpent / current.totalAdOrders
      : 0;
    const previousCac = previous.totalAdOrders > 0
      ? previous.totalAdSpent / previous.totalAdOrders
      : 0;

    return {
      scorecards: {
        impressions: {
          label: 'Impresiones',
          value: current.totalImpressions,
          change: calcChange(current.totalImpressions, previous.totalImpressions),
          format: 'number',
        },
        clicks: {
          label: 'Clicks',
          value: current.totalClicks,
          change: calcChange(current.totalClicks, previous.totalClicks),
          format: 'number',
        },
        adOrders: {
          label: 'Pedidos Ads',
          value: current.totalAdOrders,
          change: calcChange(current.totalAdOrders, previous.totalAdOrders),
          format: 'number',
        },
        adSpent: {
          label: 'Inversión Ads',
          value: current.totalAdSpent,
          change: calcChange(current.totalAdSpent, previous.totalAdSpent),
          format: 'currency',
        },
        roas: {
          label: 'ROAS',
          value: current.roas,
          change: calcChange(current.roas, previous.roas),
          format: 'ratio',
        },
        ctr: {
          label: 'CTR',
          value: currentCtr,
          change: calcChange(currentCtr, previousCtr),
          format: 'percent',
        },
        cpc: {
          label: 'CPC',
          value: currentCpc,
          change: calcChange(currentCpc, previousCpc),
          format: 'currency',
        },
        cac: {
          label: 'CAC',
          value: currentCac,
          change: calcChange(currentCac, previousCac),
          format: 'currency',
        },
      },
      timeseries: timeseriesQuery.data || [],
    };
  }, [ordersQuery.data, timeseriesQuery.data]);

  return {
    data,
    isLoading: ordersQuery.isLoading,
    timeseriesLoading: timeseriesQuery.isLoading,
    error: ordersQuery.error,
    timeseriesError: timeseriesQuery.error,
  };
}
