import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_LONG } from '@/constants/queryConfig';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { fetchRestaurantActiveChannels } from '@/services/crp-portal/brand-channels';

/**
 * Fetches active channels for each restaurant based on order history.
 * This data is used to filter the establishment dropdown based on selected channels.
 *
 * @returns React Query result with Map<restaurantId, ChannelId[]>
 *
 * @example
 * const { data: restaurantChannels } = useRestaurantChannels();
 * // restaurantChannels.get("789") => ["glovo"]
 */
export function useRestaurantChannels() {
  const { companyIds } = useGlobalFiltersStore();

  return useQuery({
    queryKey: ['restaurant-channels', companyIds],
    queryFn: async () => {
      const numericIds = companyIds
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      return fetchRestaurantActiveChannels(numericIds.length > 0 ? numericIds : undefined);
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: QUERY_GC_LONG,
  });
}
