/**
 * CRP Portal Product Sales Service
 *
 * Fetches aggregated product sales data via the `get_product_sales` RPC.
 * Used by the Products Analysis page for ranking products by revenue/quantity.
 *
 * @module services/crp-portal/productSales
 */

import { supabase } from '../supabase';
import { handleCrpError } from './errors';
import { PORTAL_IDS } from './types';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface ProductSalesRow {
  productId: string;
  productName: string;
  unitPrice: number;
  totalQuantity: number;
  totalRevenue: number;
  /** Fraction of orders with this product that had promotions (0-1) */
  promoOrderRatio: number;
}

export interface FetchProductSalesParams {
  companyIds: string[];
  brandIds?: string[];
  addressIds?: string[];
  portalIds?: string[];
  startDate: string;
  endDate: string;
  limit?: number;
}

// ============================================
// HELPERS
// ============================================

const CHANNELS_WITH_DATA: ChannelId[] = ['glovo', 'ubereats'];

function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO];
    case 'ubereats':
      return [PORTAL_IDS.UBEREATS];
    case 'justeat':
      return [];
    default:
      return [];
  }
}

/**
 * Convert channelIds to portalIds for RPC filtering.
 * Returns null if all channels with data are selected (no filter needed).
 */
export function channelIdsToPortalIds(channelIds: ChannelId[]): string[] | null {
  if (channelIds.length === 0) return null;
  const hasAllChannelsWithData = CHANNELS_WITH_DATA.every((ch) => channelIds.includes(ch));
  if (hasAllChannelsWithData) return null;
  return channelIds.flatMap(channelIdToPortalIds);
}

// ============================================
// RPC TYPES
// ============================================

interface RpcProductSalesRow {
  product_id: string;
  product_name: string;
  unit_price: number;
  total_quantity: number;
  total_revenue: number;
  promo_order_ratio: number;
}

// ============================================
// DATA FUNCTION
// ============================================

/**
 * Fetch aggregated product sales from the `get_product_sales` RPC.
 *
 * Returns product-level totals: quantity, revenue, and latest unit price.
 * Results are ordered by total_revenue DESC.
 */
export async function fetchProductSales(
  params: FetchProductSalesParams
): Promise<ProductSalesRow[]> {
  const { companyIds, brandIds, addressIds, portalIds, startDate, endDate, limit } = params;

  if (companyIds.length === 0) return [];

  const { data, error } = await supabase.rpc('get_product_sales', {
    p_company_ids: companyIds,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_portal_ids: portalIds && portalIds.length > 0 ? portalIds : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
    p_limit: limit ?? 100,
  });

  if (error) {
    handleCrpError('fetchProductSales', error);
  }

  if (!data || data.length === 0) return [];

  return (data as RpcProductSalesRow[]).map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    unitPrice: Number(row.unit_price) || 0,
    totalQuantity: Number(row.total_quantity) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    promoOrderRatio: Number(row.promo_order_ratio) || 0,
  }));
}
