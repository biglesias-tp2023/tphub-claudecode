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
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { formatDate, getPreviousPeriodRange, parseNumericIds } from './dateUtils';
import { expandBrandIds, expandRestaurantIds } from './idExpansion';

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
  const previousRange = getPreviousPeriodRange(dateRange);
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
