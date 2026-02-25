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
}

function createEmptyRPCBase(): RPCBaseMetrics {
  return {
    ventas: 0, pedidos: 0, nuevos: 0, descuentos: 0, reembolsos: 0,
    promotedOrders: 0, adSpent: 0, adRevenue: 0,
    impressions: 0, clicks: 0, adOrders: 0,
    glovoRatingSum: 0, glovoReviews: 0, uberRatingSum: 0, uberReviews: 0,
  };
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
  }

  // Helper to accumulate metrics
  const addMetrics = (target: RPCBaseMetrics, source: RPCBaseMetrics) => {
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
  };

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
      metrics: toFinalMetrics(currentAgg.byStore.get(storeKey), previousAgg.byStore.get(storeKey)),
    });
  }

  // 3. ADDRESS rows
  for (const address of addresses) {
    const mappedStoreId = addressToStoreMap.get(address.id) || address.storeId;

    if (mappedStoreId) {
      const parentStore = stores.find(s => s.id === mappedStoreId && s.companyId === address.companyId);
      const parentId = parentStore
        ? `brand::${parentStore.companyId}::${parentStore.id}`
        : `company-${address.companyId}`;

      const addressKey = `${address.companyId}::${mappedStoreId}::${address.id}`;
      rows.push({
        id: `address::${address.companyId}::${address.id}`,
        level: 'address',
        name: address.name,
        parentId,
        companyId: address.companyId,
        brandId: parentStore?.id,
        metrics: toFinalMetrics(currentAgg.byAddress.get(addressKey), previousAgg.byAddress.get(addressKey)),
      });

      // PORTAL rows
      for (const portal of portals) {
        const portalKey = `${address.companyId}::${mappedStoreId}::${address.id}::${portal.id}`;
        const portalCurrent = currentAgg.byPortal.get(portalKey);
        const portalPrevious = previousAgg.byPortal.get(portalKey);
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
