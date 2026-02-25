/**
 * CRP Portal Products Service
 *
 * Fetches product data from crp_portal__ft_order_line for use in campaign configuration.
 * Products are filtered by company and portal (platform) to ensure only relevant products
 * are shown for each promotion type.
 *
 * @module services/crp-portal/products
 */

import { supabase } from '../supabase';
import type { CampaignPlatform } from '@/types';
import { handleCrpError } from './errors';

// ============================================
// CONSTANTS
// ============================================

/**
 * Portal IDs para order_line
 *
 * GLOVO tiene DOS IDs debido al cambio de plataforma/scrapper:
 * - 'E22BC362'   → Glovo antiguo (original)
 * - 'E22BC362-2' → Glovo nuevo (post-migración)
 *
 * No hay solapamiento temporal, por lo que consultamos ambos
 * para tener el histórico completo de productos.
 */
const ORDER_LINE_PORTAL_IDS = {
  GLOVO: ['E22BC362', 'E22BC362-2'], // Ambos: antiguo + nuevo
  UBEREATS: ['3CCD6861'],
} as const;

// ============================================
// TYPES
// ============================================

export interface CrpProduct {
  id: string;
  name: string;
  price: number;
}

interface DbProductRow {
  pk_id_product: string;
  des_product: string;
  amt_unit_price: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Get the portal IDs for a given platform (for order_line table)
 *
 * Returns an array of IDs because Glovo has two sources (antiguo + nuevo).
 */
function getPortalIdsForPlatform(platform: CampaignPlatform): string[] | null {
  switch (platform) {
    case 'glovo':
      return [...ORDER_LINE_PORTAL_IDS.GLOVO];
    case 'ubereats':
      return [...ORDER_LINE_PORTAL_IDS.UBEREATS];
    case 'justeat':
      // JustEat portal ID pending
      return null;
    default:
      return null;
  }
}

// ============================================
// DATA FUNCTIONS
// ============================================

interface FetchProductsParams {
  /** Company ID (pfk_id_company from crp_portal) */
  companyId: string | number;
  /** Platform to filter products by */
  platform: CampaignPlatform;
  /** Optional restaurant/address ID to further filter.
   * Use 'all' or omit to get products from all addresses for the company */
  addressId?: string;
  /** Optional array of address IDs to filter products from multiple specific addresses */
  addressIds?: string[];
  /** Search term for filtering by product name */
  search?: string;
  /** Limit number of results */
  limit?: number;
}

/**
 * Fetch unique products for a company and platform.
 *
 * Products are fetched from crp_portal__ft_order_line and deduplicated by pk_id_product.
 * Only products that have been sold on the specified platform are returned.
 *
 * When addressId is 'all' or not provided, products from all addresses are aggregated.
 * When addressIds array is provided, products from those specific addresses are aggregated.
 */
export async function fetchCrpProducts(params: FetchProductsParams): Promise<CrpProduct[]> {
  // Note: addressId and addressIds are kept for future use but not currently used
  const { companyId, platform, search, limit = 100 } = params;

  const portalIds = getPortalIdsForPlatform(platform);
  if (!portalIds || portalIds.length === 0) {
    return [];
  }

  // Query to get unique products with their most recent price
  // We use a subquery to get distinct products
  // IMPORTANT: All ID columns are VARCHAR in the database, so we must ensure string values
  // NOTE: crp_portal__ft_order_line table does NOT have pfk_id_store_address column,
  // so we cannot filter by address. Products are filtered by company and portal only.
  let query = supabase
    .from('crp_portal__ft_order_line')
    .select('pk_id_product, des_product, amt_unit_price')
    .eq('pfk_id_company', String(companyId))
    .in('pfk_id_portal', portalIds)
    .not('pk_id_product', 'is', null)
    .not('des_product', 'is', null)
    .order('des_product', { ascending: true });

  // NOTE: Address filtering removed - crp_portal__ft_order_line doesn't have address column
  // Products are aggregated from all addresses for the company/portal combination
  // The addressId/addressIds parameters are kept in the interface for potential future use

  // Filter by search term
  if (search) {
    query = query.ilike('des_product', `%${search}%`);
  }

  // Limit results
  query = query.limit(limit * 5); // Fetch more to account for duplicates

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching products: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Deduplicate by pk_id_product, keeping the most recent entry (first one due to ordering)
  const productMap = new Map<string, CrpProduct>();

  for (const row of data as DbProductRow[]) {
    if (!productMap.has(row.pk_id_product)) {
      productMap.set(row.pk_id_product, {
        id: row.pk_id_product,
        name: row.des_product,
        price: row.amt_unit_price,
      });
    }
  }

  // Convert to array and limit
  const products = Array.from(productMap.values());

  // Sort alphabetically by name
  products.sort((a, b) => a.name.localeCompare(b.name));

  return products.slice(0, limit);
}

/**
 * Fetch products by their IDs
 */
export async function fetchCrpProductsByIds(
  productIds: string[],
  companyId: string | number,
  platform: CampaignPlatform
): Promise<CrpProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const portalIds = getPortalIdsForPlatform(platform);
  if (!portalIds || portalIds.length === 0) {
    return [];
  }

  // IMPORTANT: pfk_id_company is VARCHAR in the database, so we must ensure string value
  const { data, error } = await supabase
    .from('crp_portal__ft_order_line')
    .select('pk_id_product, des_product, amt_unit_price')
    .eq('pfk_id_company', String(companyId))
    .in('pfk_id_portal', portalIds)
    .in('pk_id_product', productIds)
    .limit(productIds.length * 3);

  if (error) {
    handleCrpError('fetchCrpProductsByIds', error);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Deduplicate
  const productMap = new Map<string, CrpProduct>();

  for (const row of data as DbProductRow[]) {
    if (!productMap.has(row.pk_id_product)) {
      productMap.set(row.pk_id_product, {
        id: row.pk_id_product,
        name: row.des_product,
        price: row.amt_unit_price,
      });
    }
  }

  return Array.from(productMap.values());
}
