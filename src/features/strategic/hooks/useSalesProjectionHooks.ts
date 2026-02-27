/**
 * React Query hooks for Sales Projections (Supabase-backed)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE_MEDIUM, QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { queryKeys } from '@/constants/queryKeys';
import {
  fetchSalesProjection,
  upsertSalesProjection,
  updateSalesProjectionTargets,
  deleteSalesProjection,
} from '@/services/supabase-data';
import type { SalesProjectionInput, GridChannelMonthData } from '@/types';

// ============================================
// QUERY
// ============================================

interface UseSalesProjectionParams {
  companyId: string;
  brandId?: string | null;
  addressId?: string | null;
}

/**
 * Fetch a single sales projection for the given scope.
 * Returns null if no projection exists for this scope.
 */
export function useSalesProjection({ companyId, brandId, addressId }: UseSalesProjectionParams) {
  return useQuery({
    queryKey: queryKeys.salesProjections.byScope(companyId, brandId, addressId),
    queryFn: () => fetchSalesProjection({ companyId, brandId, addressId }),
    enabled: !!companyId,
    staleTime: QUERY_STALE_MEDIUM,
    gcTime: QUERY_GC_MEDIUM,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Create or update a sales projection.
 * Invalidates the cache for the affected scope.
 */
export function useUpsertSalesProjection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SalesProjectionInput) => upsertSalesProjection(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.salesProjections.byScope(
          variables.companyId,
          variables.brandId,
          variables.addressId,
        ),
      });
    },
  });
}

/**
 * Partial update for target revenue/ads/promos grids.
 * Used when the user edits the objectives table inline.
 */
export function useUpdateSalesProjectionTargets() {
  const queryClient = useQueryClient();

  interface UpdateTargetsVars {
    id: string;
    companyId: string;
    brandId?: string | null;
    addressId?: string | null;
    updates: {
      targetRevenue?: GridChannelMonthData;
      targetAds?: GridChannelMonthData;
      targetPromos?: GridChannelMonthData;
    };
  }

  return useMutation({
    mutationFn: (vars: UpdateTargetsVars) => updateSalesProjectionTargets(vars.id, vars.updates),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.salesProjections.byScope(vars.companyId, vars.brandId, vars.addressId),
      });
    },
  });
}

/**
 * Delete a sales projection.
 */
export function useDeleteSalesProjection() {
  const queryClient = useQueryClient();

  interface DeleteVars {
    id: string;
    companyId: string;
    brandId?: string | null;
    addressId?: string | null;
  }

  return useMutation({
    mutationFn: (vars: DeleteVars) => deleteSalesProjection(vars.id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.salesProjections.byScope(vars.companyId, vars.brandId, vars.addressId),
      });
    },
  });
}
