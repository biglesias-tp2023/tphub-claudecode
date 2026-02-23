import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_LONG } from '@/constants/queryConfig';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { fetchBrandActiveChannels } from '@/services/crp-portal/brand-channels';

/**
 * Fetches active channels for each brand based on order history.
 * This data is used to filter the brand dropdown based on selected channels.
 *
 * @returns React Query result with Map<brandId, ChannelId[]>
 *
 * @example
 * const { data: brandChannels } = useBrandChannels();
 * // brandChannels.get("123") => ["glovo", "ubereats"]
 */
export function useBrandChannels() {
  const { companyIds } = useGlobalFiltersStore();

  return useQuery({
    queryKey: ['brand-channels', companyIds],
    queryFn: async () => {
      const numericIds = companyIds
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      return fetchBrandActiveChannels(numericIds.length > 0 ? numericIds : undefined);
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: QUERY_GC_LONG,
  });
}
