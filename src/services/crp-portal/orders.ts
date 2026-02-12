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
import { deduplicateAndFilterDeleted } from './utils';

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
  /** Net revenue after refunds (revenue - refunds) */
  netRevenue: number;
  /** Unique customer count */
  uniqueCustomers: number;
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
 */
function portalIdToChannelId(portalId: string): ChannelId | null {
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

  // Use pagination to fetch all orders (bypasses Supabase's server-side max_rows limit)
  const PAGE_SIZE = 1000;
  const allOrders: DbCrpOrderHead[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
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

    // Apply channel filter
    if (portalIdsToFilter && portalIdsToFilter.length > 0) {
      query = query.in('pfk_id_portal', portalIdsToFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching CRP orders:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allOrders.push(...(data as DbCrpOrderHead[]));
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allOrders;
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
    netRevenue: 0,
    promotionRate: 0,
    refundRate: 0,
    avgDiscountPerOrder: 0,
    uniqueCustomers: 0,
    ordersPerCustomer: 0,
    byChannel: {
      glovo: createEmptyChannelAggregation(),
      ubereats: createEmptyChannelAggregation(),
      justeat: createEmptyChannelAggregation(),
    },
  };

  // Track unique customers globally and per channel
  const globalCustomerIds = new Set<string>();
  const channelCustomerIds: Record<ChannelId, Set<string>> = {
    glovo: new Set(),
    ubereats: new Set(),
    justeat: new Set(),
  };

  // Aggregate order data
  for (const order of orders) {
    const revenue = order.amt_total_price || 0;
    const discounts = order.amt_promotions || 0;
    const refunds = order.amt_refunds || 0;
    const customerId = order.cod_id_customer;

    // Add to totals
    result.totalRevenue += revenue;
    result.totalOrders += 1;
    result.totalDiscounts += discounts;
    result.totalRefunds += refunds;

    // Track unique customers
    if (customerId) {
      globalCustomerIds.add(customerId);
    }

    // Add to channel-specific aggregation
    const channelId = portalIdToChannelId(order.pfk_id_portal);
    if (channelId && result.byChannel[channelId]) {
      result.byChannel[channelId].revenue += revenue;
      result.byChannel[channelId].orders += 1;
      result.byChannel[channelId].discounts += discounts;
      result.byChannel[channelId].refunds += refunds;

      // Track unique customers per channel
      if (customerId) {
        channelCustomerIds[channelId].add(customerId);
      }
    }
  }

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

  result.uniqueCustomers = globalCustomerIds.size;

  result.ordersPerCustomer = result.uniqueCustomers > 0
    ? result.totalOrders / result.uniqueCustomers
    : 0;

  // Calculate channel-level derived metrics
  for (const channelId of ['glovo', 'ubereats', 'justeat'] as ChannelId[]) {
    const channel = result.byChannel[channelId];
    channel.netRevenue = channel.revenue - channel.refunds;
    channel.uniqueCustomers = channelCustomerIds[channelId].size;
  }

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
    },
  };
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

// ============================================
// HIERARCHY DATA (4 levels: Company → Brand → Address → Channel)
// ============================================

/**
 * Metrics for a hierarchy row
 */
export interface HierarchyMetrics {
  ventas: number;
  ventasChange: number;
  pedidos: number;
  ticketMedio: number;
  nuevosClientes: number;
  porcentajeNuevos: number;
}

/**
 * A single row in the hierarchy table
 */
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

/**
 * Extended order type with new customer flag
 */
interface DbCrpOrderHeadExtended extends DbCrpOrderHead {
  flg_customer_new?: boolean;
}

/**
 * Dimension data structures for hierarchy
 */
interface CompanyDim {
  id: string;  // String for consistent comparisons
  name: string;
}

interface StoreDim {
  id: string;
  name: string;
  companyId: string;  // String for consistent comparisons
}

interface AddressDim {
  id: string;  // pk_id_address - unique, no normalization
  name: string;
  companyId: string;  // String for consistent comparisons
  allIds: string[];   // All IDs that share this normalized address
  storeId?: string;   // Store ID from dimension data (pfk_id_store)
}

interface PortalDim {
  id: string;
  name: string;
}

interface AllDimensions {
  companies: CompanyDim[];
  stores: StoreDim[];
  addresses: AddressDim[];
  portals: PortalDim[];
}

/**
 * Fetch ALL dimension data for selected companies.
 * This builds the complete hierarchy structure regardless of whether there are orders.
 *
 * IMPORTANT: Dimension tables have multiple snapshots per entity (one per month).
 * We deduplicate by keeping only the most recent snapshot (ORDER BY pk_ts_month DESC).
 *
 * @param companyIds - Numeric company IDs for company/store queries (INTEGER columns)
 * @param companyIdsAsStrings - String company IDs for address query (TEXT column in crp_portal__dt_address)
 */
async function fetchAllDimensions(
  companyIds: number[],
  _companyIdsAsStrings: string[]
): Promise<AllDimensions> {
  // Fetch all dimension data in parallel (ordered by pk_ts_month DESC for deduplication)
  // Note: Supabase has a default limit of 1000 rows. We need explicit limits for large datasets.
  const [companiesResult, storesResult, addressesResult, portalsResult] = await Promise.all([
    // Fetch selected companies (include flg_deleted for post-dedup filtering)
    supabase
      .from('crp_portal__dt_company')
      .select('pk_id_company, des_company_name, flg_deleted')
      .in('pk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(10000),

    // Fetch ALL stores for these companies (include flg_deleted for post-dedup filtering)
    supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(10000),

    // Fetch ALL addresses for these companies (include flg_deleted for post-dedup filtering)
    // NOTE: pfk_id_company is INTEGER (same as other dimension tables)
    // NOTE: pfk_id_store does NOT exist in this table - store assignment comes from order data
    supabase
      .from('crp_portal__dt_address')
      .select('pk_id_address, des_address, pfk_id_company, flg_deleted')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(50000),

    // Fetch all portals (include flg_deleted for post-dedup filtering)
    supabase
      .from('crp_portal__dt_portal')
      .select('pk_id_portal, des_portal, flg_deleted')
      .order('pk_ts_month', { ascending: false })
      .limit(100),
  ]);

  // Log any errors from the queries
  if (import.meta.env.DEV) {
    if (companiesResult.error) console.error('[fetchAllDimensions] Companies error:', companiesResult.error);
    if (storesResult.error) console.error('[fetchAllDimensions] Stores error:', storesResult.error);
    if (addressesResult.error) console.error('[fetchAllDimensions] Addresses error:', addressesResult.error);
    if (portalsResult.error) console.error('[fetchAllDimensions] Portals error:', portalsResult.error);
  }

  // Deduplicate and filter deleted using standard pattern (see utils.ts)
  // Data is pre-sorted by pk_ts_month DESC, so first occurrence = most recent snapshot
  const activeCompanies = deduplicateAndFilterDeleted(
    companiesResult.data || [],
    c => String(c.pk_id_company)
  );
  const companies: CompanyDim[] = activeCompanies.map(c => ({
    id: String(c.pk_id_company),
    name: c.des_company_name,
  }));

  const activeStores = deduplicateAndFilterDeleted(
    storesResult.data || [],
    s => String(s.pk_id_store)
  );
  const stores: StoreDim[] = activeStores.map(s => ({
    id: String(s.pk_id_store),
    name: s.des_store,
    companyId: String(s.pfk_id_company),
  }));

  // Each pk_id_address is a unique entity - do NOT merge by street name
  const activeAddresses = deduplicateAndFilterDeleted(
    addressesResult.data || [],
    a => String(a.pk_id_address)
  );
  // NOTE: storeId will be assigned later from order data (buildHierarchyFromRPCMetrics)
  // since pfk_id_store does NOT exist in dt_address table
  const addresses: AddressDim[] = activeAddresses.map(a => ({
    id: String(a.pk_id_address),
    name: a.des_address || '',
    companyId: String(a.pfk_id_company),
    allIds: [String(a.pk_id_address)],
    storeId: undefined, // Will be populated from order data
  }));

  const activePortals = deduplicateAndFilterDeleted(
    portalsResult.data || [],
    p => String(p.pk_id_portal)
  );
  const portals: PortalDim[] = activePortals.map(p => ({
    id: String(p.pk_id_portal),
    name: p.des_portal,
  }));

  return { companies, stores, addresses, portals };
}

/**
 * Build complete hierarchy from dimensions and aggregate orders.
 *
 * BOTTOM-UP AGGREGATION:
 * 1. Portal level: Aggregate directly from orders (most granular)
 * 2. Address level: Sum metrics from child portals
 * 3. Store level: Sum metrics from child addresses
 * 4. Company level: Sum metrics from child stores
 *
 * Derived metrics (ticketMedio, porcentajeNuevos) are calculated AFTER summing base metrics.
 *
 * Hierarchy: Company → Store → Address → Portal
 */
function buildHierarchyFromDimensions(
  dimensions: AllDimensions,
  currentOrders: DbCrpOrderHeadExtended[],
  previousOrders: DbCrpOrderHeadExtended[]
): HierarchyDataRow[] {
  const { companies, stores, addresses, portals } = dimensions;

  // Base metrics structure (before derived calculations)
  interface BaseMetrics {
    ventas: number;
    pedidos: number;
    nuevos: number;
  }

  const createEmptyBase = (): BaseMetrics => ({
    ventas: 0,
    pedidos: 0,
    nuevos: 0,
  });

  // Create empty final metrics
  const emptyMetrics: HierarchyMetrics = {
    ventas: 0,
    ventasChange: 0,
    pedidos: 0,
    ticketMedio: 0,
    nuevosClientes: 0,
    porcentajeNuevos: 0,
  };

  // =====================================================
  // STEP 1: Build address → store mapping from orders
  // =====================================================
  const addressToStoreMap = new Map<string, string>();
  for (const order of currentOrders) {
    const storeId = String(order.pfk_id_store || '');
    const addressId = String(order.pfk_id_store_address || '');
    if (addressId && storeId && !addressToStoreMap.has(addressId)) {
      addressToStoreMap.set(addressId, storeId);
    }
  }
  for (const order of previousOrders) {
    const storeId = String(order.pfk_id_store || '');
    const addressId = String(order.pfk_id_store_address || '');
    if (addressId && storeId && !addressToStoreMap.has(addressId)) {
      addressToStoreMap.set(addressId, storeId);
    }
  }

  // =====================================================
  // STEP 2: Aggregate at PORTAL level (most granular)
  // Key: companyId::storeId::addressId::portalId
  // =====================================================
  const currentByPortal = new Map<string, BaseMetrics>();
  const previousByPortal = new Map<string, BaseMetrics>();

  for (const order of currentOrders) {
    const companyId = order.pfk_id_company;
    const storeId = String(order.pfk_id_store || '');
    const addressId = String(order.pfk_id_store_address || '');
    const portalId = String(order.pfk_id_portal || '');

    if (!companyId || !storeId || !addressId || !portalId) continue;

    const portalKey = `${companyId}::${storeId}::${addressId}::${portalId}`;
    if (!currentByPortal.has(portalKey)) {
      currentByPortal.set(portalKey, createEmptyBase());
    }

    const agg = currentByPortal.get(portalKey)!;
    agg.ventas += order.amt_total_price || 0;
    agg.pedidos += 1;
    if (order.flg_customer_new === true) agg.nuevos += 1;
  }

  for (const order of previousOrders) {
    const companyId = order.pfk_id_company;
    const storeId = String(order.pfk_id_store || '');
    const addressId = String(order.pfk_id_store_address || '');
    const portalId = String(order.pfk_id_portal || '');

    if (!companyId || !storeId || !addressId || !portalId) continue;

    const portalKey = `${companyId}::${storeId}::${addressId}::${portalId}`;
    if (!previousByPortal.has(portalKey)) {
      previousByPortal.set(portalKey, createEmptyBase());
    }

    const agg = previousByPortal.get(portalKey)!;
    agg.ventas += order.amt_total_price || 0;
    agg.pedidos += 1;
    if (order.flg_customer_new === true) agg.nuevos += 1;
  }

  // =====================================================
  // STEP 3: Aggregate ADDRESS level from portals
  // Key: companyId::storeId::addressId
  // =====================================================
  const currentByAddress = new Map<string, BaseMetrics>();
  const previousByAddress = new Map<string, BaseMetrics>();

  for (const [portalKey, metrics] of currentByPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;

    if (!currentByAddress.has(addressKey)) {
      currentByAddress.set(addressKey, createEmptyBase());
    }
    const agg = currentByAddress.get(addressKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [portalKey, metrics] of previousByPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;

    if (!previousByAddress.has(addressKey)) {
      previousByAddress.set(addressKey, createEmptyBase());
    }
    const agg = previousByAddress.get(addressKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // =====================================================
  // STEP 4: Aggregate STORE level from addresses
  // Key: companyId::storeId
  // =====================================================
  const currentByStore = new Map<string, BaseMetrics>();
  const previousByStore = new Map<string, BaseMetrics>();

  for (const [addressKey, metrics] of currentByAddress) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;

    if (!currentByStore.has(storeKey)) {
      currentByStore.set(storeKey, createEmptyBase());
    }
    const agg = currentByStore.get(storeKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [addressKey, metrics] of previousByAddress) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;

    if (!previousByStore.has(storeKey)) {
      previousByStore.set(storeKey, createEmptyBase());
    }
    const agg = previousByStore.get(storeKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // =====================================================
  // STEP 5: Aggregate COMPANY level from stores
  // Key: companyId
  // =====================================================
  const currentByCompany = new Map<string, BaseMetrics>();
  const previousByCompany = new Map<string, BaseMetrics>();

  for (const [storeKey, metrics] of currentByStore) {
    const [companyId] = storeKey.split('::');

    if (!currentByCompany.has(companyId)) {
      currentByCompany.set(companyId, createEmptyBase());
    }
    const agg = currentByCompany.get(companyId)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [storeKey, metrics] of previousByStore) {
    const [companyId] = storeKey.split('::');

    if (!previousByCompany.has(companyId)) {
      previousByCompany.set(companyId, createEmptyBase());
    }
    const agg = previousByCompany.get(companyId)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // =====================================================
  // HELPER: Convert base metrics to final metrics
  // Derived metrics calculated AFTER summing
  // =====================================================
  const toFinalMetrics = (base: BaseMetrics | undefined, prevBase: BaseMetrics | undefined): HierarchyMetrics => {
    if (!base) return emptyMetrics;

    const prevVentas = prevBase?.ventas || 0;

    return {
      ventas: base.ventas,
      ventasChange: prevVentas > 0 ? ((base.ventas - prevVentas) / prevVentas) * 100 : 0,
      pedidos: base.pedidos,
      ticketMedio: base.pedidos > 0 ? base.ventas / base.pedidos : 0,
      nuevosClientes: base.nuevos,
      porcentajeNuevos: base.pedidos > 0 ? (base.nuevos / base.pedidos) * 100 : 0,
    };
  };

  // =====================================================
  // BUILD HIERARCHY ROWS
  // =====================================================
  const rows: HierarchyDataRow[] = [];

  // 1. COMPANY rows
  for (const company of companies) {
    const companyKey = String(company.id);
    const current = currentByCompany.get(companyKey);
    const previous = previousByCompany.get(companyKey);

    rows.push({
      id: `company-${company.id}`,
      level: 'company',
      name: `${company.name} (${company.id})`,
      companyId: companyKey,
      metrics: toFinalMetrics(current, previous),
    });
  }

  // 2. STORE rows
  for (const store of stores) {
    const storeKey = `${store.companyId}::${store.id}`;
    const current = currentByStore.get(storeKey);
    const previous = previousByStore.get(storeKey);
    const storeRowId = `brand::${store.companyId}::${store.id}`;
    rows.push({
      id: storeRowId,
      level: 'brand',
      name: `${store.name} (${store.id})`,
      parentId: `company-${store.companyId}`,
      companyId: String(store.companyId),
      brandId: store.id,
      metrics: toFinalMetrics(current, previous),
    });
  }

  // 3. ADDRESS rows
  // Addresses are now grouped by normalized name, so address.allIds contains all raw IDs
  // For addresses WITH orders: assign to the specific store from orders
  // For addresses WITHOUT orders: assign to ALL stores of that company

  // Helper: Sum metrics from multiple address keys
  const sumMetricsFromAllIds = (
    allIds: string[],
    companyId: string,
    storeId: string,
    metricsMap: Map<string, BaseMetrics>
  ): BaseMetrics => {
    const sum = createEmptyBase();
    for (const addrId of allIds) {
      const key = `${companyId}::${storeId}::${addrId}`;
      const m = metricsMap.get(key);
      if (m) {
        sum.ventas += m.ventas;
        sum.pedidos += m.pedidos;
        sum.nuevos += m.nuevos;
      }
    }
    return sum;
  };

  // Helper: Sum portal metrics from multiple address IDs
  const sumPortalMetricsFromAllIds = (
    allIds: string[],
    companyId: string,
    storeId: string,
    portalId: string,
    metricsMap: Map<string, BaseMetrics>
  ): BaseMetrics => {
    const sum = createEmptyBase();
    for (const addrId of allIds) {
      const key = `${companyId}::${storeId}::${addrId}::${portalId}`;
      const m = metricsMap.get(key);
      if (m) {
        sum.ventas += m.ventas;
        sum.pedidos += m.pedidos;
        sum.nuevos += m.nuevos;
      }
    }
    return sum;
  };

  for (const address of addresses) {
    // Check if ANY of the allIds has a store mapping (meaning it has orders)
    let mappedStoreId: string | undefined;
    for (const addrId of address.allIds) {
      const storeId = addressToStoreMap.get(addrId);
      if (storeId) {
        mappedStoreId = storeId;
        break;
      }
    }

    if (mappedStoreId) {
      // Address has orders → assign to the specific store
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const actualStoreId = parentStore?.id || mappedStoreId;

      // Sum metrics from ALL IDs that belong to this normalized address
      const current = sumMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, currentByAddress);
      const previous = sumMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, previousByAddress);

      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: `${address.name} (${address.id})`,
        parentId,
        companyId: String(address.companyId),
        brandId: parentStore?.id,
        metrics: toFinalMetrics(
          current.pedidos > 0 ? current : undefined,
          previous.pedidos > 0 ? previous : undefined
        ),
      });

      // 4. PORTAL rows for this address
      for (const portal of portals) {
        // Sum portal metrics from ALL IDs
        const portalCurrent = sumPortalMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, portal.id, currentByPortal);
        const portalPrevious = sumPortalMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, portal.id, previousByPortal);
        const channelId = portalIdToChannelId(portal.id);

        rows.push({
          id: `channel::${address.companyId}::${address.id}::${portal.id}`,
          level: 'channel',
          name: `${portal.name} (${portal.id})`,
          parentId: `address::${address.companyId}::${address.id}`,
          companyId: String(address.companyId),
          brandId: parentStore?.id,
          channelId: channelId || undefined,
          metrics: toFinalMetrics(
            portalCurrent.pedidos > 0 ? portalCurrent : undefined,
            portalPrevious.pedidos > 0 ? portalPrevious : undefined
          ),
        });
      }
    } else {
      // Address has NO orders
      // Use address.storeId from dimension data to find parent brand
      if (address.storeId) {
        // Address has a store relationship in dimension data
        const parentStore = stores.find(s => s.id === address.storeId && s.companyId === address.companyId);
        if (parentStore) {
          // Assign to specific brand
          rows.push({
            id: `address::${address.companyId}::${address.id}`,
            level: 'address',
            name: `${address.name} (${address.id})`,
            parentId: `brand::${parentStore.companyId}::${parentStore.id}`,
            companyId: String(address.companyId),
            brandId: parentStore.id,
            metrics: toFinalMetrics(undefined, undefined),
          });

          // PORTAL rows
          for (const portal of portals) {
            const channelId = portalIdToChannelId(portal.id);
            rows.push({
              id: `channel::${address.companyId}::${address.id}::${portal.id}`,
              level: 'channel',
              name: `${portal.name} (${portal.id})`,
              parentId: `address::${address.companyId}::${address.id}`,
              companyId: String(address.companyId),
              brandId: parentStore.id,
              channelId: channelId || undefined,
              metrics: toFinalMetrics(undefined, undefined),
            });
          }
        } else {
          // Store not found, assign directly under company
          rows.push({
            id: `address::${address.companyId}::${address.id}`,
            level: 'address',
            name: `${address.name} (${address.id})`,
            parentId: `company-${address.companyId}`,
            companyId: String(address.companyId),
            brandId: undefined,
            metrics: toFinalMetrics(undefined, undefined),
          });

          // PORTAL rows
          for (const portal of portals) {
            const channelId = portalIdToChannelId(portal.id);
            rows.push({
              id: `channel::${address.companyId}::${address.id}::${portal.id}`,
              level: 'channel',
              name: `${portal.name} (${portal.id})`,
              parentId: `address::${address.companyId}::${address.id}`,
              companyId: String(address.companyId),
              brandId: undefined,
              channelId: channelId || undefined,
              metrics: toFinalMetrics(undefined, undefined),
            });
          }
        }
      } else {
        // No store relationship - assign directly under company
        rows.push({
          id: `address::${address.companyId}::${address.id}`,
          level: 'address',
          name: `${address.name} (${address.id})`,
          parentId: `company-${address.companyId}`,
          companyId: String(address.companyId),
          brandId: undefined,
          metrics: toFinalMetrics(undefined, undefined),
        });

        // PORTAL rows
        for (const portal of portals) {
          const channelId = portalIdToChannelId(portal.id);
          rows.push({
            id: `channel::${address.companyId}::${address.id}::${portal.id}`,
            level: 'channel',
            name: `${portal.name} (${portal.id})`,
            parentId: `address::${address.companyId}::${address.id}`,
            companyId: String(address.companyId),
            brandId: undefined,
            channelId: channelId || undefined,
            metrics: toFinalMetrics(undefined, undefined),
          });
        }
      }
    }
  }

  // Detect duplicate IDs (indicates a bug)
  if (import.meta.env.DEV) {
    const ids = rows.map(r => r.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      console.error('[buildHierarchyFromDimensions] DUPLICATE IDs:', [...new Set(duplicates)]);
    }
  }

  return rows;
}

/**
 * Fetches hierarchy data for the Controlling dashboard.
 *
 * NEW APPROACH:
 * 1. Fetch ALL dimension data for selected companies (not just from orders)
 * 2. Fetch orders for metrics aggregation
 * 3. Build complete hierarchy with all entities (even those with 0 orders)
 *
 * Returns a flat array of rows organized in a 4-level hierarchy:
 * Company → Store → Address → Portal
 *
 * Each row contains metrics: ventas, ventasChange, pedidos, ticketMedio, nuevosClientes, porcentajeNuevos
 *
 * @param params - Query parameters including filters and date range
 * @param previousParams - Parameters for the previous period (for variation calculation)
 * @returns Promise resolving to array of hierarchy rows
 */
export async function fetchHierarchyData(
  params: FetchOrdersParams,
  previousParams: FetchOrdersParams
): Promise<HierarchyDataRow[]> {
  const { companyIds } = params;

  // If no companies, return empty
  if (!companyIds || companyIds.length === 0) {
    return [];
  }

  // Step 1: Fetch ALL dimensions for selected companies (not filtered by orders)
  // This ensures we show all entities even if they have 0 orders
  // Note: companyIds here is number[], need to convert to strings for address query
  const companyIdsAsStrings = companyIds.map(id => String(id));
  const dimensions = await fetchAllDimensions(companyIds, companyIdsAsStrings);

  // Step 2: Fetch orders for both periods
  const [currentOrders, previousOrders] = await Promise.all([
    fetchCrpOrdersRaw(params) as Promise<DbCrpOrderHeadExtended[]>,
    fetchCrpOrdersRaw(previousParams) as Promise<DbCrpOrderHeadExtended[]>,
  ]);

  // Step 3: Build complete hierarchy from dimensions and aggregate orders
  return buildHierarchyFromDimensions(dimensions, currentOrders, previousOrders);
}

// ============================================
// HIERARCHY DATA VIA RPC (Optimized)
// ============================================

/**
 * Base metrics structure for aggregation (before derived calculations)
 */
interface RPCBaseMetrics {
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  reembolsos: number;
}

/**
 * Creates an empty base metrics object for RPC aggregation.
 */
function createEmptyRPCBase(): RPCBaseMetrics {
  return {
    ventas: 0,
    pedidos: 0,
    nuevos: 0,
    descuentos: 0,
    reembolsos: 0,
  };
}

/**
 * Aggregates RPC metrics bottom-up from portal level to company level.
 *
 * BOTTOM-UP AGGREGATION:
 * 1. Portal level: Direct from RPC data (most granular)
 * 2. Address level: Sum metrics from child portals
 * 3. Store level: Sum metrics from child addresses
 * 4. Company level: Sum metrics from child stores
 */
function aggregateRPCMetrics(rows: ControllingMetricsRow[]): {
  byPortal: Map<string, RPCBaseMetrics>;
  byAddress: Map<string, RPCBaseMetrics>;
  byStore: Map<string, RPCBaseMetrics>;
  byCompany: Map<string, RPCBaseMetrics>;
} {
  const byPortal = new Map<string, RPCBaseMetrics>();
  const byAddress = new Map<string, RPCBaseMetrics>();
  const byStore = new Map<string, RPCBaseMetrics>();
  const byCompany = new Map<string, RPCBaseMetrics>();

  // Step 1: Aggregate at PORTAL level (most granular)
  // Key: companyId::storeId::addressId::portalId
  for (const row of rows) {
    const portalKey = `${row.pfk_id_company}::${row.pfk_id_store}::${row.pfk_id_store_address}::${row.pfk_id_portal}`;

    if (!byPortal.has(portalKey)) {
      byPortal.set(portalKey, createEmptyRPCBase());
    }

    const agg = byPortal.get(portalKey)!;
    agg.ventas += row.ventas || 0;
    agg.pedidos += row.pedidos || 0;
    agg.nuevos += row.nuevos || 0;
    agg.descuentos += row.descuentos || 0;
    agg.reembolsos += row.reembolsos || 0;
  }

  // Step 2: Aggregate ADDRESS level from portals
  // Key: companyId::storeId::addressId
  for (const [portalKey, metrics] of byPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;

    if (!byAddress.has(addressKey)) {
      byAddress.set(addressKey, createEmptyRPCBase());
    }

    const agg = byAddress.get(addressKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
    agg.descuentos += metrics.descuentos;
    agg.reembolsos += metrics.reembolsos;
  }

  // Step 3: Aggregate STORE level from addresses
  // Key: companyId::storeId
  for (const [addressKey, metrics] of byAddress) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;

    if (!byStore.has(storeKey)) {
      byStore.set(storeKey, createEmptyRPCBase());
    }

    const agg = byStore.get(storeKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
    agg.descuentos += metrics.descuentos;
    agg.reembolsos += metrics.reembolsos;
  }

  // Step 4: Aggregate COMPANY level from stores
  // Key: companyId
  for (const [storeKey, metrics] of byStore) {
    const [companyId] = storeKey.split('::');

    if (!byCompany.has(companyId)) {
      byCompany.set(companyId, createEmptyRPCBase());
    }

    const agg = byCompany.get(companyId)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
    agg.descuentos += metrics.descuentos;
    agg.reembolsos += metrics.reembolsos;
  }

  return { byPortal, byAddress, byStore, byCompany };
}

/**
 * Builds hierarchy rows from dimensions and RPC-aggregated metrics.
 *
 * Hierarchy: Company → Store → Address → Portal
 */
function buildHierarchyFromRPCMetrics(
  dimensions: AllDimensions,
  currentAgg: ReturnType<typeof aggregateRPCMetrics>,
  previousAgg: ReturnType<typeof aggregateRPCMetrics>
): HierarchyDataRow[] {
  const { companies, stores, addresses, portals } = dimensions;

  // Helper: Convert base metrics to final metrics
  // Derived metrics calculated AFTER summing
  const toFinalMetrics = (
    base: RPCBaseMetrics | undefined,
    prevBase: RPCBaseMetrics | undefined
  ): HierarchyMetrics => {
    const emptyMetrics: HierarchyMetrics = {
      ventas: 0,
      ventasChange: 0,
      pedidos: 0,
      ticketMedio: 0,
      nuevosClientes: 0,
      porcentajeNuevos: 0,
    };

    if (!base) return emptyMetrics;

    const prevVentas = prevBase?.ventas || 0;

    return {
      ventas: base.ventas,
      ventasChange: prevVentas > 0 ? ((base.ventas - prevVentas) / prevVentas) * 100 : 0,
      pedidos: base.pedidos,
      ticketMedio: base.pedidos > 0 ? base.ventas / base.pedidos : 0,
      nuevosClientes: base.nuevos,
      porcentajeNuevos: base.pedidos > 0 ? (base.nuevos / base.pedidos) * 100 : 0,
    };
  };

  // Build address → store mapping from RPC data
  // Key: addressId (pfk_id_store_address from orders = pk_id_address from dt_address)
  // Value: storeId
  const addressToStoreMap = new Map<string, string>();
  for (const [portalKey] of currentAgg.byPortal) {
    const [, storeId, addressId] = portalKey.split('::');
    if (addressId && storeId && !addressToStoreMap.has(addressId)) {
      addressToStoreMap.set(addressId, storeId);
    }
  }
  for (const [portalKey] of previousAgg.byPortal) {
    const [, storeId, addressId] = portalKey.split('::');
    if (addressId && storeId && !addressToStoreMap.has(addressId)) {
      addressToStoreMap.set(addressId, storeId);
    }
  }

  // DEBUG: Log address-to-store mapping
  if (import.meta.env.DEV) {
    console.log('[buildHierarchyFromRPCMetrics] Address-to-store mapping size:', addressToStoreMap.size);
    console.log('[buildHierarchyFromRPCMetrics] Addresses in dimensions:', addresses.length);
    // Show addresses with storeId from dimension table
    const addressesWithStoreId = addresses.filter(a => a.storeId);
    console.log('[buildHierarchyFromRPCMetrics] Addresses with storeId in dimension:', addressesWithStoreId.length);
  }

  const rows: HierarchyDataRow[] = [];

  // 1. COMPANY rows
  for (const company of companies) {
    const companyKey = String(company.id);
    const current = currentAgg.byCompany.get(companyKey);
    const previous = previousAgg.byCompany.get(companyKey);

    rows.push({
      id: `company-${company.id}`,
      level: 'company',
      name: `${company.name} (${company.id})`,
      companyId: companyKey,
      metrics: toFinalMetrics(current, previous),
    });
  }

  // 2. STORE rows
  for (const store of stores) {
    const storeKey = `${store.companyId}::${store.id}`;
    const current = currentAgg.byStore.get(storeKey);
    const previous = previousAgg.byStore.get(storeKey);

    rows.push({
      id: `brand::${store.companyId}::${store.id}`,
      level: 'brand',
      name: `${store.name} (${store.id})`,
      parentId: `company-${store.companyId}`,
      companyId: String(store.companyId),
      brandId: store.id,
      metrics: toFinalMetrics(current, previous),
    });
  }

  // 3. ADDRESS rows
  // Priority for store assignment:
  // 1. Use storeId from order data (addressToStoreMap) if available
  // 2. Fall back to storeId from dimension table (address.storeId)
  // 3. If neither, assign to first store of the company
  for (const address of addresses) {
    // Try to get storeId from order data first, then from dimension table
    const mappedStoreId = addressToStoreMap.get(address.id) || address.storeId;

    if (mappedStoreId) {
      // Address has a known store assignment
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      // Get metrics for this specific address - try both possible key formats
      const addressKey = `${address.companyId}::${mappedStoreId}::${address.id}`;
      const current = currentAgg.byAddress.get(addressKey);
      const previous = previousAgg.byAddress.get(addressKey);

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: `${address.name} (${address.id})`,
        parentId,
        companyId: address.companyId,
        brandId: parentStore?.id,
        metrics: toFinalMetrics(current, previous),
      });

      // PORTAL rows for this address
      for (const portal of portals) {
        const portalKey = `${address.companyId}::${mappedStoreId}::${address.id}::${portal.id}`;
        const portalCurrent = currentAgg.byPortal.get(portalKey);
        const portalPrevious = previousAgg.byPortal.get(portalKey);
        const channelId = portalIdToChannelId(portal.id);

        // Only add portal row if it has metrics
        if (portalCurrent || portalPrevious) {
          rows.push({
            id: `channel::${address.companyId}::${address.id}::${portal.id}`,
            level: 'channel',
            name: `${portal.name} (${portal.id})`,
            parentId: `address::${address.companyId}::${address.id}`,
            companyId: address.companyId,
            brandId: parentStore?.id,
            channelId: channelId || undefined,
            metrics: toFinalMetrics(portalCurrent, portalPrevious),
          });
        }
      }
    } else {
      // Address has NO store assignment → assign to first store of its company (if exists)
      const companyStores = stores.filter(s => s.companyId === address.companyId);

      if (companyStores.length > 0) {
        // Add address under the first store of the company (avoiding duplicates)
        const firstStore = companyStores[0];
        rows.push({
          id: `address::${address.companyId}::${address.id}`,
          level: 'address',
          name: `${address.name} (${address.id})`,
          parentId: `brand::${firstStore.companyId}::${firstStore.id}`,
          companyId: address.companyId,
          brandId: firstStore.id,
          metrics: toFinalMetrics(undefined, undefined),
        });
      } else {
        // No stores for this company, add under company directly
        rows.push({
          id: `address::${address.companyId}::${address.id}`,
          level: 'address',
          name: `${address.name} (${address.id})`,
          parentId: `company-${address.companyId}`,
          companyId: address.companyId,
          metrics: toFinalMetrics(undefined, undefined),
        });
      }
    }
  }

  return rows;
}

/**
 * Fetches hierarchy data for the Controlling dashboard using the RPC function.
 *
 * OPTIMIZED APPROACH using get_controlling_metrics RPC:
 * 1. Fetch ALL dimension data for selected companies (for names)
 * 2. Call RPC twice (current + previous period) to get pre-aggregated metrics
 * 3. Build hierarchy aggregating bottom-up (portal → address → store → company)
 *
 * Returns a flat array of rows organized in a 4-level hierarchy:
 * Company → Store → Address → Portal
 *
 * @param companyIds - Array of company IDs (as strings)
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param previousStartDate - Previous period start date (YYYY-MM-DD)
 * @param previousEndDate - Previous period end date (YYYY-MM-DD)
 * @returns Promise resolving to array of hierarchy rows
 */
export async function fetchHierarchyDataRPC(
  companyIds: string[],
  startDate: string,
  endDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<HierarchyDataRow[]> {
  // If no companies, return empty
  if (!companyIds || companyIds.length === 0) {
    return [];
  }

  // Convert to numeric IDs for dimension fetch (company/store tables use INTEGER)
  // Keep original string IDs for address table (uses TEXT for pfk_id_company)
  const numericCompanyIds = companyIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

  // Step 1: Fetch ALL dimensions for selected companies (for names)
  const dimensions = await fetchAllDimensions(numericCompanyIds, companyIds);

  // DEBUG: Log dimensions counts
  if (import.meta.env.DEV) {
    console.log('[fetchHierarchyDataRPC] Dimensions loaded:', {
      companies: dimensions.companies.length,
      stores: dimensions.stores.length,
      addresses: dimensions.addresses.length,
      portals: dimensions.portals.length,
    });
    if (dimensions.addresses.length > 0) {
      console.log('[fetchHierarchyDataRPC] Sample addresses:', dimensions.addresses.slice(0, 3));
    }
  }

  // Step 2: Fetch metrics from RPC for both periods in parallel
  const [currentMetrics, previousMetrics] = await Promise.all([
    fetchControllingMetricsRPC(companyIds, startDate, endDate),
    fetchControllingMetricsRPC(companyIds, previousStartDate, previousEndDate),
  ]);

  // DEBUG: Log metrics counts
  if (import.meta.env.DEV) {
    console.log('[fetchHierarchyDataRPC] Metrics loaded:', {
      currentMetrics: currentMetrics.length,
      previousMetrics: previousMetrics.length,
    });
    if (currentMetrics.length > 0) {
      console.log('[fetchHierarchyDataRPC] Sample metrics:', currentMetrics.slice(0, 3));
    }
  }

  // Step 3: Aggregate metrics bottom-up
  const currentAgg = aggregateRPCMetrics(currentMetrics);
  const previousAgg = aggregateRPCMetrics(previousMetrics);

  // DEBUG: Log aggregation counts
  if (import.meta.env.DEV) {
    console.log('[fetchHierarchyDataRPC] Aggregation results:', {
      byPortal: currentAgg.byPortal.size,
      byAddress: currentAgg.byAddress.size,
      byStore: currentAgg.byStore.size,
      byCompany: currentAgg.byCompany.size,
    });
    // Log sample keys to understand the format
    if (currentAgg.byAddress.size > 0) {
      const sampleAddressKeys = Array.from(currentAgg.byAddress.keys()).slice(0, 3);
      console.log('[fetchHierarchyDataRPC] Sample address keys:', sampleAddressKeys);
    }
  }

  // Step 4: Build complete hierarchy from dimensions and aggregated metrics
  const result = buildHierarchyFromRPCMetrics(dimensions, currentAgg, previousAgg);

  // DEBUG: Log hierarchy result breakdown
  if (import.meta.env.DEV) {
    const levelCounts = result.reduce((acc, row) => {
      acc[row.level] = (acc[row.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[fetchHierarchyDataRPC] Hierarchy rows by level:', levelCounts);
  }

  return result;
}
