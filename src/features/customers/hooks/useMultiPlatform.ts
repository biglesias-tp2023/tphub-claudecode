/**
 * useMultiPlatform Hook
 *
 * React Query hook for fetching multi-platform customer analysis.
 *
 * @module features/customers/hooks/useMultiPlatform
 */

import { useQuery } from '@tanstack/react-query';
import { fetchMultiPlatformAnalysis } from '@/services/crp-portal';
import type { MultiPlatformAnalysis } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatDate, parseNumericIds } from '@/utils/dateUtils';

export interface UseMultiPlatformResult {
  data: MultiPlatformAnalysis | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useMultiPlatform(): UseMultiPlatformResult {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<MultiPlatformAnalysis>({
    queryKey: [
      'multi-platform',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchMultiPlatformAnalysis({
        companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
        brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
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
