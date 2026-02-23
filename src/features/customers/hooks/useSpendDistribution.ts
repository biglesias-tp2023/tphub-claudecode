// @ts-nocheck — WIP hook, dependencies not yet exported
/**
 * useSpendDistribution Hook
 *
 * React Query hook for fetching customer spend distribution data.
 *
 * @module features/customers/hooks/useSpendDistribution
 */

import { useQuery } from '@tanstack/react-query';
import { fetchSpendDistribution } from '@/services/crp-portal';
import type { SpendDistribution } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatDate, parseNumericIds } from '@/utils/dateUtils';

export interface UseSpendDistributionResult {
  data: SpendDistribution | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useSpendDistribution(): UseSpendDistributionResult {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<SpendDistribution>({
    queryKey: [
      'spend-distribution',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchSpendDistribution({
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
