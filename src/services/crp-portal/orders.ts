/**
 * CRP Portal Orders Service
 *
 * Provides data access for order data from the crp_portal__ft_order_head table.
 * Used by the Controlling dashboard to display real sales data.
 *
 * ## SOLID Principles Applied
 *
 * - **Single Responsibility**: This module only handles order data operations
 * - **Open/Closed**: New channel mappings can be added without modifying existing code
 * - **Dependency Inversion**: Depends on types/interfaces, not concrete implementations
 *
 * ## Data Flow
 *
 * ```
 * Supabase (crp_portal__ft_order_head)
 *     ↓
 * fetchCrpOrdersRaw() → Raw DbCrpOrderHead[]
 *     ↓
 * fetchCrpOrdersAggregated() → OrdersAggregation (totals + byChannel)
 *     ↓
 * fetchCrpOrdersComparison() → Current vs Previous + Changes %
 * ```
 *
 * @module services/crp-portal/orders
 */

import { supabase } from '../supabase';
import type { DbCrpOrderHead } from './types';
import { PORTAL_IDS } from './types';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface FetchOrdersParams {
  /** Filter by company IDs */
  companyIds?: number[];
  /** Filter by brand/store IDs */
  brandIds?: number[];
  /** Filter by address IDs */
  addressIds?: number[];
  /** Filter by channels */
  channelIds?: ChannelId[];
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  /** End date (YYYY-MM-DD) */
  endDate: string;
}

export interface ChannelAggregation {
  revenue: number;
  orders: number;
  discounts: number;
  refunds: number;
}

export interface OrdersAggregation {
  /** Total revenue (SUM of amt_total_price) */
  totalRevenue: number;
  /** Total order count */
  totalOrders: number;
  /** Average ticket (totalRevenue / totalOrders) */
  avgTicket: number;
  /** Total discounts/promotions */
  totalDiscounts: number;
  /** Total refunds */
  totalRefunds: number;
  /** Aggregation by channel */
  byChannel: {
    glovo: ChannelAggregation;
    ubereats: ChannelAggregation;
    justeat: ChannelAggregation;
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Maps a portal ID to a channel ID.
 */
function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  // JustEat portal ID not yet configured
  return null;
}

/**
 * Maps a channel ID to portal IDs for filtering.
 */
function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO];
    case 'ubereats':
      return [PORTAL_IDS.UBEREATS];
    case 'justeat':
      // JustEat portal ID not yet configured
      return [];
    default:
      return [];
  }
}

/**
 * Channels that have portal IDs configured (i.e., have data in the database).
 */
const CHANNELS_WITH_DATA: ChannelId[] = ['glovo', 'ubereats'];

/**
 * Check if the channel filter includes all channels with data.
 * If so, we don't need to apply any filter (get all data).
 */
function shouldApplyChannelFilter(channelIds: ChannelId[]): boolean {
  // If all channels with data are included, don't apply filter
  const hasAllChannelsWithData = CHANNELS_WITH_DATA.every((ch) => channelIds.includes(ch));
  return !hasAllChannelsWithData;
}

/**
 * Creates an empty channel aggregation object.
 */
function createEmptyChannelAggregation(): ChannelAggregation {
  return {
    revenue: 0,
    orders: 0,
    discounts: 0,
    refunds: 0,
  };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Fetches raw order data from the database.
 *
 * Use this when you need access to individual order records.
 * For aggregated data (totals, averages), use `fetchCrpOrdersAggregated` instead.
 *
 * @param params - Query parameters including filters and date range
 * @returns Promise resolving to array of raw order records
 *
 * @example
 * ```typescript
 * const orders = await fetchCrpOrdersRaw({
 *   companyIds: [1, 2],
 *   startDate: '2026-01-01',
 *   endDate: '2026-01-31'
 * });
 * ```
 */
export async function fetchCrpOrdersRaw(
  params: FetchOrdersParams
): Promise<DbCrpOrderHead[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let query = supabase
    .from('crp_portal__ft_order_head')
    .select('*')
    .gte('td_creation_time', `${startDate}T00:00:00`)
    .lte('td_creation_time', `${endDate}T23:59:59`);

  // Apply company filter
  if (companyIds && companyIds.length > 0) {
    query = query.in('pfk_id_company', companyIds);
  }

  // Apply brand filter
  if (brandIds && brandIds.length > 0) {
    query = query.in('pfk_id_store', brandIds);
  }

  // Apply address filter
  if (addressIds && addressIds.length > 0) {
    query = query.in('pfk_id_store_address', addressIds);
  }

  // Apply channel filter by converting to portal IDs
  // Only apply if NOT all channels with data are selected
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    const portalIds = channelIds.flatMap(channelIdToPortalIds);
    if (portalIds.length > 0) {
      query = query.in('pfk_id_portal', portalIds);

      if (import.meta.env.DEV) {
        console.log('[fetchCrpOrdersRaw] Applying channel filter:', {
          channelIds,
          portalIds,
        });
      }
    }
  } else if (import.meta.env.DEV && channelIds && channelIds.length > 0) {
    console.log('[fetchCrpOrdersRaw] Skipping channel filter - all channels with data selected');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching CRP orders:', error);
    throw error;
  }

  return (data || []) as DbCrpOrderHead[];
}

/**
 * Fetches and aggregates order data for dashboard display.
 *
 * Returns totals and per-channel breakdowns. This is the primary function
 * for the Controlling dashboard KPIs.
 *
 * @param params - Query parameters including filters and date range
 * @returns Promise resolving to aggregated metrics
 *
 * @example
 * ```typescript
 * const data = await fetchCrpOrdersAggregated({
 *   companyIds: [1],
 *   channelIds: ['glovo', 'ubereats'],
 *   startDate: '2026-01-01',
 *   endDate: '2026-01-31'
 * });
 *
 * console.log(data.totalRevenue);  // 50000
 * console.log(data.avgTicket);     // 25.50
 * console.log(data.byChannel.glovo.revenue); // 30000
 * ```
 */
export async function fetchCrpOrdersAggregated(
  params: FetchOrdersParams
): Promise<OrdersAggregation> {
  const orders = await fetchCrpOrdersRaw(params);

  // Initialize aggregation
  const result: OrdersAggregation = {
    totalRevenue: 0,
    totalOrders: 0,
    avgTicket: 0,
    totalDiscounts: 0,
    totalRefunds: 0,
    byChannel: {
      glovo: createEmptyChannelAggregation(),
      ubereats: createEmptyChannelAggregation(),
      justeat: createEmptyChannelAggregation(),
    },
  };

  // Aggregate order data
  for (const order of orders) {
    const revenue = order.amt_total_price || 0;
    const discounts = order.amt_promotions || 0;
    const refunds = order.amt_refunds || 0;

    // Add to totals
    result.totalRevenue += revenue;
    result.totalOrders += 1;
    result.totalDiscounts += discounts;
    result.totalRefunds += refunds;

    // Add to channel-specific aggregation
    const channelId = portalIdToChannelId(order.pfk_id_portal);
    if (channelId && result.byChannel[channelId]) {
      result.byChannel[channelId].revenue += revenue;
      result.byChannel[channelId].orders += 1;
      result.byChannel[channelId].discounts += discounts;
      result.byChannel[channelId].refunds += refunds;
    }
  }

  // Calculate average ticket
  result.avgTicket = result.totalOrders > 0
    ? result.totalRevenue / result.totalOrders
    : 0;

  return result;
}

/**
 * Fetches aggregated order data for two periods and calculates changes.
 *
 * Used to display period-over-period comparisons in the dashboard
 * (e.g., "this month vs last month", "+5.2%").
 *
 * @param currentParams - Parameters for the current/main period
 * @param previousParams - Parameters for the comparison/previous period
 * @returns Promise resolving to current data, previous data, and percentage changes
 *
 * @example
 * ```typescript
 * const result = await fetchCrpOrdersComparison(
 *   { companyIds: [1], startDate: '2026-01-01', endDate: '2026-01-31' },
 *   { companyIds: [1], startDate: '2025-12-01', endDate: '2025-12-31' }
 * );
 *
 * console.log(result.changes.revenueChange); // 5.2 (meaning +5.2%)
 * console.log(result.current.totalRevenue);  // 52600
 * console.log(result.previous.totalRevenue); // 50000
 * ```
 */
export async function fetchCrpOrdersComparison(
  currentParams: FetchOrdersParams,
  previousParams: FetchOrdersParams
): Promise<{
  current: OrdersAggregation;
  previous: OrdersAggregation;
  changes: {
    revenueChange: number;
    ordersChange: number;
    avgTicketChange: number;
  };
}> {
  const [current, previous] = await Promise.all([
    fetchCrpOrdersAggregated(currentParams),
    fetchCrpOrdersAggregated(previousParams),
  ]);

  // Calculate percentage changes
  const revenueChange = previous.totalRevenue > 0
    ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
    : 0;

  const ordersChange = previous.totalOrders > 0
    ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100
    : 0;

  const avgTicketChange = previous.avgTicket > 0
    ? ((current.avgTicket - previous.avgTicket) / previous.avgTicket) * 100
    : 0;

  return {
    current,
    previous,
    changes: {
      revenueChange,
      ordersChange,
      avgTicketChange,
    },
  };
}
