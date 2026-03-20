/**
 * CRP Portal Products Service
 *
 * Fetches product catalog from crp_portal__dt_product (dimension table)
 * and enriches with sales ranking from crp_portal__ft_order_line.
 *
 * Products with most units sold in the last 30 days get tags:
 * - Top 3: "top_venta"
 * - Positions 4-6: "populares"
 *
 * @module services/crp-portal/products
 */

import { supabase } from '../supabase';
import type { CampaignPlatform } from '@/types';
import { handleCrpError } from './errors';

// ============================================
// CONSTANTS
// ============================================

const ORDER_LINE_PORTAL_IDS = {
  GLOVO: ['E22BC362-2'],
  UBEREATS: ['3CCD6861'],
} as const;

// ============================================
// TYPES
// ============================================

export type ProductSalesTag = 'top_venta' | 'populares' | null;

export interface CrpProduct {
  id: string;
  name: string;
  price: number;
  /** Sales tag based on last 30 days ranking */
  salesTag: ProductSalesTag;
  /** Total units sold in last 30 days (0 if no sales data) */
  unitsSold: number;
}

interface DbCatalogRow {
  pk_id_product: string;
  des_product: string;
}

// ============================================
// HELPERS
// ============================================

function getPortalIdsForPlatform(platform: CampaignPlatform): string[] | null {
  switch (platform) {
    case 'glovo':
      return [...ORDER_LINE_PORTAL_IDS.GLOVO];
    case 'ubereats':
      return [...ORDER_LINE_PORTAL_IDS.UBEREATS];
    case 'justeat':
      // JustEat portal ID pending — products still show from catalog
      return null;
    default:
      return null;
  }
}

// ============================================
// DATA FUNCTIONS
// ============================================

interface FetchProductsParams {
  companyId: string | number;
  platform: CampaignPlatform;
  addressId?: string;
  addressIds?: string[];
  search?: string;
  limit?: number;
}

/**
 * Fetch products for a company with sales ranking.
 *
 * 1. Reads product catalog from dt_product (latest month snapshot, active)
 * 2. Fetches sales data from ft_order_line (last 30 days, platform-filtered)
 * 3. Enriches products with salesTag (top_venta / populares / null)
 */
export async function fetchCrpProducts(params: FetchProductsParams): Promise<CrpProduct[]> {
  const { companyId, platform, search, limit = 200 } = params;
  const companyStr = String(companyId);

  // --- 1) Fetch product catalog from dt_product ---
  let catalogQuery = supabase
    .from('crp_portal__dt_product')
    .select('pk_id_product, des_product')
    .eq('pfk_id_company', companyStr)
    .eq('flg_deleted', 0)
    .not('des_product', 'is', null)
    .order('des_product', { ascending: true });

  if (search) {
    catalogQuery = catalogQuery.ilike('des_product', `%${search}%`);
  }

  // Get latest month snapshot only — order by pk_ts_month desc and deduplicate
  catalogQuery = catalogQuery.order('pk_ts_month', { ascending: false }).limit(limit * 3);

  const { data: catalogData, error: catalogError } = await catalogQuery;

  if (catalogError) {
    throw new Error(`Error fetching product catalog: ${catalogError.message}`);
  }

  if (!catalogData || catalogData.length === 0) {
    return [];
  }

  // Deduplicate by product ID (keep first = latest month)
  const catalogMap = new Map<string, DbCatalogRow>();
  for (const row of catalogData as DbCatalogRow[]) {
    if (!catalogMap.has(row.pk_id_product)) {
      catalogMap.set(row.pk_id_product, row);
    }
  }

  // --- 2) Fetch sales data from ft_order_line (last 30 days) ---
  const portalIds = getPortalIdsForPlatform(platform);
  const salesMap = new Map<string, { totalQty: number; price: number }>();

  if (portalIds && portalIds.length > 0) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    // Get product IDs from catalog to filter sales
    const productIds = Array.from(catalogMap.keys());

    // Fetch in batches if needed (Supabase IN limit)
    const batchSize = 200;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);

      const { data: salesData, error: salesError } = await supabase
        .from('crp_portal__ft_order_line')
        .select('pk_id_product, amt_unit_price, val_quantity')
        .eq('pfk_id_company', companyStr)
        .in('pfk_id_portal', portalIds)
        .in('pk_id_product', batch)
        .gte('td_updated_at', since)
        .not('pk_id_product', 'is', null);

      if (salesError) {
        console.warn('Error fetching sales data:', salesError.message);
        break;
      }

      if (salesData) {
        for (const row of salesData as Array<{ pk_id_product: string; amt_unit_price: number; val_quantity: number }>) {
          const existing = salesMap.get(row.pk_id_product);
          const qty = row.val_quantity ?? 1;
          if (existing) {
            existing.totalQty += qty;
            // Keep latest price
            if (row.amt_unit_price > 0) existing.price = row.amt_unit_price;
          } else {
            salesMap.set(row.pk_id_product, {
              totalQty: qty,
              price: row.amt_unit_price ?? 0,
            });
          }
        }
      }
    }
  }

  // --- 3) Build ranked product list ---
  // Sort by sales volume to determine tags
  const salesRanking = Array.from(salesMap.entries())
    .sort((a, b) => b[1].totalQty - a[1].totalQty);

  const tagMap = new Map<string, ProductSalesTag>();
  salesRanking.forEach(([productId], index) => {
    if (index < 3) tagMap.set(productId, 'top_venta');
    else if (index < 6) tagMap.set(productId, 'populares');
  });

  // --- 4) Merge catalog + sales into final products ---
  const products: CrpProduct[] = [];

  for (const [productId, catalogRow] of catalogMap) {
    const sales = salesMap.get(productId);
    products.push({
      id: productId,
      name: catalogRow.des_product,
      price: sales?.price ?? 0,
      salesTag: tagMap.get(productId) || null,
      unitsSold: sales?.totalQty ?? 0,
    });
  }

  // Sort: tagged products first (top_venta → populares → rest alphabetically)
  products.sort((a, b) => {
    const tagOrder = { top_venta: 0, populares: 1 } as Record<string, number>;
    const aOrder = a.salesTag ? tagOrder[a.salesTag] ?? 2 : 2;
    const bOrder = b.salesTag ? tagOrder[b.salesTag] ?? 2 : 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    // Within same tag group, sort by units sold desc, then name
    if (a.unitsSold !== b.unitsSold) return b.unitsSold - a.unitsSold;
    return a.name.localeCompare(b.name);
  });

  return products.slice(0, limit);
}

/**
 * Fetch products by their IDs (for review step display)
 */
export async function fetchCrpProductsByIds(
  productIds: string[],
  companyId: string | number,
  _platform: CampaignPlatform
): Promise<CrpProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('crp_portal__dt_product')
    .select('pk_id_product, des_product')
    .eq('pfk_id_company', String(companyId))
    .in('pk_id_product', productIds)
    .eq('flg_deleted', 0)
    .order('pk_ts_month', { ascending: false })
    .limit(productIds.length * 3);

  if (error) {
    handleCrpError('fetchCrpProductsByIds', error);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Deduplicate (latest month first)
  const productMap = new Map<string, CrpProduct>();
  for (const row of data as DbCatalogRow[]) {
    if (!productMap.has(row.pk_id_product)) {
      productMap.set(row.pk_id_product, {
        id: row.pk_id_product,
        name: row.des_product,
        price: 0,
        salesTag: null,
        unitsSold: 0,
      });
    }
  }

  return Array.from(productMap.values());
}
