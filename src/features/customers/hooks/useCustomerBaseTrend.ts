import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomerBaseTrend } from '@/services/crp-portal';
import type { CustomerBaseTrendWeek } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatDate, parseNumericIds, getLastNWeeks } from '@/utils/dateUtils';

export interface UseCustomerBaseTrendResult {
  data: CustomerBaseTrendWeek[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useCustomerBaseTrend(): UseCustomerBaseTrendResult {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const weeks = useMemo(() => {
    const raw = getLastNWeeks(8);
    return raw.map((w, i) => ({
      start: formatDate(w.start),
      end: formatDate(w.end),
      label: `S${i + 1}`,
    }));
  }, []);

  const query = useQuery<CustomerBaseTrendWeek[]>({
    queryKey: [
      'customer-base-trend',
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchCustomerBaseTrend(
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
          channelIds: channelIds.length > 0 ? channelIds : undefined,
          startDate: weeks[0].start,
          endDate: weeks[weeks.length - 1].end,
        },
        weeks
      );
    },
    enabled: numericCompanyIds.length > 0 && weeks.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
