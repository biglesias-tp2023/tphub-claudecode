/**
 * Hierarchy Aggregators — RPC metrics aggregation and hierarchy construction.
 *
 * @module services/crp-portal/hierarchyAggregators
 */

import { portalIdToChannelId } from './orders';
import type { ControllingMetricsRow } from './orders';
import type { HierarchyMetrics, HierarchyDataRow } from './hierarchy';
import type { AllDimensions } from './hierarchyBuilder';

// ============================================
// RPC AGGREGATION
// ============================================

/**
 * Base metrics structure for aggregation (before derived calculations)
 */
export interface RPCBaseMetrics {
  ventas: number;
  pedidos: number;
  nuevos: number;
  descuentos: number;
  reembolsos: number;
  promotedOrders: number;
  adSpent: number;
  adRevenue: number;
  impressions: number;
  clicks: number;
  adOrders: number;
  glovoRatingSum: number;
  glovoReviews: number;
  uberRatingSum: number;
  uberReviews: number;
  deliveryTimeSum: number;
  deliveryTimeCount: number;
}

function createEmptyRPCBase(): RPCBaseMetrics {
  return {
    ventas: 0, pedidos: 0, nuevos: 0, descuentos: 0, reembolsos: 0,
    promotedOrders: 0, adSpent: 0, adRevenue: 0,
    impressions: 0, clicks: 0, adOrders: 0,
    glovoRatingSum: 0, glovoReviews: 0, uberRatingSum: 0, uberReviews: 0,
    deliveryTimeSum: 0, deliveryTimeCount: 0,
  };
}

function addMetrics(target: RPCBaseMetrics, source: RPCBaseMetrics) {
  target.ventas += source.ventas;
  target.pedidos += source.pedidos;
  target.nuevos += source.nuevos;
  target.descuentos += source.descuentos;
  target.reembolsos += source.reembolsos;
  target.promotedOrders += source.promotedOrders;
  target.adSpent += source.adSpent;
  target.adRevenue += source.adRevenue;
  target.impressions += source.impressions;
  target.clicks += source.clicks;
  target.adOrders += source.adOrders;
  target.glovoRatingSum += source.glovoRatingSum;
  target.glovoReviews += source.glovoReviews;
  target.uberRatingSum += source.uberRatingSum;
  target.uberReviews += source.uberReviews;
  target.deliveryTimeSum += source.deliveryTimeSum;
  target.deliveryTimeCount += source.deliveryTimeCount;
}

export interface AggregatedRPCMetrics {
  byPortal: Map<string, RPCBaseMetrics>;
  byAddress: Map<string, RPCBaseMetrics>;
  byStore: Map<string, RPCBaseMetrics>;
  byCompany: Map<string, RPCBaseMetrics>;
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
export function aggregateRPCMetrics(rows: ControllingMetricsRow[]): AggregatedRPCMetrics {
  const byPortal = new Map<string, RPCBaseMetrics>();
  const byAddress = new Map<string, RPCBaseMetrics>();
  const byStore = new Map<string, RPCBaseMetrics>();
  const byCompany = new Map<string, RPCBaseMetrics>();

  // Step 1: Portal level
  for (const row of rows) {
    const portalKey = `${row.pfk_id_company}::${row.pfk_id_store}::${row.pfk_id_store_address}::${row.pfk_id_portal}`;
    if (!byPortal.has(portalKey)) byPortal.set(portalKey, createEmptyRPCBase());

    const agg = byPortal.get(portalKey)!;
    agg.ventas += row.ventas || 0;
    agg.pedidos += row.pedidos || 0;
    agg.nuevos += row.nuevos || 0;
    agg.descuentos += row.descuentos || 0;
    agg.reembolsos += row.reembolsos || 0;
    agg.promotedOrders += row.promoted_orders || 0;
    agg.adSpent += row.ad_spent || 0;
    agg.adRevenue += row.ad_revenue || 0;
    agg.impressions += row.impressions || 0;
    agg.clicks += row.clicks || 0;
    agg.adOrders += row.ad_orders || 0;

    const isGlovo = row.pfk_id_portal === 'E22BC362' || row.pfk_id_portal === 'E22BC362-2';
    const isUber = row.pfk_id_portal === '3CCD6861';
    const avgRating = row.avg_rating || 0;
    const totalReviews = row.total_reviews || 0;

    if (isGlovo) {
      agg.glovoRatingSum += avgRating * totalReviews;
      agg.glovoReviews += totalReviews;
    } else if (isUber) {
      agg.uberRatingSum += avgRating * totalReviews;
      agg.uberReviews += totalReviews;
    }

    const avgDeliveryTime = row.avg_delivery_time || 0;
    const deliveryTimeCount = row.delivery_time_count || 0;
    agg.deliveryTimeSum += avgDeliveryTime * deliveryTimeCount;
    agg.deliveryTimeCount += deliveryTimeCount;
  }

  // Step 2: Address level from portals
  for (const [portalKey, metrics] of byPortal) {
    const [companyId, storeId, addressId] = portalKey.split('::');
    const addressKey = `${companyId}::${storeId}::${addressId}`;
    if (!byAddress.has(addressKey)) byAddress.set(addressKey, createEmptyRPCBase());
    addMetrics(byAddress.get(addressKey)!, metrics);
  }

  // Step 3: Store level from addresses
  for (const [addressKey, metrics] of byAddress) {
    const [companyId, storeId] = addressKey.split('::');
    const storeKey = `${companyId}::${storeId}`;
    if (!byStore.has(storeKey)) byStore.set(storeKey, createEmptyRPCBase());
    addMetrics(byStore.get(storeKey)!, metrics);
  }

  // Step 4: Company level from stores
  for (const [storeKey, metrics] of byStore) {
    const [companyId] = storeKey.split('::');
    if (!byCompany.has(companyId)) byCompany.set(companyId, createEmptyRPCBase());
    addMetrics(byCompany.get(companyId)!, metrics);
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
export function buildHierarchyFromRPCMetrics(
  dimensions: AllDimensions,
  currentAgg: AggregatedRPCMetrics,
  previousAgg: AggregatedRPCMetrics
): HierarchyDataRow[] {
  const { companies, stores, addresses, portals } = dimensions;

  const toFinalMetrics = (
    base: RPCBaseMetrics | undefined,
    prevBase: RPCBaseMetrics | undefined
  ): HierarchyMetrics => {
    const emptyMetrics: HierarchyMetrics = {
      ventas: 0, ventasChange: 0, pedidos: 0, ticketMedio: 0,
      nuevosClientes: 0, porcentajeNuevos: 0, descuentos: 0,
      promotedOrders: 0, adSpent: 0, adRevenue: 0, roas: 0,
      impressions: 0, clicks: 0, adOrders: 0,
      ratingGlovo: 0, reviewsGlovo: 0, ratingUber: 0, reviewsUber: 0,
      avgDeliveryTime: 0,
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
      descuentos: base.descuentos,
      promotedOrders: base.promotedOrders,
      adSpent: base.adSpent,
      adRevenue: base.adRevenue,
      roas: base.adSpent > 0 ? base.adRevenue / base.adSpent : 0,
      impressions: base.impressions,
      clicks: base.clicks,
      adOrders: base.adOrders,
      ratingGlovo: base.glovoReviews > 0 ? base.glovoRatingSum / base.glovoReviews : 0,
      reviewsGlovo: base.glovoReviews,
      ratingUber: base.uberReviews > 0 ? base.uberRatingSum / base.uberReviews : 0,
      reviewsUber: base.uberReviews,
      avgDeliveryTime: base.deliveryTimeCount > 0 ? base.deliveryTimeSum / base.deliveryTimeCount : 0,
    };
  };

  // Build address -> store mapping from RPC data
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
    console.debug('[buildHierarchyFromRPCMetrics] addressToStoreMap:', addressToStoreMap.size, '/ addresses:', addresses.length);
  }

  const rows: HierarchyDataRow[] = [];

  // 1. COMPANY rows
  for (const company of companies) {
    const companyKey = String(company.id);
    rows.push({
      id: `company-${company.id}`,
      level: 'company',
      name: company.name,
      companyId: companyKey,
      metrics: toFinalMetrics(currentAgg.byCompany.get(companyKey), previousAgg.byCompany.get(companyKey)),
    });
  }

  // 2. STORE rows — skip deleted with no data
  for (const store of stores) {
    const storeKey = `${store.companyId}::${store.id}`;
    const currentStoreMetrics = currentAgg.byStore.get(storeKey);
    const previousStoreMetrics = previousAgg.byStore.get(storeKey);
    if (store.deleted && !currentStoreMetrics && !previousStoreMetrics) continue;

    rows.push({
      id: `brand::${store.companyId}::${store.id}`,
      level: 'brand',
      name: store.name,
      parentId: `company-${store.companyId}`,
      companyId: String(store.companyId),
      brandId: store.id,
      metrics: toFinalMetrics(currentStoreMetrics, previousStoreMetrics),
    });
  }

  // Helper to sum RPCBaseMetrics from multiple address IDs
  const sumAddressMetrics = (
    allIds: string[], companyId: string, storeId: string,
    agg: AggregatedRPCMetrics
  ): RPCBaseMetrics | undefined => {
    let result: RPCBaseMetrics | undefined;
    for (const addrId of allIds) {
      const m = agg.byAddress.get(`${companyId}::${storeId}::${addrId}`);
      if (m) {
        if (!result) result = createEmptyRPCBase();
        addMetrics(result, m);
      }
    }
    return result;
  };

  const sumPortalMetrics = (
    allIds: string[], companyId: string, storeId: string, portalId: string,
    agg: AggregatedRPCMetrics
  ): RPCBaseMetrics | undefined => {
    let result: RPCBaseMetrics | undefined;
    for (const addrId of allIds) {
      const m = agg.byPortal.get(`${companyId}::${storeId}::${addrId}::${portalId}`);
      if (m) {
        if (!result) result = createEmptyRPCBase();
        addMetrics(result, m);
      }
    }
    return result;
  };

  // 3. ADDRESS rows — skip deleted with no data
  for (const address of addresses) {
    // Try all allIds to find mapped store
    let mappedStoreId: string | undefined;
    for (const addrId of address.allIds) {
      const storeId = addressToStoreMap.get(addrId);
      if (storeId) { mappedStoreId = storeId; break; }
    }
    if (!mappedStoreId) mappedStoreId = address.storeId;

    if (mappedStoreId) {
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      const currentAddrMetrics = sumAddressMetrics(address.allIds, address.companyId, mappedStoreId, currentAgg);
      const previousAddrMetrics = sumAddressMetrics(address.allIds, address.companyId, mappedStoreId, previousAgg);

      if (address.deleted && !currentAddrMetrics && !previousAddrMetrics) continue;

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: address.name,
        parentId,
        companyId: address.companyId,
        brandId: parentStore?.id,
        metrics: toFinalMetrics(currentAddrMetrics, previousAddrMetrics),
      });

      // PORTAL rows
      for (const portal of portals) {
        const portalCurrent = sumPortalMetrics(address.allIds, address.companyId, mappedStoreId, portal.id, currentAgg);
        const portalPrevious = sumPortalMetrics(address.allIds, address.companyId, mappedStoreId, portal.id, previousAgg);
        const channelId = portalIdToChannelId(portal.id);

        if (portalCurrent || portalPrevious) {
          rows.push({
            id: `channel::${address.companyId}::${address.id}::${portal.id}`,
            level: 'channel',
            name: portal.name,
            parentId: `address::${address.companyId}::${address.id}`,
            companyId: address.companyId,
            brandId: parentStore?.id,
            channelId: channelId || undefined,
            metrics: toFinalMetrics(portalCurrent, portalPrevious),
          });
        }
      }
    } else {
      // No mapped store — skip deleted addresses entirely (they have no data)
      if (address.deleted) continue;

      const companyStores = stores.filter(s => s.companyId === address.companyId);
      const firstStore = companyStores.length > 0 ? companyStores[0] : undefined;
      const parentId = firstStore
        ? `brand::${firstStore.companyId}::${firstStore.id}`
        : `company-${address.companyId}`;

      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: address.name,
        parentId,
        companyId: address.companyId,
        brandId: firstStore?.id,
        metrics: toFinalMetrics(undefined, undefined),
      });
    }
  }

  return rows;
}
