import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useDashboardFiltersStore, useGlobalFiltersStore } from '@/stores/filtersStore';
import {
  fetchCrpRestaurants,
  fetchCrpRestaurantById,
  fetchRestaurantsForMap,
} from '@/services/crp-portal';
import { useBrands } from './useBrands';
import { useAreas } from './useAreas';
import type { Restaurant, RestaurantWithDetails } from '@/types';

/**
 * Fetches restaurants from CRP Portal (crp_portal__dt_address table).
 * Deduplicates addresses by name to handle multi-portal scenarios.
 *
 * @returns React Query result with restaurants array filtered by selected filters
 *
 * @example
 * const { data: restaurants, isLoading } = useRestaurants();
 */
export function useRestaurants() {
  const { brandIds, areaIds } = useDashboardFiltersStore();
  const { companyIds: globalCompanyIds } = useGlobalFiltersStore();
  const { data: brands = [] } = useBrands();

  // When brands are selected, get the company IDs of those brands
  // This allows filtering addresses by the companies that own the selected brands
  const effectiveCompanyIds = useMemo(() => {
    if (brandIds.length > 0) {
      // Get company IDs from selected brands
      const brandCompanyIds = brands
        .filter(b => brandIds.includes(b.id))
        .map(b => b.companyId);

      // If we also have global company filter, intersect them
      if (globalCompanyIds.length > 0) {
        return brandCompanyIds.filter(id => globalCompanyIds.includes(id));
      }
      return brandCompanyIds;
    }
    return globalCompanyIds;
  }, [brandIds, brands, globalCompanyIds]);

  return useQuery({
    queryKey: queryKeys.restaurants.list({ brandIds, areaIds, companyIds: effectiveCompanyIds }),
    queryFn: () =>
      fetchCrpRestaurants({
        companyIds: effectiveCompanyIds.length > 0 ? effectiveCompanyIds : undefined,
        areaIds: areaIds.length > 0 ? areaIds : undefined,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches a single restaurant by ID from CRP Portal.
 *
 * @param restaurantId - The restaurant ID (pk_id_address as string)
 * @returns React Query result with restaurant object
 *
 * @example
 * const { data: restaurant } = useRestaurant('12345');
 */
export function useRestaurant(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(restaurantId),
    queryFn: () => fetchCrpRestaurantById(restaurantId),
    enabled: !!restaurantId,
  });
}

/**
 * Returns restaurant with additional brand and area display names.
 *
 * @param restaurantId - The restaurant ID to fetch
 * @returns Restaurant object with brandName and areaName, or null if not found
 *
 * @example
 * const restaurant = useRestaurantWithDetails('12345');
 * // { ...restaurant, brandName: 'VICIO', areaName: 'Madrid' }
 */
export function useRestaurantWithDetails(restaurantId: string): RestaurantWithDetails | null {
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: brands = [] } = useBrands();
  const { data: areas = [] } = useAreas();

  if (!restaurant) return null;

  const brand = brands.find((b) => b.id === restaurant.brandId);
  const area = restaurant.areaId ? areas.find((a) => a.id === restaurant.areaId) : null;

  return {
    ...restaurant,
    brandName: brand?.name || 'Unknown Brand',
    areaName: area?.name || 'Unknown Area',
  };
}

/**
 * Returns restaurants with details (brand and area names) for a list of restaurants.
 *
 * @returns Array of restaurants with brand and area names
 */
export function useRestaurantsWithDetails(): RestaurantWithDetails[] {
  const { data: restaurants = [] } = useRestaurants();
  const { data: brands = [] } = useBrands();
  const { data: areas = [] } = useAreas();

  return restaurants.map((restaurant: Restaurant): RestaurantWithDetails => {
    const brand = brands.find((b) => b.id === restaurant.brandId);
    const area = restaurant.areaId ? areas.find((a) => a.id === restaurant.areaId) : null;

    return {
      ...restaurant,
      brandName: brand?.name || 'Unknown Brand',
      areaName: area?.name || 'Unknown Area',
    };
  });
}

/**
 * Fetches restaurants with valid coordinates for mapping (geocode_confidence >= 0.5).
 * Uses the tphub_restaurant_coordinates table for geocoded data.
 * Use this hook for map features that require reliable coordinates.
 *
 * @returns React Query result with restaurants that have high-confidence coordinates
 *
 * @example
 * const { data: restaurants, isLoading } = useRestaurantsForMap();
 */
export function useRestaurantsForMap() {
  const { brandIds, areaIds } = useDashboardFiltersStore();
  const { companyIds: globalCompanyIds } = useGlobalFiltersStore();
  const { data: brands = [] } = useBrands();

  const effectiveCompanyIds = useMemo(() => {
    if (brandIds.length > 0) {
      const brandCompanyIds = brands
        .filter(b => brandIds.includes(b.id))
        .map(b => b.companyId);

      if (globalCompanyIds.length > 0) {
        return brandCompanyIds.filter(id => globalCompanyIds.includes(id));
      }
      return brandCompanyIds;
    }
    return globalCompanyIds;
  }, [brandIds, brands, globalCompanyIds]);

  return useQuery({
    queryKey: [...queryKeys.restaurants.list({ brandIds, areaIds, companyIds: effectiveCompanyIds }), 'forMap'],
    queryFn: () =>
      fetchRestaurantsForMap({
        companyIds: effectiveCompanyIds.length > 0 ? effectiveCompanyIds : undefined,
        brandIds: brandIds.length > 0 ? brandIds : undefined,
        areaIds: areaIds.length > 0 ? areaIds : undefined,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
