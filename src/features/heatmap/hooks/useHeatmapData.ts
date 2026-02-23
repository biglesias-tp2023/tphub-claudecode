import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { fetchCrpOrdersRaw } from '@/services/crp-portal';
import type { Brand, Restaurant } from '@/types';
import type { HeatmapMatrix } from '../types';
import { formatDate } from '@/utils/dateUtils';

// ============================================
// HELPERS
// ============================================

function expandBrandIds(selectedIds: string[], brands: Brand[]): string[] {
  if (selectedIds.length === 0) return [];
  const expanded = new Set<string>();
  for (const id of selectedIds) {
    const brand = brands.find((b) => b.id === id || b.allIds.includes(id));
    if (brand) {
      for (const bid of brand.allIds) expanded.add(bid);
    } else {
      expanded.add(id);
    }
  }
  return Array.from(expanded);
}

function expandRestaurantIds(selectedIds: string[], restaurants: Restaurant[]): string[] {
  if (selectedIds.length === 0) return [];
  const expanded = new Set<string>();
  for (const id of selectedIds) {
    const restaurant = restaurants.find((r) => r.id === id || r.allIds.includes(id));
    if (restaurant) {
      for (const rid of restaurant.allIds) expanded.add(rid);
    } else {
      expanded.add(id);
    }
  }
  return Array.from(expanded);
}

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
    }))
  );
}

// ============================================
// HOOK
// ============================================

export function useHeatmapData() {
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
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      expandedBrandIds.length > 0 ? [...expandedBrandIds].sort().join(',') : '',
      expandedRestaurantIds.length > 0 ? [...expandedRestaurantIds].sort().join(',') : '',
      channelIds.length > 0 ? channelIds.sort().join(',') : '',
    ],
    queryFn: async () => {
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

      // Fetch current period + lookback in parallel
      const [orders, lookbackOrders] = await Promise.all([
        fetchCrpOrdersRaw({ ...baseParams, startDate, endDate }),
        fetchCrpOrdersRaw({
          ...baseParams,
          startDate: formatDate(lookbackStart),
          endDate: formatDate(lookbackEnd),
        }),
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

      for (const order of orders) {
        if (!order.td_creation_time) continue;
        const date = new Date(order.td_creation_time);
        const hour = date.getHours();
        const dow = jsToIsoDayOfWeek(date.getDay());
        const cell = matrix[hour][dow];
        cell.revenue += order.amt_total_price || 0;
        cell.orders += 1;

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

      // Calculate derived metrics per cell
      for (let h = 0; h < 24; h++) {
        for (let d = 0; d < 7; d++) {
          const cell = matrix[h][d];
          cell.avgTicket = cell.orders > 0 ? cell.revenue / cell.orders : 0;

          const key = `${h}-${d}`;
          const unique = cellCustomers.get(key)?.size ?? 0;
          const newC = cellNewCustomers.get(key)?.size ?? 0;
          cell.uniqueCustomers = unique;
          cell.newCustomers = newC;
          cell.newCustomerPct = unique > 0 ? (newC / unique) * 100 : 0;
        }
      }

      return matrix;
    },
    enabled: companyIds.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
