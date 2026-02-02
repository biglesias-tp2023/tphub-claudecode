/**
 * Restaurant Coordinates Service
 *
 * Handles access to the tphub_restaurant_coordinates table which contains
 * deduplicated restaurant addresses with geocoded coordinates from Mapbox.
 *
 * @module services/crp-portal/coordinates
 *
 * This table replaces the need for manual deduplication of crp_portal__dt_address
 * and provides reliable coordinates for mapping.
 */

import { supabase } from '../supabase';
import type { Restaurant } from '@/types';
import type { DbRestaurantCoordinate, FetchCoordinatesParams } from './types';

/** Table name for restaurant coordinates */
const TABLE_NAME = 'tphub_restaurant_coordinates';

/**
 * Maps a database row to the Restaurant domain model.
 */
function mapCoordinateToRestaurant(coord: DbRestaurantCoordinate): Restaurant {
  // Include both UUID and CRP address ID in allIds for channel matching
  const allIds = [coord.id];
  if (coord.crp_address_id) {
    allIds.push(coord.crp_address_id);
  }

  return {
    id: coord.id,
    allIds,
    externalId: coord.crp_address_id ? parseInt(coord.crp_address_id, 10) : null,
    companyId: coord.company_id,
    brandId: coord.brand_id || '',
    areaId: coord.area_id,
    name: coord.display_address,
    address: coord.display_address,
    latitude: coord.latitude,
    longitude: coord.longitude,
    activeChannels: [],
    isActive: true,
    createdAt: coord.created_at,
    updatedAt: coord.updated_at,
  };
}

/**
 * Fetches restaurant coordinates with optional filtering.
 *
 * @param params - Optional filtering parameters
 * @returns Promise resolving to array of Restaurant domain models
 * @throws Error if database query fails
 *
 * @example
 * // Get all restaurants with coordinates
 * const all = await fetchRestaurantCoordinates();
 *
 * // Get restaurants for specific companies
 * const byCompany = await fetchRestaurantCoordinates({ companyIds: ['123'] });
 *
 * // Get only high-confidence coordinates for mapping
 * const forMap = await fetchRestaurantCoordinates({ minConfidence: 0.5 });
 */
export async function fetchRestaurantCoordinates(
  params: FetchCoordinatesParams = {}
): Promise<Restaurant[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('display_address');

  // Apply company filter
  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }

  // Apply brand filter
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }

  // Apply area filter
  if (params.areaIds && params.areaIds.length > 0) {
    query = query.in('area_id', params.areaIds);
  }

  // Apply minimum confidence filter
  if (params.minConfidence !== undefined && params.minConfidence > 0) {
    query = query.gte('geocode_confidence', params.minConfidence);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching restaurant coordinates:', error);
    throw new Error(`Error fetching restaurant coordinates: ${error.message}`);
  }

  return (data as DbRestaurantCoordinate[]).map(mapCoordinateToRestaurant);
}

/**
 * Fetches restaurants with valid coordinates for mapping.
 * Only returns restaurants with geocode_confidence >= 0.5.
 *
 * @param params - Optional filtering parameters
 * @returns Promise resolving to array of Restaurant domain models with coordinates
 */
export async function fetchRestaurantsForMap(
  params: Omit<FetchCoordinatesParams, 'minConfidence'> = {}
): Promise<Restaurant[]> {
  return fetchRestaurantCoordinates({
    ...params,
    minConfidence: 0.5,
  });
}

/**
 * Fetches a single restaurant coordinate by ID.
 *
 * @param id - The restaurant coordinate UUID
 * @returns Promise resolving to Restaurant or null if not found
 */
export async function fetchRestaurantCoordinateById(
  id: string
): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching restaurant coordinate: ${error.message}`);
  }

  return mapCoordinateToRestaurant(data as DbRestaurantCoordinate);
}

/**
 * Fetches raw coordinate data (for debugging/admin purposes).
 *
 * @param params - Optional filtering parameters
 * @returns Promise resolving to array of raw database rows
 */
export async function fetchRawCoordinates(
  params: FetchCoordinatesParams = {}
): Promise<DbRestaurantCoordinate[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('display_address');

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }

  if (params.minConfidence !== undefined && params.minConfidence > 0) {
    query = query.gte('geocode_confidence', params.minConfidence);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching raw coordinates: ${error.message}`);
  }

  return data as DbRestaurantCoordinate[];
}
