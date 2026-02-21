/**
 * CRP Portal Hierarchy Service
 *
 * Provides hierarchy data (Company -> Brand -> Address -> Channel) for the
 * Controlling dashboard. Supports two approaches:
 *
 * 1. **Raw orders** (`fetchHierarchyData`): Downloads raw orders and aggregates client-side.
 *    Slower but works without RPC functions.
 *
 * 2. **RPC optimized** (`fetchHierarchyDataRPC`): Uses `get_controlling_metrics` RPC
 *    for server-side aggregation. Much faster for large datasets.
 *
 * ## Data Flow (RPC approach)
 *
 * ```
 * fetchAllDimensions() → company/store/address/portal names
 *        +
 * fetchControllingMetricsRPC() × 2 (current + previous)
 *        ↓
 * aggregateRPCMetrics() → bottom-up aggregation
 *        ↓
 * buildHierarchyFromRPCMetrics() → flat HierarchyDataRow[]
 * ```
 *
 * @module services/crp-portal/hierarchy
 */

import { supabase } from '../supabase';
import type { DbCrpOrderHead } from './types';
import type { ChannelId } from '@/types';
import { deduplicateAndFilterDeleted } from './utils';
import { fetchCrpOrdersRaw, portalIdToChannelId, fetchControllingMetricsRPC } from './orders';
import type { FetchOrdersParams, ControllingMetricsRow } from './orders';

// ============================================
// TYPES
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
  adSpent: number;
  adRevenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  adOrders: number;
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

// ============================================
// DIMENSION TYPES
// ============================================

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

// ============================================
// FETCH DIMENSIONS
// ============================================

/**
 * Fetch ALL dimension data for selected companies.
 * This builds the complete hierarchy structure regardless of whether there are orders.
 *
 * IMPORTANT: Dimension tables have multiple snapshots per entity (one per month).
 * We deduplicate by keeping only the most recent snapshot (ORDER BY pk_ts_month DESC).
 *
 * @param companyIds - Numeric company IDs for company/store queries (INTEGER columns)
 */
async function fetchAllDimensions(
  companyIds: string[]
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

// ============================================
// BUILD HIERARCHY FROM RAW ORDERS
// ============================================

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
 * Hierarchy: Company -> Store -> Address -> Portal
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
    adSpent: 0,
    adRevenue: 0,
    roas: 0,
    impressions: 0,
    clicks: 0,
    adOrders: 0,
  };

  // =====================================================
  // STEP 1: Build address -> store mapping from orders
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
      adSpent: 0,     // Raw orders path doesn't have ads data
      adRevenue: 0,
      roas: 0,
      impressions: 0,
      clicks: 0,
      adOrders: 0,
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
      // Address has orders -> assign to the specific store
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

// ============================================
// RPC AGGREGATION HELPERS
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
  adSpent: number;
  adRevenue: number;
  impressions: number;
  clicks: number;
  adOrders: number;
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
    adSpent: 0,
    adRevenue: 0,
    impressions: 0,
    clicks: 0,
    adOrders: 0,
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
    agg.adSpent += row.ad_spent || 0;
    agg.adRevenue += row.ad_revenue || 0;
    agg.impressions += row.impressions || 0;
    agg.clicks += row.clicks || 0;
    agg.adOrders += row.ad_orders || 0;
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
    agg.adSpent += metrics.adSpent;
    agg.adRevenue += metrics.adRevenue;
    agg.impressions += metrics.impressions;
    agg.clicks += metrics.clicks;
    agg.adOrders += metrics.adOrders;
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
    agg.adSpent += metrics.adSpent;
    agg.adRevenue += metrics.adRevenue;
    agg.impressions += metrics.impressions;
    agg.clicks += metrics.clicks;
    agg.adOrders += metrics.adOrders;
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
    agg.adSpent += metrics.adSpent;
    agg.adRevenue += metrics.adRevenue;
    agg.impressions += metrics.impressions;
    agg.clicks += metrics.clicks;
    agg.adOrders += metrics.adOrders;
  }

  return { byPortal, byAddress, byStore, byCompany };
}

// ============================================
// BUILD HIERARCHY FROM RPC METRICS
// ============================================

/**
 * Builds hierarchy rows from dimensions and RPC-aggregated metrics.
 *
 * Hierarchy: Company -> Store -> Address -> Portal
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
      adSpent: 0,
      adRevenue: 0,
      roas: 0,
      impressions: 0,
      clicks: 0,
      adOrders: 0,
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
      adSpent: base.adSpent,
      adRevenue: base.adRevenue,
      roas: base.adSpent > 0 ? base.adRevenue / base.adSpent : 0,
      impressions: base.impressions,
      clicks: base.clicks,
      adOrders: base.adOrders,
    };
  };

  // Build address -> store mapping from RPC data
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
      // Address has NO store assignment -> assign to first store of its company (if exists)
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

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetches hierarchy data for the Controlling dashboard.
 *
 * NEW APPROACH:
 * 1. Fetch ALL dimension data for selected companies (not just from orders)
 * 2. Fetch orders for metrics aggregation
 * 3. Build complete hierarchy with all entities (even those with 0 orders)
 *
 * Returns a flat array of rows organized in a 4-level hierarchy:
 * Company -> Store -> Address -> Portal
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

  // Step 3: Build complete hierarchy from dimensions and aggregate orders
  return buildHierarchyFromDimensions(dimensions, currentOrders, previousOrders);
}

/**
 * Fetches hierarchy data for the Controlling dashboard using the RPC function.
 *
 * OPTIMIZED APPROACH using get_controlling_metrics RPC:
 * 1. Fetch ALL dimension data for selected companies (for names)
 * 2. Call RPC twice (current + previous period) to get pre-aggregated metrics
 * 3. Build hierarchy aggregating bottom-up (portal -> address -> store -> company)
 *
 * Returns a flat array of rows organized in a 4-level hierarchy:
 * Company -> Store -> Address -> Portal
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

  // Step 1: Fetch ALL dimensions for selected companies (for names)
  const dimensions = await fetchAllDimensions(companyIds);

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

  if (import.meta.env.DEV) {
    const levelCounts = result.reduce((acc, row) => {
      acc[row.level] = (acc[row.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[fetchHierarchyDataRPC] Hierarchy rows by level:', levelCounts);
  }

  return result;
}
