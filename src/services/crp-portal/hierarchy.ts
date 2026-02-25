/**
 * CRP Portal Hierarchy Service
 *
 * Provides hierarchy data (Company -> Brand -> Address -> Channel) for the
 * Controlling dashboard. Supports two approaches:
 *
 * 1. **Raw orders** (`fetchHierarchyData`): Downloads raw orders and aggregates client-side.
 * 2. **RPC optimized** (`fetchHierarchyDataRPC`): Uses `get_controlling_metrics` RPC
 *    for server-side aggregation. Much faster for large datasets.
 *
 * Implementation split across:
 * - `hierarchyBuilder.ts` — Dimension fetching + raw-order hierarchy
 * - `hierarchyAggregators.ts` — RPC metrics aggregation + RPC hierarchy
 *
 * @module services/crp-portal/hierarchy
 */

import type { ChannelId } from '@/types';
import { fetchCrpOrdersRaw, fetchControllingMetricsRPC } from './orders';
import type { FetchOrdersParams } from './orders';
import type { DbCrpOrderHead } from './types';
import { fetchAllDimensions, buildHierarchyFromDimensions } from './hierarchyBuilder';
import { aggregateRPCMetrics, buildHierarchyFromRPCMetrics } from './hierarchyAggregators';

// Re-export types from sub-modules for backward compatibility
export type { AllDimensions, CompanyDim, StoreDim, AddressDim, PortalDim } from './hierarchyBuilder';
export type { RPCBaseMetrics, AggregatedRPCMetrics } from './hierarchyAggregators';

// ============================================
// TYPES
// ============================================

export interface HierarchyMetrics {
  ventas: number;
  ventasChange: number;
  pedidos: number;
  ticketMedio: number;
  nuevosClientes: number;
  porcentajeNuevos: number;
  descuentos: number;
  promotedOrders: number;
  adSpent: number;
  adRevenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  adOrders: number;
  ratingGlovo: number;
  reviewsGlovo: number;
  ratingUber: number;
  reviewsUber: number;
}

export interface HierarchyDataRow {
  id: string;
  level: 'company' | 'brand' | 'address' | 'channel';
  name: string;
  parentId?: string;
  channelId?: ChannelId;
  companyId: string;
  brandId?: string;
  metrics: HierarchyMetrics;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetches hierarchy data using raw orders (slower, no RPC needed).
 */
export async function fetchHierarchyData(
  params: FetchOrdersParams,
  previousParams: FetchOrdersParams
): Promise<HierarchyDataRow[]> {
  const { companyIds } = params;
  if (!companyIds || companyIds.length === 0) return [];

  const dimensions = await fetchAllDimensions(companyIds);

  const [currentOrders, previousOrders] = await Promise.all([
    fetchCrpOrdersRaw(params) as Promise<(DbCrpOrderHead & { flg_customer_new?: boolean })[]>,
    fetchCrpOrdersRaw(previousParams) as Promise<(DbCrpOrderHead & { flg_customer_new?: boolean })[]>,
  ]);

  return buildHierarchyFromDimensions(dimensions, currentOrders, previousOrders);
}

/**
 * Fetches hierarchy data using the RPC function (faster, recommended).
 */
export async function fetchHierarchyDataRPC(
  companyIds: string[],
  startDate: string,
  endDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<HierarchyDataRow[]> {
  if (!companyIds || companyIds.length === 0) return [];

  const dimensions = await fetchAllDimensions(companyIds);

  const [currentMetrics, previousMetrics] = await Promise.all([
    fetchControllingMetricsRPC(companyIds, startDate, endDate),
    fetchControllingMetricsRPC(companyIds, previousStartDate, previousEndDate),
  ]);

  const currentAgg = aggregateRPCMetrics(currentMetrics);
  const previousAgg = aggregateRPCMetrics(previousMetrics);

  const result = buildHierarchyFromRPCMetrics(dimensions, currentAgg, previousAgg);

  if (import.meta.env.DEV) {
    const levelCounts = result.reduce((acc, row) => {
      acc[row.level] = (acc[row.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.debug('[fetchHierarchyDataRPC]', {
      dimensions: { companies: dimensions.companies.length, stores: dimensions.stores.length, addresses: dimensions.addresses.length },
      metrics: { current: currentMetrics.length, previous: previousMetrics.length },
      rows: levelCounts,
    });
  }

  return result;
}
