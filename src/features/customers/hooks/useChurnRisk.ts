/**
 * useChurnRisk Hook
 *
 * React Query hook for fetching customers at risk of churning.
 *
 * @module features/customers/hooks/useChurnRisk
 */

import { useQuery } from '@tanstack/react-query';
import { fetchChurnRiskCustomers } from '@/services/crp-portal';
import type { CustomerChurnRisk } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';

// ============================================
// HELPERS
// ============================================

function ensureDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

function formatDate(date: Date | string): string {
  const d = ensureDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseNumericIds(ids: string[]): number[] {
  return ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
}

// ============================================
// HOOK
// ============================================

export interface UseChurnRiskParams {
  limit?: number;
}

export interface UseChurnRiskResult {
  data: CustomerChurnRisk[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useChurnRisk(params: UseChurnRiskParams = {}): UseChurnRiskResult {
  const { limit = 20 } = params;
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<CustomerChurnRisk[]>({
    queryKey: [
      'churn-risk',
      startDate,
      endDate,
      datePreset,
      limit,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchChurnRiskCustomers(
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
          channelIds: channelIds.length > 0 ? channelIds : undefined,
          startDate,
          endDate,
        },
        limit
      );
    },
    enabled: numericCompanyIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
