/**
 * Products Hook
 *
 * React Query hook for fetching products from CRP Portal.
 * Used in campaign configuration to select products for promotions.
 *
 * @module features/calendar/hooks/useProducts
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_MEDIUM, QUERY_GC_LONG } from '@/constants/queryConfig';
import { fetchCrpProducts, fetchCrpProductsByIds, type CrpProduct } from '@/services/crp-portal';
import type { CampaignPlatform } from '@/types';

// ============================================
// TYPES
// ============================================

interface UseProductsParams {
  companyId: string | number | undefined;
  platform: CampaignPlatform | null;
  addressId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseProductsByIdsParams {
  productIds: string[];
  companyId: string | number | undefined;
  platform: CampaignPlatform | null;
  enabled?: boolean;
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch products for a company and platform.
 * Products are filtered by platform to ensure only relevant products
 * are shown for each promotion type.
 */
export function useProducts({
  companyId,
  platform,
  addressId,
  search,
  limit = 100,
  enabled = true,
}: UseProductsParams) {
  return useQuery<CrpProduct[], Error>({
    queryKey: ['crp-products', companyId, platform, addressId, search, limit],
    queryFn: async () => {
      if (!companyId || !platform) {
        return [];
      }

      return fetchCrpProducts({
        companyId,
        platform,
        addressId,
        search,
        limit,
      });
    },
    enabled: enabled && !!companyId && !!platform,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: QUERY_GC_MEDIUM,
  });
}

/**
 * Fetch products by their IDs.
 * Used to display selected products in the review step.
 */
export function useProductsByIds({
  productIds,
  companyId,
  platform,
  enabled = true,
}: UseProductsByIdsParams) {
  return useQuery<CrpProduct[], Error>({
    queryKey: ['crp-products-by-ids', productIds, companyId, platform],
    queryFn: async () => {
      if (!companyId || !platform || productIds.length === 0) {
        return [];
      }

      return fetchCrpProductsByIds(productIds, companyId, platform);
    },
    enabled: enabled && !!companyId && !!platform && productIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: QUERY_GC_LONG,
  });
}
