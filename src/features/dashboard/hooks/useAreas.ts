import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { fetchCrpAreas, fetchCrpAreaById } from '@/services/crp-portal';

/**
 * Fetches all geographic areas (business areas) from CRP Portal.
 * Areas are not company-specific, so all authenticated users can see all areas.
 *
 * @returns React Query result with areas array
 *
 * @example
 * const { data: areas, isLoading } = useAreas();
 */
export function useAreas() {
  return useQuery({
    queryKey: ['areas', 'list'],
    queryFn: fetchCrpAreas,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: QUERY_GC_MEDIUM,
  });
}

/**
 * Fetches a single area by ID from CRP Portal.
 *
 * @param areaId - The area ID to fetch
 * @returns React Query result with area object
 *
 * @example
 * const { data: area } = useArea('uuid-here');
 */
export function useArea(areaId: string) {
  return useQuery({
    queryKey: ['areas', 'detail', areaId],
    queryFn: () => fetchCrpAreaById(areaId),
    enabled: !!areaId,
  });
}
