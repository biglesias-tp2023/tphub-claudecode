import { useQuery } from '@tanstack/react-query';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { fetchRestaurantKpis, fetchAggregatedKpis } from '@/services/supabase-data';
import { useRestaurants } from './useRestaurants';
import type { PeriodType, DateRange } from '@/types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface UseRestaurantKpisOptions {
  periodType?: PeriodType;
  enabled?: boolean;
}

/**
 * Fetches restaurant KPIs for the selected restaurants and date range.
 * Uses the dashboard filters and global company filter.
 *
 * @param options - Optional configuration
 * @returns React Query result with KPIs array
 *
 * @example
 * const { data: kpis, isLoading } = useRestaurantKpis({ periodType: 'daily' });
 */
export function useRestaurantKpis(options: UseRestaurantKpisOptions = {}) {
  const { periodType = 'daily', enabled = true } = options;
  const { restaurantIds, dateRange } = useDashboardFiltersStore();
  const { data: allRestaurants = [] } = useRestaurants();

  // Determine which restaurant IDs to fetch KPIs for
  // If specific restaurants are selected, use those; otherwise use all from the filtered list
  const targetRestaurantIds =
    restaurantIds.length > 0
      ? restaurantIds
      : allRestaurants.map((r) => r.id);

  return useQuery({
    queryKey: [
      'restaurant-kpis',
      targetRestaurantIds,
      formatDate(dateRange.start),
      formatDate(dateRange.end),
      periodType,
    ],
    queryFn: () =>
      fetchRestaurantKpis({
        restaurantIds: targetRestaurantIds.length > 0 ? targetRestaurantIds : undefined,
        startDate: formatDate(dateRange.start),
        endDate: formatDate(dateRange.end),
        periodType,
      }),
    enabled: enabled && targetRestaurantIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches aggregated KPIs across all selected restaurants and date range.
 * Returns summary metrics like total orders, revenue, and channel breakdowns.
 *
 * @param options - Optional configuration
 * @returns React Query result with aggregated KPIs
 *
 * @example
 * const { data: summary } = useAggregatedKpis({ periodType: 'daily' });
 * // { totalOrders: 1500, totalRevenue: 45000, ... }
 */
export function useAggregatedKpis(options: UseRestaurantKpisOptions = {}) {
  const { periodType = 'daily', enabled = true } = options;
  const { restaurantIds, dateRange } = useDashboardFiltersStore();
  const { data: allRestaurants = [] } = useRestaurants();

  const targetRestaurantIds =
    restaurantIds.length > 0
      ? restaurantIds
      : allRestaurants.map((r) => r.id);

  return useQuery({
    queryKey: [
      'aggregated-kpis',
      targetRestaurantIds,
      formatDate(dateRange.start),
      formatDate(dateRange.end),
      periodType,
    ],
    queryFn: () =>
      fetchAggregatedKpis({
        restaurantIds: targetRestaurantIds.length > 0 ? targetRestaurantIds : undefined,
        startDate: formatDate(dateRange.start),
        endDate: formatDate(dateRange.end),
        periodType,
      }),
    enabled: enabled && targetRestaurantIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches KPIs for a specific restaurant.
 *
 * @param restaurantId - The restaurant ID to fetch KPIs for
 * @param dateRange - Date range for KPIs
 * @param periodType - Period type (daily, weekly, monthly)
 * @returns React Query result with KPIs for the restaurant
 */
export function useRestaurantKpisById(
  restaurantId: string,
  dateRange: DateRange,
  periodType: PeriodType = 'daily'
) {
  return useQuery({
    queryKey: [
      'restaurant-kpis',
      restaurantId,
      formatDate(dateRange.start),
      formatDate(dateRange.end),
      periodType,
    ],
    queryFn: () =>
      fetchRestaurantKpis({
        restaurantIds: [restaurantId],
        startDate: formatDate(dateRange.start),
        endDate: formatDate(dateRange.end),
        periodType,
      }),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}
