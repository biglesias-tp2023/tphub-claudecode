/**
 * useProductSales Hook
 *
 * React Query wrapper for the `get_product_sales` RPC.
 * Fetches product-level sales aggregations for the Products Analysis page.
 *
 * @module features/products/hooks/useProductSales
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchProductSales } from '@/services/crp-portal';
import type { ChannelId, DateRange } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export interface UseProductSalesParams {
  companyIds: string[];
  brandIds?: string[];
  addressIds?: string[];
  portalIds?: string[];
  channelIds?: ChannelId[];
  dateRange: DateRange;
}

export function useProductSales(params: UseProductSalesParams) {
  const { companyIds, brandIds, addressIds, portalIds, dateRange } = params;

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  return useQuery({
    queryKey: queryKeys.products.sales({
      companyIds,
      brandIds,
      restaurantIds: addressIds,
      channelIds: params.channelIds,
      dateRange,
    }),
    queryFn: () =>
      fetchProductSales({
        companyIds,
        brandIds,
        addressIds,
        portalIds,
        startDate,
        endDate,
      }),
    enabled: companyIds.length > 0,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}
