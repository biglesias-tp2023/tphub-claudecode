import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { fetchCrpOrdersRaw } from '@/services/crp-portal';
import type { Brand, Restaurant } from '@/types';
import type { HeatmapMatrix } from '../types';

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

function parseNumericIds(ids: string[]): number[] {
  return ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
}

function ensureDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function formatDate(date: Date | string): string {
  const d = ensureDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
function createEmptyMatrix(): HeatmapMatrix {
  return Array.from({ length: 24 }, (_, hour) =>
    Array.from({ length: 7 }, (_, dow) => ({
      hour,
      dayOfWeek: dow,
      revenue: 0,
      orders: 0,
      avgTicket: 0,
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

  const numericCompanyIds = useMemo(() => parseNumericIds(companyIds), [companyIds]);
  const numericBrandIds = useMemo(
    () => (expandedBrandIds.length > 0 ? parseNumericIds(expandedBrandIds) : undefined),
    [expandedBrandIds]
  );
  const numericRestaurantIds = useMemo(
    () => (expandedRestaurantIds.length > 0 ? parseNumericIds(expandedRestaurantIds) : undefined),
    [expandedRestaurantIds]
  );

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  return useQuery<HeatmapMatrix>({
    queryKey: [
      'heatmap',
      startDate,
      endDate,
      numericCompanyIds.sort().join(','),
      numericBrandIds?.sort().join(',') || '',
      numericRestaurantIds?.sort().join(',') || '',
      channelIds.length > 0 ? channelIds.sort().join(',') : '',
    ],
    queryFn: async () => {
      const orders = await fetchCrpOrdersRaw({
        companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
        brandIds: numericBrandIds && numericBrandIds.length > 0 ? numericBrandIds : undefined,
        addressIds: numericRestaurantIds && numericRestaurantIds.length > 0 ? numericRestaurantIds : undefined,
        channelIds: channelIds.length > 0 ? channelIds : undefined,
        startDate,
        endDate,
      });

      const matrix = createEmptyMatrix();

      for (const order of orders) {
        if (!order.td_creation_time) continue;
        const date = new Date(order.td_creation_time);
        const hour = date.getHours();
        const dow = jsToIsoDayOfWeek(date.getDay());
        const cell = matrix[hour][dow];
        cell.revenue += order.amt_total_price || 0;
        cell.orders += 1;
      }

      // Calculate avgTicket per cell
      for (let h = 0; h < 24; h++) {
        for (let d = 0; d < 7; d++) {
          const cell = matrix[h][d];
          cell.avgTicket = cell.orders > 0 ? cell.revenue / cell.orders : 0;
        }
      }

      return matrix;
    },
    enabled: numericCompanyIds.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
