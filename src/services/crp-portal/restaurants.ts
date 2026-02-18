/**
 * CRP Portal Restaurants Service
 *
 * Handles all restaurant/address-related data operations from the CRP Portal database.
 * In CRP Portal, restaurants are called "addresses" (dt_address table).
 *
 * @module services/crp-portal/restaurants
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles restaurant data operations
 * - Open/Closed: Can be extended with new restaurant operations without modification
 * - Dependency Inversion: Depends on Supabase client abstraction
 *
 * Important Notes:
 * - Brand filtering (pfk_id_store) is NOT applied at this level because many
 *   addresses don't have this field properly set in the database.
 * - Brand filtering should be handled at the hook level by filtering based on
 *   the companies that own the selected brands.
 */

import { supabase } from '../supabase';
import type { Restaurant } from '@/types';
import type { DbCrpAddress, FetchRestaurantsParams } from './types';
import { mapRestaurant } from './mappers';
import { groupAddressesByName, parseNumericIds, deduplicateAndFilterDeleted } from './utils';

/** Table name for addresses/restaurants in CRP Portal */
const TABLE_NAME = 'crp_portal__dt_address';

/**
 * Fetches restaurants (addresses) from CRP Portal with optional filtering.
 *
 * Filtering hierarchy:
 * 1. Company (pfk_id_company) - Primary filter, always applied if provided
 * 2. Area (pfk_id_business_area) - Secondary filter, applied if provided
 *
 * Note: Brand filtering is intentionally NOT applied here. See module docs.
 *
 * Results are deduplicated by pk_id_address to handle potential
 * duplicate entries in the source database.
 *
 * @param params - Optional filtering parameters
 * @returns Promise resolving to array of Restaurant domain models
 * @throws Error if database query fails
 *
 * @example
 * // Get all restaurants
 * const all = await fetchRestaurants();
 *
 * // Get restaurants for specific companies
 * const byCompany = await fetchRestaurants({ companyIds: ['1', '2'] });
 *
 * // Get restaurants in specific areas
 * const byArea = await fetchRestaurants({ areaIds: ['10', '20'] });
 *
 * // Combined filtering
 * const filtered = await fetchRestaurants({
 *   companyIds: ['1'],
 *   areaIds: ['10']
 * });
 */
export async function fetchRestaurants(
  params: FetchRestaurantsParams = {}
): Promise<Restaurant[]> {
  // Query all months, order by pk_ts_month DESC for deduplication
  // NOTE: Do NOT filter flg_deleted here - filter AFTER deduplication (see utils.ts)
  let query = supabase
    .from(TABLE_NAME)
    .select('pk_id_address, des_address, pfk_id_company, pfk_id_store, pfk_id_business_area, des_latitude, des_longitude, flg_deleted, pk_ts_month')
    .order('pk_ts_month', { ascending: false })
    .order('des_address');

  // Apply company filter (primary)
  if (params.companyIds && params.companyIds.length > 0) {
    const numericIds = parseNumericIds(params.companyIds);
    query = query.in('pfk_id_company', numericIds);
  }

  // Apply area filter (secondary)
  if (params.areaIds && params.areaIds.length > 0) {
    const numericIds = parseNumericIds(params.areaIds);
    query = query.in('pfk_id_business_area', numericIds);
  }

  // NOTE: Brand filtering (pfk_id_store) is intentionally omitted.
  // Many addresses don't have this field set in the database.
  // Brand filtering is handled at the hook level.

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching CRP addresses:', error);
    throw new Error(`Error fetching restaurants: ${error.message}`);
  }

  // Step 1: Deduplicate by pk_id_address and filter deleted records
  // CRITICAL: Must dedup FIRST, then filter - see deduplicateAndFilterDeleted docs
  const activeAddresses = deduplicateAndFilterDeleted(
    data as DbCrpAddress[],
    (a) => String(a.pk_id_address)
  );

  // Step 2: Group by normalized address, collecting all IDs that share the same address
  // This handles multi-portal scenarios where the same address has different IDs per platform
  const grouped = groupAddressesByName(
    activeAddresses,
    (a) => a.des_address,
    (a) => String(a.pk_id_address)
  );

  return grouped.map(g => mapRestaurant(g.primary, g.allIds));
}

/**
 * Fetches a single restaurant by its ID.
 *
 * @param restaurantId - The restaurant ID (string representation of pk_id_address)
 * @returns Promise resolving to Restaurant or null if not found
 * @throws Error if database query fails (except for "not found" errors)
 *
 * @example
 * const restaurant = await fetchRestaurantById('999');
 * if (restaurant) {
 *   console.log(restaurant.name, restaurant.address);
 * }
 */
export async function fetchRestaurantById(
  restaurantId: string
): Promise<Restaurant | null> {
  // Fetch most recent snapshot for this address
  // NOTE: Do NOT filter flg_deleted here - check AFTER getting most recent
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_address, des_address, pfk_id_company, pfk_id_store, pfk_id_business_area, des_latitude, des_longitude, flg_deleted, pk_ts_month')
    .eq('pk_id_address', parseInt(restaurantId, 10))
    .order('pk_ts_month', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error fetching restaurant: ${error.message}`);
  }

  // No data or address is deleted in most recent snapshot
  if (!data || data.length === 0) return null;
  const mostRecent = data[0] as DbCrpAddress;
  if (mostRecent.flg_deleted !== 0) return null;

  return mapRestaurant(mostRecent);
}
