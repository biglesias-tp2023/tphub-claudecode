/**
 * useCustomerMetrics Hook
 *
 * React Query hook for fetching customer metrics (totals, retention, CLV).
 *
 * @module features/customers/hooks/useCustomerMetrics
 */

import { useQuery } from '@tanstack/react-query';
import { fetchCustomerMetrics, fetchCustomerMetricsByChannel } from '@/services/crp-portal';
import type { CustomerMetricsWithChanges, ChannelCustomerMetrics } from '@/services/crp-portal';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import type { DateRange, DatePreset } from '@/types';

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

function getPreviousPeriodRange(dateRange: DateRange, preset: DatePreset): { start: Date; end: Date } {
  const start = ensureDate(dateRange.start);
  const end = ensureDate(dateRange.end);
  const durationMs = end.getTime() - start.getTime();

  if (preset === 'year') {
    return {
      start: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()),
      end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()),
    };
  }

  return {
    start: new Date(start.getTime() - durationMs - 86400000),
    end: new Date(start.getTime() - 86400000),
  };
}

function parseNumericIds(ids: string[]): number[] {
  return ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
}

// ============================================
// HOOKS
// ============================================

export interface UseCustomerMetricsResult {
  data: CustomerMetricsWithChanges | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useCustomerMetrics(): UseCustomerMetricsResult {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds, channelIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  const previousRange = getPreviousPeriodRange(dateRange, datePreset);
  const previousStartDate = formatDate(previousRange.start);
  const previousEndDate = formatDate(previousRange.end);

  const query = useQuery<CustomerMetricsWithChanges>({
    queryKey: [
      'customer-metrics',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
      channelIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchCustomerMetrics(
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
          channelIds: channelIds.length > 0 ? channelIds : undefined,
          startDate,
          endDate,
        },
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
          channelIds: channelIds.length > 0 ? channelIds : undefined,
          startDate: previousStartDate,
          endDate: previousEndDate,
        }
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

export interface UseChannelMetricsResult {
  data: ChannelCustomerMetrics[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useChannelCustomerMetrics(): UseChannelMetricsResult {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange, datePreset, brandIds } = useDashboardFiltersStore();

  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = parseNumericIds(brandIds);

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  const query = useQuery<ChannelCustomerMetrics[]>({
    queryKey: [
      'customer-metrics-by-channel',
      startDate,
      endDate,
      datePreset,
      numericCompanyIds.sort().join(','),
      numericBrandIds.sort().join(','),
    ],
    queryFn: async () => {
      return fetchCustomerMetricsByChannel({
        companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
        brandIds: numericBrandIds.length > 0 ? numericBrandIds : undefined,
        startDate,
        endDate,
      });
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
