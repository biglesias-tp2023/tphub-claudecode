/**
 * useOrdersData Hook
 *
 * React Query hook for fetching aggregated order data from CRP Portal.
 * Used by the Controlling dashboard to display real sales metrics.
 *
 * ## SOLID Principles Applied
 *
 * - **Single Responsibility**: Only handles order data fetching and caching
 * - **Dependency Inversion**: Depends on service abstractions (fetchCrpOrdersComparison)
 * - **Interface Segregation**: Exposes only necessary data (OrdersDataResult)
 *
 * ## Features
 *
 * - Automatic period comparison (current vs previous)
 * - Date handling with timezone safety
 * - ID conversion (string UUIDs → numeric IDs for CRP Portal)
 * - Caching with React Query (1 min stale time)
 * - Only fetches when companies are selected
 *
 * @module features/controlling/hooks/useOrdersData
 */

import { useQuery } from '@tanstack/react-query';
import { fetchCrpOrdersComparison } from '@/services/crp-portal';
import type { OrdersAggregation } from '@/services/crp-portal';
import type { ChannelId, DateRange, DatePreset } from '@/types';
import { formatDate, getPreviousPeriodRange, parseNumericIds } from './dateUtils';

// ============================================
// TYPES
// ============================================

export interface UseOrdersDataParams {
  /** Company IDs to filter by (string UUIDs will be converted to numbers) */
  companyIds: string[];
  /** Brand IDs to filter by */
  brandIds?: string[];
  /** Address IDs to filter by */
  addressIds?: string[];
  /** Channel IDs to filter by */
  channelIds?: ChannelId[];
  /** Date range for the query */
  dateRange: DateRange;
  /** Date preset for period comparison calculation */
  datePreset: DatePreset;
}

export interface OrdersDataResult {
  /** Current period aggregation */
  current: OrdersAggregation;
  /** Previous period aggregation */
  previous: OrdersAggregation;
  /** Percentage changes */
  changes: {
    revenueChange: number;
    ordersChange: number;
    avgTicketChange: number;
    netRevenueChange: number;
    discountsChange: number;
    refundsChange: number;
    promotionRateChange: number;
    refundRateChange: number;
    uniqueCustomersChange: number;
    ordersPerCustomerChange: number;
  };
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for fetching aggregated order data with React Query.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useOrdersData({
 *   companyIds: ['1', '2'],
 *   dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
 *   datePreset: '30d',
 * });
 * ```
 */
export function useOrdersData(params: UseOrdersDataParams) {
  const { companyIds, brandIds, addressIds, channelIds, dateRange, datePreset } = params;

  // Convert string IDs to numbers for CRP Portal queries
  const numericCompanyIds = parseNumericIds(companyIds);
  const numericBrandIds = brandIds ? parseNumericIds(brandIds) : undefined;
  const numericAddressIds = addressIds ? parseNumericIds(addressIds) : undefined;

  // Calculate date strings - ensure we get consistent string values for the query key
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  // Calculate previous period for comparison
  const previousRange = getPreviousPeriodRange(dateRange);
  const previousStartDate = formatDate(previousRange.start);
  const previousEndDate = formatDate(previousRange.end);

  return useQuery<OrdersDataResult>({
    // Include all relevant params in query key to ensure refetch on changes
    queryKey: [
      'crp-orders',
      startDate,       // Date strings first for better cache key comparison
      endDate,
      datePreset,      // Include preset to differentiate between same dates but different presets
      numericCompanyIds.sort().join(','), // Sort for consistent comparison
      numericBrandIds?.sort().join(',') || '',
      numericAddressIds?.sort().join(',') || '',
      channelIds?.sort().join(',') || '',
    ],
    queryFn: async () => {
      const result = await fetchCrpOrdersComparison(
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds && numericBrandIds.length > 0 ? numericBrandIds : undefined,
          addressIds: numericAddressIds && numericAddressIds.length > 0 ? numericAddressIds : undefined,
          channelIds: channelIds && channelIds.length > 0 ? channelIds : undefined,
          startDate,
          endDate,
        },
        {
          companyIds: numericCompanyIds.length > 0 ? numericCompanyIds : undefined,
          brandIds: numericBrandIds && numericBrandIds.length > 0 ? numericBrandIds : undefined,
          addressIds: numericAddressIds && numericAddressIds.length > 0 ? numericAddressIds : undefined,
          channelIds: channelIds && channelIds.length > 0 ? channelIds : undefined,
          startDate: previousStartDate,
          endDate: previousEndDate,
        }
      );

      return result;
    },
    // Only fetch when we have at least one company selected
    enabled: numericCompanyIds.length > 0,
    // Keep data fresh but avoid excessive refetching
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
