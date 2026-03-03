import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/hooks/useBrands';
import { useRestaurants } from '@/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from '@/hooks/idExpansion';
import { fetchCrpOrdersRaw, fetchAdsWeeklyHeatmap } from '@/services/crp-portal';
import type { HeatmapMatrix } from '../types';
import type { HeatmapMetric } from '../types';
import { formatDate } from '@/utils/dateUtils';

/**
 * Convert JS getDay() (Sun=0) to ISO day-of-week (Mon=0, Sun=6).
 */
function jsToIsoDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Build a 24×7 empty matrix.
 */
const LOOKBACK_DAYS = 90;

function createEmptyMatrix(): HeatmapMatrix {
  return Array.from({ length: 24 }, (_, hour) =>
    Array.from({ length: 7 }, (_, dow) => ({
      hour,
      dayOfWeek: dow,
      revenue: 0,
      orders: 0,
      avgTicket: 0,
      uniqueCustomers: 0,
      newCustomers: 0,
      newCustomerPct: 0,
      promos: 0,
      promosPct: 0,
      adSpent: 0,
      adSpentPct: 0,
      avgDeliveryTime: 0,
    }))
  );
}

// ============================================
// HOOK
// ============================================

export function useHeatmapData(metric: HeatmapMetric) {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, brandIds, channelIds, restaurantIds } = useDashboardFiltersStore();

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

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  return useQuery<HeatmapMatrix>({
    queryKey: [
      'heatmap',
      metric,
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      expandedBrandIds.length > 0 ? [...expandedBrandIds].sort().join(',') : '',
      expandedRestaurantIds.length > 0 ? [...expandedRestaurantIds].sort().join(',') : '',
      channelIds.length > 0 ? channelIds.sort().join(',') : '',
    ],
    queryFn: async () => {
      const needsLookback = metric === 'newCustomers';
      const needsAds = metric === 'adSpent';

      // Compute lookback period: 90 days before startDate
      const lookbackStart = new Date(startDate);
      lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);
      const lookbackEnd = new Date(startDate);
      lookbackEnd.setDate(lookbackEnd.getDate() - 1);

      const baseParams = {
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
        addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
        channelIds: channelIds.length > 0 ? channelIds : undefined,
      };

      // Only fetch lookback orders (for new customers) and ads when the metric needs them
      const [orders, lookbackOrders, adsHeatmap] = await Promise.all([
        fetchCrpOrdersRaw({ ...baseParams, startDate, endDate }),
        needsLookback
          ? fetchCrpOrdersRaw({
              ...baseParams,
              startDate: formatDate(lookbackStart),
              endDate: formatDate(lookbackEnd),
            })
          : Promise.resolve([]),
        needsAds
          ? fetchAdsWeeklyHeatmap({
              companyIds: baseParams.companyIds,
              brandIds: baseParams.brandIds,
              addressIds: baseParams.addressIds,
              channelIds: baseParams.channelIds,
              startDate,
              endDate,
            })
          : Promise.resolve([]),
      ]);

      // Build set of existing customers from lookback period
      const existingCustomers = new Set<string>();
      for (const order of lookbackOrders) {
        if (order.cod_id_customer) existingCustomers.add(order.cod_id_customer);
      }

      const matrix = createEmptyMatrix();

      // Per-cell customer tracking: key = "hour-dow"
      const cellCustomers = new Map<string, Set<string>>();
      const cellNewCustomers = new Map<string, Set<string>>();
      // Per-cell delivery time tracking: sum of minutes + count
      const cellDeliverySum = new Map<string, number>();
      const cellDeliveryCount = new Map<string, number>();

      for (const order of orders) {
        if (!order.td_creation_time) continue;
        const date = new Date(order.td_creation_time);
        const hour = date.getHours();
        const dow = jsToIsoDayOfWeek(date.getDay());
        const cell = matrix[hour][dow];
        cell.revenue += order.amt_total_price || 0;
        cell.orders += 1;
        cell.promos += order.amt_promotions || 0;

        // Track delivery time (ts_accepted → ts_delivered)
        if (order.ts_accepted && order.ts_delivered) {
          const accepted = new Date(order.ts_accepted).getTime();
          const delivered = new Date(order.ts_delivered).getTime();
          const minutes = (delivered - accepted) / 60_000;
          // Filter to reasonable range: 1-179 minutes
          if (minutes >= 1 && minutes < 180) {
            const key = `${hour}-${dow}`;
            cellDeliverySum.set(key, (cellDeliverySum.get(key) || 0) + minutes);
            cellDeliveryCount.set(key, (cellDeliveryCount.get(key) || 0) + 1);
          }
        }

        // Track customers per cell
        const customerId = order.cod_id_customer;
        if (customerId) {
          const key = `${hour}-${dow}`;
          if (!cellCustomers.has(key)) cellCustomers.set(key, new Set());
          cellCustomers.get(key)!.add(customerId);

          if (!existingCustomers.has(customerId)) {
            if (!cellNewCustomers.has(key)) cellNewCustomers.set(key, new Set());
            cellNewCustomers.get(key)!.add(customerId);
          }
        }
      }

      // Fill ads data from RPC (ISODOW 1-7 → matrix 0-6)
      for (const row of adsHeatmap) {
        const dow = row.dayOfWeek - 1; // ISODOW 1=Mon → 0, 7=Sun → 6
        const hour = row.hourOfDay;
        if (hour >= 0 && hour < 24 && dow >= 0 && dow < 7) {
          matrix[hour][dow].adSpent += row.adSpent;
        }
      }

      // Calculate derived metrics per cell
      for (let h = 0; h < 24; h++) {
        for (let d = 0; d < 7; d++) {
          const cell = matrix[h][d];
          cell.avgTicket = cell.orders > 0 ? cell.revenue / cell.orders : 0;
          cell.promosPct = cell.revenue > 0 ? (cell.promos / cell.revenue) * 100 : 0;
          cell.adSpentPct = cell.revenue > 0 ? (cell.adSpent / cell.revenue) * 100 : 0;

          const key = `${h}-${d}`;
          const unique = cellCustomers.get(key)?.size ?? 0;
          const newC = cellNewCustomers.get(key)?.size ?? 0;
          cell.uniqueCustomers = unique;
          cell.newCustomers = newC;
          cell.newCustomerPct = unique > 0 ? (newC / unique) * 100 : 0;

          const dSum = cellDeliverySum.get(key) || 0;
          const dCount = cellDeliveryCount.get(key) || 0;
          cell.avgDeliveryTime = dCount > 0 ? dSum / dCount : 0;
        }
      }

      return matrix;
    },
    enabled: companyIds.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
