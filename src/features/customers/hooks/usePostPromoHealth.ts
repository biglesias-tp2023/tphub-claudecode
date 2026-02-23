import { useQuery } from '@tanstack/react-query';
import { fetchPostPromoHealth } from '@/services/crp-portal';
import type { PostPromoHealth } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatDate, parseNumericIds } from '@/utils/dateUtils';

export interface UsePostPromoHealthResult {
  data: PostPromoHealth | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function usePostPromoHealth(): UsePostPromoHealthResult {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<PostPromoHealth>({
    queryKey: [
      'post-promo-health',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchPostPromoHealth({
        companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
        brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
        channelIds: channelIds.length > 0 ? channelIds : undefined,
        startDate,
        endDate,
      });
    },
    enabled: numericCompanyIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
