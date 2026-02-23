/**
 * useCustomerCohorts Hook
 *
 * React Query hook for fetching customer cohort retention data.
 *
 * @module features/customers/hooks/useCustomerCohorts
 */

import { useQuery } from '@tanstack/react-query';
import { fetchCustomerCohorts } from '@/services/crp-portal';
import type { CohortData } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatDate, parseNumericIds } from '@/utils/dateUtils';

export interface UseCustomerCohortsParams {
  granularity?: 'week' | 'month';
}

export interface UseCustomerCohortsResult {
  data: CohortData[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useCustomerCohorts(
  params: UseCustomerCohortsParams = {}
): UseCustomerCohortsResult {
  const { granularity = 'month' } = params;
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<CohortData[]>({
    queryKey: [
      'customer-cohorts',
      startDate,
      endDate,
      datePreset,
      granularity,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchCustomerCohorts(
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
          channelIds: channelIds.length > 0 ? channelIds : undefined,
          startDate,
          endDate,
        },
        granularity
      );
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
