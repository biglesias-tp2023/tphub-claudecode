/**
 * Hierarchy Builder — Dimension fetching and raw-order hierarchy construction.
 *
 * @module services/crp-portal/hierarchyBuilder
 */

import { supabase } from '../supabase';
import type { DbCrpOrderHead } from './types';
import { deduplicateAndFilterDeleted, deduplicateBy } from './utils';
import { portalIdToChannelId } from './orders';
import type { HierarchyMetrics, HierarchyDataRow } from './hierarchy';

// ============================================
// DIMENSION TYPES
// ============================================

export interface CompanyDim {
  id: string;
  name: string;
}

export interface StoreDim {
  id: string;
  name: string;
  companyId: string;
  deleted?: boolean;
}

export interface AddressDim {
  id: string;
  name: string;
  companyId: string;
  allIds: string[];
  storeId?: string;
  deleted?: boolean;
}

export interface PortalDim {
  id: string;
  name: string;
}

export interface AllDimensions {
  companies: CompanyDim[];
  stores: StoreDim[];
  addresses: AddressDim[];
  portals: PortalDim[];
}

interface DbCrpOrderHeadExtended extends DbCrpOrderHead {
  flg_customer_new?: boolean;
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
export async function fetchAllDimensions(
  companyIds: string[]
): Promise<AllDimensions> {
  const [companiesResult, storesResult, addressesResult, portalsResult] = await Promise.all([
    supabase
      .from('crp_portal__dt_company')
      .select('pk_id_company, des_company_name, flg_deleted')
      .in('pk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(10000),

    supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(10000),

    supabase
      .from('crp_portal__dt_address')
      .select('pk_id_address, des_address, pfk_id_company, flg_deleted')
      .in('pfk_id_company', companyIds)
      .order('pk_ts_month', { ascending: false })
      .limit(50000),

    supabase
      .from('crp_portal__dt_portal')
      .select('pk_id_portal, des_portal, flg_deleted')
      .order('pk_ts_month', { ascending: false })
      .limit(100),
  ]);

  if (import.meta.env.DEV) {
    if (companiesResult.error) console.error('[fetchAllDimensions] Companies error:', companiesResult.error);
    if (storesResult.error) console.error('[fetchAllDimensions] Stores error:', storesResult.error);
    if (addressesResult.error) console.error('[fetchAllDimensions] Addresses error:', addressesResult.error);
    if (portalsResult.error) console.error('[fetchAllDimensions] Portals error:', portalsResult.error);
  }

  const activeCompanies = deduplicateAndFilterDeleted(
    companiesResult.data || [],
    c => String(c.pk_id_company)
  );
  const companies: CompanyDim[] = activeCompanies.map(c => ({
    id: String(c.pk_id_company),
    name: c.des_company_name,
  }));

  // For stores/addresses/portals: use deduplicateBy (keep deleted entries too)
  // because deleted dimensions may still have orders in the selected period
  // and we need them for the hierarchy to sum correctly.
  const uniqueStores = deduplicateBy(
    storesResult.data || [],
    s => String(s.pk_id_store)
  );
  const stores: StoreDim[] = uniqueStores.map(s => ({
    id: String(s.pk_id_store),
    name: s.des_store,
    companyId: String(s.pfk_id_company),
    deleted: s.flg_deleted === 1,
  }));

  const uniqueAddresses = deduplicateBy(
    addressesResult.data || [],
    a => String(a.pk_id_address)
  );
  const addresses: AddressDim[] = uniqueAddresses.map(a => ({
    id: String(a.pk_id_address),
    name: a.des_address || '',
    companyId: String(a.pfk_id_company),
    allIds: [String(a.pk_id_address)],
    storeId: undefined,
    deleted: a.flg_deleted === 1,
  }));

  const uniquePortals = deduplicateBy(
    portalsResult.data || [],
    p => String(p.pk_id_portal)
  );
  const portals: PortalDim[] = uniquePortals.map(p => ({
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
 */
export function buildHierarchyFromDimensions(
  dimensions: AllDimensions,
  currentOrders: DbCrpOrderHeadExtended[],
  previousOrders: DbCrpOrderHeadExtended[]
): HierarchyDataRow[] {
  const { companies, stores, addresses, portals } = dimensions;

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

  const emptyMetrics: HierarchyMetrics = {
    ventas: 0, ventasChange: 0, pedidos: 0, ticketMedio: 0,
    nuevosClientes: 0, porcentajeNuevos: 0, descuentos: 0,
    promotedOrders: 0, adSpent: 0, adRevenue: 0, roas: 0,
    impressions: 0, clicks: 0, adOrders: 0,
    ratingGlovo: 0, reviewsGlovo: 0, ratingUber: 0, reviewsUber: 0,
  };

  // STEP 1: Build address -> store mapping from orders
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

  // STEP 2: Aggregate at PORTAL level
  const currentByPortal = new Map<string, BaseMetrics>();
  const previousByPortal = new Map<string, BaseMetrics>();

  for (const order of currentOrders) {
    const companyId = order.pfk_id_company;
    const storeId = String(order.pfk_id_store || '');
    const addressId = String(order.pfk_id_store_address || '');
    const portalId = String(order.pfk_id_portal || '');
    if (!companyId || !storeId || !addressId || !portalId) continue;

    const portalKey = `${companyId}::${storeId}::${addressId}::${portalId}`;
    if (!currentByPortal.has(portalKey)) currentByPortal.set(portalKey, createEmptyBase());
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
    if (!previousByPortal.has(portalKey)) previousByPortal.set(portalKey, createEmptyBase());
    const agg = previousByPortal.get(portalKey)!;
    agg.ventas += order.amt_total_price || 0;
    agg.pedidos += 1;
    if (order.flg_customer_new === true) agg.nuevos += 1;
  }

  // STEP 3: Aggregate ADDRESS level from portals
  const currentByAddress = new Map<string, BaseMetrics>();
  const previousByAddress = new Map<string, BaseMetrics>();

  for (const [portalKey, metrics] of currentByPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;
    if (!currentByAddress.has(addressKey)) currentByAddress.set(addressKey, createEmptyBase());
    const agg = currentByAddress.get(addressKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [portalKey, metrics] of previousByPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;
    if (!previousByAddress.has(addressKey)) previousByAddress.set(addressKey, createEmptyBase());
    const agg = previousByAddress.get(addressKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // STEP 4: Aggregate STORE level from addresses
  const currentByStore = new Map<string, BaseMetrics>();
  const previousByStore = new Map<string, BaseMetrics>();

  for (const [addressKey, metrics] of currentByAddress) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;
    if (!currentByStore.has(storeKey)) currentByStore.set(storeKey, createEmptyBase());
    const agg = currentByStore.get(storeKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [addressKey, metrics] of previousByStore) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;
    if (!previousByStore.has(storeKey)) previousByStore.set(storeKey, createEmptyBase());
    const agg = previousByStore.get(storeKey)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // STEP 5: Aggregate COMPANY level from stores
  const currentByCompany = new Map<string, BaseMetrics>();
  const previousByCompany = new Map<string, BaseMetrics>();

  for (const [storeKey, metrics] of currentByStore) {
    const [companyId] = storeKey.split('::');
    if (!currentByCompany.has(companyId)) currentByCompany.set(companyId, createEmptyBase());
    const agg = currentByCompany.get(companyId)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  for (const [storeKey, metrics] of previousByStore) {
    const [companyId] = storeKey.split('::');
    if (!previousByCompany.has(companyId)) previousByCompany.set(companyId, createEmptyBase());
    const agg = previousByCompany.get(companyId)!;
    agg.ventas += metrics.ventas;
    agg.pedidos += metrics.pedidos;
    agg.nuevos += metrics.nuevos;
  }

  // HELPER: Convert base metrics to final metrics
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
      descuentos: 0, promotedOrders: 0, adSpent: 0, adRevenue: 0, roas: 0,
      impressions: 0, clicks: 0, adOrders: 0,
      ratingGlovo: 0, reviewsGlovo: 0, ratingUber: 0, reviewsUber: 0,
    };
  };

  // BUILD HIERARCHY ROWS
  const rows: HierarchyDataRow[] = [];

  // 1. COMPANY rows
  for (const company of companies) {
    const companyKey = String(company.id);
    rows.push({
      id: `company-${company.id}`,
      level: 'company',
      name: company.name,
      companyId: companyKey,
      metrics: toFinalMetrics(currentByCompany.get(companyKey), previousByCompany.get(companyKey)),
    });
  }

  // 2. STORE rows
  for (const store of stores) {
    const storeKey = `${store.companyId}::${store.id}`;
    rows.push({
      id: `brand::${store.companyId}::${store.id}`,
      level: 'brand',
      name: store.name,
      parentId: `company-${store.companyId}`,
      companyId: String(store.companyId),
      brandId: store.id,
      metrics: toFinalMetrics(currentByStore.get(storeKey), previousByStore.get(storeKey)),
    });
  }

  // Helpers for multi-ID address metrics
  const sumMetricsFromAllIds = (
    allIds: string[], companyId: string, storeId: string,
    metricsMap: Map<string, BaseMetrics>
  ): BaseMetrics => {
    const sum = createEmptyBase();
    for (const addrId of allIds) {
      const m = metricsMap.get(`${companyId}::${storeId}::${addrId}`);
      if (m) { sum.ventas += m.ventas; sum.pedidos += m.pedidos; sum.nuevos += m.nuevos; }
    }
    return sum;
  };

  const sumPortalMetricsFromAllIds = (
    allIds: string[], companyId: string, storeId: string,
    portalId: string, metricsMap: Map<string, BaseMetrics>
  ): BaseMetrics => {
    const sum = createEmptyBase();
    for (const addrId of allIds) {
      const m = metricsMap.get(`${companyId}::${storeId}::${addrId}::${portalId}`);
      if (m) { sum.ventas += m.ventas; sum.pedidos += m.pedidos; sum.nuevos += m.nuevos; }
    }
    return sum;
  };

  // 3. ADDRESS rows + 4. PORTAL rows
  for (const address of addresses) {
    let mappedStoreId: string | undefined;
    for (const addrId of address.allIds) {
      const storeId = addressToStoreMap.get(addrId);
      if (storeId) { mappedStoreId = storeId; break; }
    }

    if (mappedStoreId) {
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const actualStoreId = parentStore?.id || mappedStoreId;
      const current = sumMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, currentByAddress);
      const previous = sumMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, previousByAddress);
      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: address.name,
        parentId,
        companyId: String(address.companyId),
        brandId: parentStore?.id,
        metrics: toFinalMetrics(
          current.pedidos > 0 ? current : undefined,
          previous.pedidos > 0 ? previous : undefined
        ),
      });

      for (const portal of portals) {
        const portalCurrent = sumPortalMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, portal.id, currentByPortal);
        const portalPrevious = sumPortalMetricsFromAllIds(address.allIds, address.companyId, actualStoreId, portal.id, previousByPortal);
        const channelId = portalIdToChannelId(portal.id);
        rows.push({
          id: `channel::${address.companyId}::${address.id}::${portal.id}`,
          level: 'channel',
          name: portal.name,
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
      // Address has NO orders — assign to store from dimension data or company directly
      const parentStoreId = address.storeId;
      const parentStore = parentStoreId
        ? stores.find(s => s.id === parentStoreId && s.companyId === address.companyId)
        : undefined;
      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: address.name,
        parentId,
        companyId: String(address.companyId),
        brandId: parentStore?.id,
        metrics: toFinalMetrics(undefined, undefined),
      });

      for (const portal of portals) {
        const channelId = portalIdToChannelId(portal.id);
        rows.push({
          id: `channel::${address.companyId}::${address.id}::${portal.id}`,
          level: 'channel',
          name: portal.name,
          parentId: `address::${address.companyId}::${address.id}`,
          companyId: String(address.companyId),
          brandId: parentStore?.id,
          channelId: channelId || undefined,
          metrics: toFinalMetrics(undefined, undefined),
        });
      }
    }
  }

  if (import.meta.env.DEV) {
    const ids = rows.map(r => r.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      console.error('[buildHierarchyFromDimensions] DUPLICATE IDs:', [...new Set(duplicates)]);
    }
  }

  return rows;
}
