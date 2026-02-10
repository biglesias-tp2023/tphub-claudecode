/**
 * useHierarchyData Hook
 *
 * React Query hook for fetching hierarchy data from CRP Portal.
 * Used by the Controlling dashboard to display the "Detalle por Compañía" table.
 *
 * Returns data in a 4-level hierarchy:
 * Company → Brand → Address → Channel
 *
 * @module features/controlling/hooks/useHierarchyData
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { fetchHierarchyDataRPC } from '@/services/crp-portal';
import type { HierarchyDataRow } from '@/services/crp-portal';
import type { DateRange, DatePreset, Brand, Restaurant } from '@/types';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';

// ============================================
// HELPERS
// ============================================

/**
 * Ensures a date value is a proper Date object.
 */
function ensureDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Format a Date to YYYY-MM-DD string.
 */
function formatDate(date: Date | string): string {
  const d = ensureDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the previous period date range based on preset.
 *
 * For a current period of Feb 2-8 (7 days inclusive):
 * - Previous should be Jan 26 - Feb 1 (7 days inclusive)
 * - previousEnd = day before current start = Feb 1
 * - previousStart = previousEnd - duration = Jan 26
 */
function getPreviousPeriodRange(dateRange: DateRange, preset: DatePreset): { start: Date; end: Date } {
  const start = ensureDate(dateRange.start);
  const end = ensureDate(dateRange.end);

  if (preset === 'year') {
    return {
      start: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()),
      end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()),
    };
  }

  // Calculate duration in full days (ignoring time component)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const durationMs = endDay.getTime() - startDay.getTime();

  // Previous period ends the day before current period starts
  const previousEnd = new Date(startDay.getTime() - 86400000);
  // Previous period has the same duration
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    start: previousStart,
    end: previousEnd,
  };
}

/**
 * Convert string IDs to numbers, filtering out invalid values.
 */
function parseNumericIds(ids: string[]): number[] {
  return ids
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && id > 0);
}

/**
 * Expand selected brand IDs to include all related IDs from multi-portal grouping.
 */
function expandBrandIds(selectedIds: string[], brands: Brand[]): string[] {
  if (selectedIds.length === 0) return [];

  const expandedIds = new Set<string>();

  for (const selectedId of selectedIds) {
    const brand = brands.find(
      (b) => b.id === selectedId || b.allIds.includes(selectedId)
    );

    if (brand) {
      for (const id of brand.allIds) {
        expandedIds.add(id);
      }
    } else {
      expandedIds.add(selectedId);
    }
  }

  return Array.from(expandedIds);
}

/**
 * Expand selected restaurant IDs to include all related IDs from multi-portal grouping.
 */
function expandRestaurantIds(selectedIds: string[], restaurants: Restaurant[]): string[] {
  if (selectedIds.length === 0) return [];

  const expandedIds = new Set<string>();

  for (const selectedId of selectedIds) {
    const restaurant = restaurants.find(
      (r) => r.id === selectedId || r.allIds.includes(selectedId)
    );

    if (restaurant) {
      for (const id of restaurant.allIds) {
        expandedIds.add(id);
      }
    } else {
      expandedIds.add(selectedId);
    }
  }

  return Array.from(expandedIds);
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for fetching hierarchy data with React Query.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useHierarchyData();
 *
 * // data is HierarchyDataRow[]
 * // Each row has: id, level, name, parentId, companyId, brandId, channelId, metrics
 * ```
 */
export function useHierarchyData() {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds, restaurantIds } = useDashboardFiltersStore();

  // Fetch brands and restaurants for ID expansion
  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();

  // Expand selected IDs for multi-portal support
  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  // Calculate date strings
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  // Calculate previous period
  const previousRange = getPreviousPeriodRange(dateRange, datePreset);
  const previousStartDate = formatDate(previousRange.start);
  const previousEndDate = formatDate(previousRange.end);

  // Convert string IDs to numbers
  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = expandedBrandIds.length > 0 ? parseNumericIds(expandedBrandIds) : undefined;
  const numericAddressIds = expandedRestaurantIds.length > 0 ? parseNumericIds(expandedRestaurantIds) : undefined;

  return useQuery<HierarchyDataRow[]>({
    queryKey: [
      'hierarchy-data',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds?.sort().join(',') || '',
      numericAddressIds?.sort().join(',') || '',
      channelIds?.sort().join(',') || '',
    ],
    queryFn: async () => {
      // Convert numeric IDs to strings for RPC
      const stringCompanyIds = numericCompanyIds.map(id => String(id));

      const result = await fetchHierarchyDataRPC(
        stringCompanyIds,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      );

      return result;
    },
    enabled: numericCompanyIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
