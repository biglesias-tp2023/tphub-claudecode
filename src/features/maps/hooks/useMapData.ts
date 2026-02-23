import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { DEMO_MAP_RESTAURANTS, generateDeliveryPoints } from '../utils/coordinates';
import type { MapRestaurant, MapData, DeliveryPoint } from '../types/maps.types';

// ============================================
// FETCH FUNCTION
// ============================================

/**
 * Fetch map data from API (currently returns demo data)
 */
async function fetchMapData(): Promise<MapData> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    restaurants: DEMO_MAP_RESTAURANTS,
  };
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to fetch and filter map data based on global and dashboard filters
 */
export function useMapData() {
  const { companyIds } = useGlobalFiltersStore();
  const { brandIds, areaIds, restaurantIds, channelIds } = useDashboardFiltersStore();

  // Fetch base data
  const query = useQuery({
    queryKey: ['map-data', companyIds],
    queryFn: fetchMapData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: QUERY_GC_MEDIUM,
  });

  // Filter restaurants based on all active filters
  const filteredRestaurants = useMemo<MapRestaurant[]>(() => {
    if (!query.data) return [];

    let restaurants = query.data.restaurants;

    // Filter by company (global filter)
    if (companyIds.length > 0) {
      restaurants = restaurants.filter((r) => companyIds.includes(r.companyId));
    }

    // Filter by brand (dashboard filter)
    if (brandIds.length > 0) {
      restaurants = restaurants.filter((r) => brandIds.includes(r.brandId));
    }

    // Filter by area (dashboard filter)
    if (areaIds.length > 0) {
      restaurants = restaurants.filter((r) => areaIds.includes(r.areaId));
    }

    // Filter by specific restaurants (dashboard filter)
    if (restaurantIds.length > 0) {
      restaurants = restaurants.filter((r) => restaurantIds.includes(r.id));
    }

    // Filter by channels (dashboard filter)
    if (channelIds.length > 0) {
      restaurants = restaurants.filter((r) =>
        r.activeChannels.some((ch) => channelIds.includes(ch))
      );
    }

    return restaurants;
  }, [query.data, companyIds, brandIds, areaIds, restaurantIds, channelIds]);

  // Generate delivery points for filtered restaurants
  const deliveryPoints = useMemo<DeliveryPoint[]>(() => {
    return generateDeliveryPoints(filteredRestaurants);
  }, [filteredRestaurants]);

  return {
    restaurants: filteredRestaurants,
    deliveryPoints,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
