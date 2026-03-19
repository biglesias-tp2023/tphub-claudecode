/**
 * useProductsPageState
 *
 * Orchestrates filter state, multi-portal ID expansion, and product sales data
 * for the Products Analysis page. Follows the same pattern as useReputationData.
 */

import { useMemo } from 'react';
import { useCompanyIds, useBrandIds, useChannelIds, useDateFilters, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/hooks/useBrands';
import { useRestaurants } from '@/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from '@/hooks/idExpansion';
import { useProductSales } from '@/features/products';
import { channelIdsToPortalIds } from '@/services/crp-portal';
import type { ProductAnalysisRow } from '@/types/product';

export interface ProductsSummary {
  totalProducts: number;
  totalQuantity: number;
  totalRevenue: number;
  avgTicket: number;
}

export function useProductsPageState() {
  const companyIds = useCompanyIds();
  const brandIds = useBrandIds();
  const channelIds = useChannelIds();
  const { dateRange } = useDateFilters();
  const { restaurantIds } = useDashboardFiltersStore();

  // Expand multi-portal IDs
  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();

  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );

  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  // Convert channelIds → portalIds
  const portalIds = useMemo(
    () => channelIdsToPortalIds(channelIds) ?? undefined,
    [channelIds]
  );

  // Fetch product sales
  const { data: rawSales, isLoading, error, refetch } = useProductSales({
    companyIds,
    brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
    addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
    portalIds,
    channelIds: channelIds.length > 0 ? channelIds : undefined,
    dateRange,
  });

  // Calculate percentages
  const { rows, summary } = useMemo(() => {
    if (!rawSales || rawSales.length === 0) {
      return {
        rows: [] as ProductAnalysisRow[],
        summary: { totalProducts: 0, totalQuantity: 0, totalRevenue: 0, avgTicket: 0 } as ProductsSummary,
      };
    }

    const totalQuantity = rawSales.reduce((s, r) => s + r.totalQuantity, 0);
    const totalRevenue = rawSales.reduce((s, r) => s + r.totalRevenue, 0);

    const rows: ProductAnalysisRow[] = rawSales.map((row) => ({
      ...row,
      quantityPercent: totalQuantity > 0 ? (row.totalQuantity / totalQuantity) * 100 : 0,
      revenuePercent: totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0,
    }));

    const summary: ProductsSummary = {
      totalProducts: rawSales.length,
      totalQuantity,
      totalRevenue,
      avgTicket: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
    };

    return { rows, summary };
  }, [rawSales]);

  return {
    rows,
    summary,
    isLoading,
    error,
    refetch,
    companyIds,
  };
}
