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
  id: number;
  name: string;
}

interface StoreDim {
  id: string;
  name: string;
  companyId: number;
}

interface AddressDim {
  id: string;
  name: string;
  companyId: number;
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
 */
async function fetchAllDimensions(companyIds: number[]): Promise<AllDimensions> {
  // Fetch all dimension data in parallel (ordered by pk_ts_month DESC for deduplication)
  const [companiesResult, storesResult, addressesResult, portalsResult] = await Promise.all([
    // Fetch selected companies
    supabase
      .from('crp_portal__dt_company')
      .select('pk_id_company, des_company_name')
      .in('pk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false }),

    // Fetch ALL stores for these companies
    supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false }),

    // Fetch ALL addresses for these companies
    supabase
      .from('crp_portal__dt_address')
      .select('pk_id_address, des_address, pfk_id_company')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false }),

    // Fetch all portals
    supabase
      .from('crp_portal__dt_portal')
      .select('pk_id_portal, des_portal')
      .order('pk_ts_month', { ascending: false }),
  ]);

  // Deduplicate companies by ID (keeping most recent snapshot)
  const companyMap = new Map<number, CompanyDim>();
  for (const c of companiesResult.data || []) {
    const companyId = c.pk_id_company;
    if (!companyMap.has(companyId)) {
      companyMap.set(companyId, {
        id: companyId,
        name: c.des_company_name,
      });
    }
  }
  const companies = Array.from(companyMap.values());

  // Deduplicate stores by ID (keeping most recent snapshot)
  const storeMap = new Map<string, StoreDim>();
  for (const s of storesResult.data || []) {
    const storeId = String(s.pk_id_store);
    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        id: storeId,
        name: s.des_store,
        companyId: s.pfk_id_company,
      });
    }
  }
  const stores = Array.from(storeMap.values());

  // Deduplicate addresses by ID (keeping most recent snapshot)
  const addressMap = new Map<string, AddressDim>();
  for (const a of addressesResult.data || []) {
    const addressId = String(a.pk_id_address);
    if (!addressMap.has(addressId)) {
      addressMap.set(addressId, {
        id: addressId,
        name: a.des_address,
        companyId: a.pfk_id_company,
      });
    }
  }
  const addresses = Array.from(addressMap.values());

  // Deduplicate portals by ID (keeping most recent snapshot)
  const portalMap = new Map<string, PortalDim>();
  for (const p of portalsResult.data || []) {
    const portalId = String(p.pk_id_portal);
    if (!portalMap.has(portalId)) {
      portalMap.set(portalId, {
        id: portalId,
        name: p.des_portal,
      });
    }
  }
  const portals = Array.from(portalMap.values());

  if (import.meta.env.DEV) {
    console.log('[fetchAllDimensions] Raw counts:',
      'companies:', companiesResult.data?.length || 0,
      'stores:', storesResult.data?.length || 0,
      'addresses:', addressesResult.data?.length || 0,
      'portals:', portalsResult.data?.length || 0
    );
    console.log('[fetchAllDimensions] After dedup:',
      'companies:', companies.length,
      'stores:', stores.length,
      'addresses:', addresses.length,
      'portals:', portals.length
    );

  }

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

  if (import.meta.env.DEV) {
    console.log('[buildHierarchyFromDimensions] Building hierarchy from:',
      'companies:', companies.length,
      'stores:', stores.length,
      'addresses:', addresses.length,
      'portals:', portals.length
    );
  }

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
  // For addresses WITH orders: assign to the specific store from orders
  // For addresses WITHOUT orders: assign to ALL stores of that company
  for (const address of addresses) {
    const mappedStoreId = addressToStoreMap.get(address.id);

    if (mappedStoreId) {
      // Address has orders → assign to the specific store
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const actualStoreId = parentStore?.id || mappedStoreId;

      const addressKey = `${address.companyId}::${actualStoreId}::${address.id}`;
      const current = currentByAddress.get(addressKey);
      const previous = previousByAddress.get(addressKey);

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
        metrics: toFinalMetrics(current, previous),
      });

      // 4. PORTAL rows for this address
      for (const portal of portals) {
        const portalKey = `${address.companyId}::${actualStoreId}::${address.id}::${portal.id}`;
        const portalCurrent = currentByPortal.get(portalKey);
        const portalPrevious = previousByPortal.get(portalKey);
        const channelId = portalIdToChannelId(portal.id);

        rows.push({
          id: `channel::${address.companyId}::${address.id}::${portal.id}`,
          level: 'channel',
          name: `${portal.name} (${portal.id})`,
          parentId: `address::${address.companyId}::${address.id}`,
          companyId: String(address.companyId),
          brandId: parentStore?.id,
          channelId: channelId || undefined,
          metrics: toFinalMetrics(portalCurrent, portalPrevious),
        });
      }
    } else {
      // Address has NO orders → assign to ALL stores of that company
      const companyStores = stores.filter(s => s.companyId === address.companyId);

      if (companyStores.length === 0) {
        // No stores for this company, assign directly under company
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
      } else {
        // Assign to ALL stores of this company
        for (const store of companyStores) {
          const addressRowId = `address::${address.companyId}::${store.id}::${address.id}`;

          rows.push({
            id: addressRowId,
            level: 'address',
            name: `${address.name} (${address.id})`,
            parentId: `brand::${store.companyId}::${store.id}`,
            companyId: String(address.companyId),
            brandId: store.id,
            metrics: toFinalMetrics(undefined, undefined), // No orders = 0 metrics
          });

          // PORTAL rows for each store-address combination
          for (const portal of portals) {
            const channelId = portalIdToChannelId(portal.id);
            rows.push({
              id: `channel::${address.companyId}::${store.id}::${address.id}::${portal.id}`,
              level: 'channel',
              name: `${portal.name} (${portal.id})`,
              parentId: addressRowId,
              companyId: String(address.companyId),
              brandId: store.id,
              channelId: channelId || undefined,
              metrics: toFinalMetrics(undefined, undefined),
            });
          }
        }
      }
    }
  }

  if (import.meta.env.DEV) {
    const companyRows = rows.filter(r => r.level === 'company').length;
    const brandRows = rows.filter(r => r.level === 'brand').length;
    const addressRows = rows.filter(r => r.level === 'address').length;
    const channelRows = rows.filter(r => r.level === 'channel').length;
    console.log(`[buildHierarchyFromDimensions] Total rows: ${rows.length} (company: ${companyRows}, brand: ${brandRows}, address: ${addressRows}, channel: ${channelRows})`);

    // Check for duplicate IDs
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
  const dimensions = await fetchAllDimensions(companyIds);

  // Step 2: Fetch orders for both periods
  const [currentOrders, previousOrders] = await Promise.all([
    fetchCrpOrdersRaw(params) as Promise<DbCrpOrderHeadExtended[]>,
    fetchCrpOrdersRaw(previousParams) as Promise<DbCrpOrderHeadExtended[]>,
  ]);

  if (import.meta.env.DEV) {
    console.log('[fetchHierarchyData] Dimensions:',
      'companies:', dimensions.companies.length,
      'stores:', dimensions.stores.length,
      'addresses:', dimensions.addresses.length,
      'portals:', dimensions.portals.length
    );
    console.log('[fetchHierarchyData] Orders:',
      'current:', currentOrders.length,
      'previous:', previousOrders.length
    );
  }

  // Step 3: Build complete hierarchy from dimensions and aggregate orders
  return buildHierarchyFromDimensions(dimensions, currentOrders, previousOrders);
}
