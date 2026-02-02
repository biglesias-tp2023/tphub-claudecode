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
