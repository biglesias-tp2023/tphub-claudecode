/**
 * Brand Channels Service
 *
 * Fetches active channels (portals) for brands and restaurants from order data.
 * This service queries the fact table (ft_order_head) to determine which channels
 * have orders for each brand/restaurant, since the dimensional tables don't have
 * this information.
 *
 * @module services/crp-portal/brand-channels
 */

import { supabase } from '../supabase';
import { PORTAL_IDS } from './types';
import type { ChannelId } from '@/types';

/**
 * Maps portal ID from database to ChannelId.
 * Both Glovo IDs (original and new) map to 'glovo'.
 */
function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO || portalId === PORTAL_IDS.GLOVO_NEW) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  // JUSTEAT pending
  return null;
}

/**
 * Fetches active channels for each brand based on order history using pagination.
 * Only considers orders from the last 90 days for efficiency.
 *
 * NOTE: Uses pagination to bypass Supabase's server-side max_rows limit (default 1000).
 *
 * @param companyIds - Optional array of company IDs to filter by
 * @returns Map of brand ID to array of channel IDs with orders
 *
 * @example
 * const channelMap = await fetchBrandActiveChannels([1, 2]);
 * // Map { "123" => ["glovo", "ubereats"], "456" => ["glovo"] }
 */
export async function fetchBrandActiveChannels(
  companyIds?: number[]
): Promise<Map<string, ChannelId[]>> {
  // Only last 90 days for efficiency
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  // Use pagination to fetch all data (bypasses Supabase's server-side max_rows limit)
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 100; // Safety limit to prevent runaway pagination
  const allData: { pfk_id_store: string; pfk_id_portal: string }[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < MAX_PAGES) {
    let query = supabase
      .from('crp_portal__ft_order_head')
      .select('pfk_id_store, pfk_id_portal')
      .gte('td_creation_time', cutoffDate.toISOString())
      .lte('td_creation_time', now.toISOString());

    if (companyIds?.length) {
      query = query.in('pfk_id_company', companyIds);
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as { pfk_id_store: string; pfk_id_portal: string }[]));
      offset += PAGE_SIZE;
      pageCount++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  // Group by brand, collecting unique channels
  const channelMap = new Map<string, Set<ChannelId>>();
  for (const row of allData) {
    const brandId = String(row.pfk_id_store);
    const channelId = portalIdToChannelId(row.pfk_id_portal);
    if (channelId) {
      if (!channelMap.has(brandId)) channelMap.set(brandId, new Set());
      channelMap.get(brandId)!.add(channelId);
    }
  }

  // Convert Set to Array
  const result = new Map<string, ChannelId[]>();
  for (const [brandId, channels] of channelMap) {
    result.set(brandId, Array.from(channels));
  }
  return result;
}

/**
 * Fetches active channels for each restaurant (address) based on order history using pagination.
 * Only considers orders from the last 90 days for efficiency.
 *
 * NOTE: Uses pagination to bypass Supabase's server-side max_rows limit (default 1000).
 *
 * @param companyIds - Optional array of company IDs to filter by
 * @returns Map of restaurant ID to array of channel IDs with orders
 *
 * @example
 * const channelMap = await fetchRestaurantActiveChannels([1, 2]);
 * // Map { "789" => ["glovo"], "012" => ["ubereats", "glovo"] }
 */
export async function fetchRestaurantActiveChannels(
  companyIds?: number[]
): Promise<Map<string, ChannelId[]>> {
  // Only last 90 days for efficiency
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  // Use pagination to fetch all data (bypasses Supabase's server-side max_rows limit)
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 100; // Safety limit to prevent runaway pagination
  const allData: { pfk_id_store_address: string; pfk_id_portal: string }[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < MAX_PAGES) {
    let query = supabase
      .from('crp_portal__ft_order_head')
      .select('pfk_id_store_address, pfk_id_portal')
      .gte('td_creation_time', cutoffDate.toISOString())
      .lte('td_creation_time', now.toISOString());

    if (companyIds?.length) {
      query = query.in('pfk_id_company', companyIds);
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as { pfk_id_store_address: string; pfk_id_portal: string }[]));
      offset += PAGE_SIZE;
      pageCount++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  // Group by restaurant (address), collecting unique channels
  const channelMap = new Map<string, Set<ChannelId>>();
  for (const row of allData) {
    const restaurantId = String(row.pfk_id_store_address);
    const channelId = portalIdToChannelId(row.pfk_id_portal);
    if (channelId) {
      if (!channelMap.has(restaurantId)) channelMap.set(restaurantId, new Set());
      channelMap.get(restaurantId)!.add(channelId);
    }
  }

  // Convert Set to Array
  const result = new Map<string, ChannelId[]>();
  for (const [restaurantId, channels] of channelMap) {
    result.set(restaurantId, Array.from(channels));
  }
  return result;
}
