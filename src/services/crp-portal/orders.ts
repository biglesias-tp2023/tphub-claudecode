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
import { handleCrpError } from './errors';

// ============================================
// TYPES
// ============================================

export interface FetchOrdersParams {
  /** Filter by company IDs (string — RPC uses TEXT arrays) */
  companyIds?: string[];
  /** Filter by brand/store IDs (string — RPC uses TEXT arrays) */
  brandIds?: string[];
  /** Filter by address IDs (string — RPC uses TEXT arrays) */
  addressIds?: string[];
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
  /** Net revenue after refunds (revenue - refunds) */
  netRevenue: number;
  /** Unique customer count */
  uniqueCustomers: number;
  /** Ad spend for this channel */
  adSpent: number;
  /** Revenue attributed to ads for this channel */
  adRevenue: number;
  /** Total impressions for this channel */
  impressions: number;
  /** Total clicks for this channel */
  clicks: number;
  /** Orders attributed to ads for this channel */
  adOrders: number;
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
  /** Net revenue after refunds (totalRevenue - totalRefunds) */
  netRevenue: number;
  /** Promotion rate percentage (totalDiscounts / totalRevenue * 100) */
  promotionRate: number;
  /** Refund rate percentage (totalRefunds / totalRevenue * 100) */
  refundRate: number;
  /** Average discount per order (totalDiscounts / totalOrders) */
  avgDiscountPerOrder: number;
  /** Unique customer count */
  uniqueCustomers: number;
  /** Average orders per customer (totalOrders / uniqueCustomers) */
  ordersPerCustomer: number;
  /** Total ad spend across all channels */
  totalAdSpent: number;
  /** Total revenue attributed to ads */
  totalAdRevenue: number;
  /** Total ad impressions */
  totalImpressions: number;
  /** Total ad clicks */
  totalClicks: number;
  /** Total orders attributed to ads */
  totalAdOrders: number;
  /** Return on ad spend (totalAdRevenue / totalAdSpent) */
  roas: number;
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
 * Both Glovo IDs (original and new) map to 'glovo'.
 *
 * Exported for use by the hierarchy module.
 */
export function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO || portalId === PORTAL_IDS.GLOVO_NEW) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  // JustEat portal ID not yet configured
  return null;
}

/**
 * Maps a channel ID to portal IDs for filtering.
 * Glovo includes both original and new portal IDs.
 */
function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO, PORTAL_IDS.GLOVO_NEW];
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
    netRevenue: 0,
    uniqueCustomers: 0,
    adSpent: 0,
    adRevenue: 0,
    impressions: 0,
    clicks: 0,
    adOrders: 0,
  };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Fetches raw order data from the database using pagination.
 *
 * Use this when you need access to individual order records.
 * For aggregated data (totals, averages), use `fetchCrpOrdersAggregated` instead.
 *
 * NOTE: Uses pagination to bypass Supabase's server-side max_rows limit (default 1000).
 * This ensures all orders are fetched even when selecting multiple companies.
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

  // Determine portal IDs for channel filter
  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  // Use pagination to fetch orders (bypasses Supabase's server-side max_rows limit)
  // Safety limit: max 100 pages (100K rows) to prevent browser crashes with huge datasets
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 100;
  const allOrders: DbCrpOrderHead[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < MAX_PAGES) {
    let query = supabase
      .from('crp_portal__ft_order_head')
      .select('pk_uuid_order, pfk_id_company, pfk_id_store, pfk_id_store_address, pfk_id_portal, td_creation_time, amt_total_price, amt_promotions, amt_refunds, cod_id_customer')
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

    // Apply channel filter
    if (portalIdsToFilter && portalIdsToFilter.length > 0) {
      query = query.in('pfk_id_portal', portalIdsToFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      handleCrpError('fetchCrpOrdersRaw', error);
    }

    if (data && data.length > 0) {
      allOrders.push(...(data as DbCrpOrderHead[]));
      offset += PAGE_SIZE;
      pageCount++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  if (pageCount >= MAX_PAGES && import.meta.env.DEV) {
    console.warn(`fetchCrpOrdersRaw: hit ${MAX_PAGES}-page safety limit (${allOrders.length} rows). Consider narrowing the date range.`);
  }

  return allOrders;
}

/**
 * Response row from get_orders_aggregation RPC function.
 */
interface OrdersAggregationRPCRow {
  channel: string;
  total_revenue: number;
  total_orders: number;
  total_discounts: number;
  total_refunds: number;
  unique_customers: number;
  total_ad_spent: number;
  total_ad_revenue: number;
  total_impressions: number;
  total_clicks: number;
  total_ad_orders: number;
}

/**
 * Fetches and aggregates order data for dashboard display.
 *
 * Uses the `get_orders_aggregation` Supabase RPC function to perform
 * aggregation server-side. The DB returns ~3 rows (one per channel)
 * instead of downloading 50k+ individual orders.
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
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  // Determine portal IDs for channel filter
  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_orders_aggregation', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    handleCrpError('fetchCrpOrdersAggregated', error);
  }

  const rows = (data || []) as OrdersAggregationRPCRow[];

  // Initialize result with empty channel aggregations
  const result: OrdersAggregation = {
    totalRevenue: 0,
    totalOrders: 0,
    avgTicket: 0,
    totalDiscounts: 0,
    totalRefunds: 0,
    netRevenue: 0,
    promotionRate: 0,
    refundRate: 0,
    avgDiscountPerOrder: 0,
    uniqueCustomers: 0,
    ordersPerCustomer: 0,
    totalAdSpent: 0,
    totalAdRevenue: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalAdOrders: 0,
    roas: 0,
    byChannel: {
      glovo: createEmptyChannelAggregation(),
      ubereats: createEmptyChannelAggregation(),
      justeat: createEmptyChannelAggregation(),
    },
  };

  // Parse RPC rows (one per channel: 'glovo', 'ubereats', 'other')
  for (const row of rows) {
    const revenue = Number(row.total_revenue) || 0;
    const orders = Number(row.total_orders) || 0;
    const discounts = Number(row.total_discounts) || 0;
    const refunds = Number(row.total_refunds) || 0;
    const customers = Number(row.unique_customers) || 0;
    const adSpent = Number(row.total_ad_spent) || 0;
    const adRevenue = Number(row.total_ad_revenue) || 0;
    const impressions = Number(row.total_impressions) || 0;
    const clicks = Number(row.total_clicks) || 0;
    const adOrders = Number(row.total_ad_orders) || 0;

    // Add to global totals
    result.totalRevenue += revenue;
    result.totalOrders += orders;
    result.totalDiscounts += discounts;
    result.totalRefunds += refunds;
    result.totalAdSpent += adSpent;
    result.totalAdRevenue += adRevenue;
    result.totalImpressions += impressions;
    result.totalClicks += clicks;
    result.totalAdOrders += adOrders;

    // Map channel row to byChannel
    const channelKey = row.channel as ChannelId;
    if (channelKey === 'glovo' || channelKey === 'ubereats') {
      result.byChannel[channelKey].revenue = revenue;
      result.byChannel[channelKey].orders = orders;
      result.byChannel[channelKey].discounts = discounts;
      result.byChannel[channelKey].refunds = refunds;
      result.byChannel[channelKey].netRevenue = revenue - refunds;
      result.byChannel[channelKey].uniqueCustomers = customers;
      result.byChannel[channelKey].adSpent = adSpent;
      result.byChannel[channelKey].adRevenue = adRevenue;
      result.byChannel[channelKey].impressions = impressions;
      result.byChannel[channelKey].clicks = clicks;
      result.byChannel[channelKey].adOrders = adOrders;
    }
    // 'other' channel (e.g. JustEat or unknown portals) adds to totals but not byChannel
  }

  // Note: unique_customers across channels can't be summed (customers may overlap).
  // We use the global COUNT(DISTINCT) which we don't have from per-channel rows.
  // Approximate by summing per-channel customers (slight overcount if customer uses multiple channels).
  // For exact global count we'd need a separate query or an extra "totals" row from the RPC.
  result.uniqueCustomers = rows.reduce((sum, r) => sum + (Number(r.unique_customers) || 0), 0);

  // Calculate derived metrics
  result.avgTicket = result.totalOrders > 0
    ? result.totalRevenue / result.totalOrders
    : 0;

  result.netRevenue = result.totalRevenue - result.totalRefunds;

  result.promotionRate = result.totalRevenue > 0
    ? (result.totalDiscounts / result.totalRevenue) * 100
    : 0;

  result.refundRate = result.totalRevenue > 0
    ? (result.totalRefunds / result.totalRevenue) * 100
    : 0;

  result.avgDiscountPerOrder = result.totalOrders > 0
    ? result.totalDiscounts / result.totalOrders
    : 0;

  result.ordersPerCustomer = result.uniqueCustomers > 0
    ? result.totalOrders / result.uniqueCustomers
    : 0;

  result.roas = result.totalAdSpent > 0
    ? result.totalAdRevenue / result.totalAdSpent
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
export interface OrdersChanges {
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
  adSpentChange: number;
}

export async function fetchCrpOrdersComparison(
  currentParams: FetchOrdersParams,
  previousParams: FetchOrdersParams
): Promise<{
  current: OrdersAggregation;
  previous: OrdersAggregation;
  changes: OrdersChanges;
}> {
  const [current, previous] = await Promise.all([
    fetchCrpOrdersAggregated(currentParams),
    fetchCrpOrdersAggregated(previousParams),
  ]);

  // Helper function to calculate percentage change
  const calcChange = (curr: number, prev: number): number =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return {
    current,
    previous,
    changes: {
      revenueChange: calcChange(current.totalRevenue, previous.totalRevenue),
      ordersChange: calcChange(current.totalOrders, previous.totalOrders),
      avgTicketChange: calcChange(current.avgTicket, previous.avgTicket),
      netRevenueChange: calcChange(current.netRevenue, previous.netRevenue),
      discountsChange: calcChange(current.totalDiscounts, previous.totalDiscounts),
      refundsChange: calcChange(current.totalRefunds, previous.totalRefunds),
      promotionRateChange: calcChange(current.promotionRate, previous.promotionRate),
      refundRateChange: calcChange(current.refundRate, previous.refundRate),
      uniqueCustomersChange: calcChange(current.uniqueCustomers, previous.uniqueCustomers),
      ordersPerCustomerChange: calcChange(current.ordersPerCustomer, previous.ordersPerCustomer),
      adSpentChange: calcChange(current.totalAdSpent, previous.totalAdSpent),
    },
  };
}

// ============================================
// MONTHLY REVENUE BY CHANNEL (Lightweight RPC)
// ============================================

/**
 * Row returned by get_monthly_revenue_by_channel RPC.
 */
interface MonthlyRevenueRow {
  month_key: string;
  channel: string;
  total_revenue: number;
  total_discounts: number;
  total_ad_spent: number;
}

/**
 * Fetches revenue, promos, and ads grouped by month×channel in ONE call.
 *
 * This replaces calling `fetchCrpOrdersAggregated` 6 times (once per month).
 * The RPC is much lighter: no COUNT(DISTINCT), single query, ~12 result rows.
 *
 * @param params - companyIds, brandIds, addressIds, startDate, endDate
 * @returns Array of { month_key, channel, total_revenue, total_discounts, total_ad_spent }
 */
export async function fetchMonthlyRevenueByChannel(
  params: Omit<FetchOrdersParams, 'channelIds'>
): Promise<MonthlyRevenueRow[]> {
  const { companyIds, brandIds, addressIds, startDate, endDate } = params;

  const { data, error } = await supabase.rpc('get_monthly_revenue_by_channel', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    handleCrpError('fetchMonthlyRevenueByChannel', error);
  }

  return (data || []) as MonthlyRevenueRow[];
}

// ============================================
// CONTROLLING METRICS RPC
// ============================================

/**
 * Response type from get_controlling_metrics RPC function.
 * Returns pre-aggregated metrics at the most granular level (portal).
 */
export interface ControllingMetricsRow {
  pfk_id_company: string;
  pfk_id_store: string;
  pfk_id_store_address: string;
  pfk_id_portal: string;
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  reembolsos: number;
  promoted_orders: number;
  ad_spent: number;
  ad_revenue: number;
  impressions: number;
  clicks: number;
  ad_orders: number;
  avg_rating: number;
  total_reviews: number;
  avg_delivery_time: number;
  delivery_time_count: number;
}

/**
 * Fetches controlling metrics using the RPC function.
 * This replaces downloading raw orders for the Controlling dashboard.
 *
 * @param companyIds - Array of company IDs to filter
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Promise resolving to pre-aggregated metrics rows
 */
export async function fetchControllingMetricsRPC(
  companyIds: string[],
  startDate: string,
  endDate: string
): Promise<ControllingMetricsRow[]> {
  const { data, error } = await supabase.rpc('get_controlling_metrics', {
    p_company_ids: companyIds,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    throw error;
  }

  return data || [];
}
