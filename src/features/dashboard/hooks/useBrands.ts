import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { fetchCrpBrands, fetchCrpBrandById } from '@/services/crp-portal';

/**
 * Fetches brands (stores) from CRP Portal filtered by the globally selected companies.
 *
 * @returns React Query result with brands array filtered by selected companies
 *
 * @example
 * const { data: brands, isLoading } = useBrands();
 */
export function useBrands() {
  const { companyIds } = useGlobalFiltersStore();

  return useQuery({
    queryKey: queryKeys.brands.list(companyIds),
    queryFn: () => fetchCrpBrands(companyIds.length > 0 ? companyIds : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches a single brand by ID from CRP Portal.
 *
 * @param brandId - The brand ID to fetch
 * @returns React Query result with brand object
 *
 * @example
 * const { data: brand } = useBrand('uuid-here');
 */
export function useBrand(brandId: string) {
  return useQuery({
    queryKey: queryKeys.brands.detail(brandId),
    queryFn: () => fetchCrpBrandById(brandId),
    enabled: !!brandId,
  });
}
