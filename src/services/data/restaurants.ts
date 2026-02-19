/**
 * Restaurants data operations
 */

import { supabase, handleQueryError, isDevMode, mockRestaurants } from './shared';
import { mapDbRestaurantToRestaurant } from './mappers';
import type { Restaurant, DbRestaurant } from '@/types';

interface FetchRestaurantsParams {
  companyIds?: string[];
  brandIds?: string[];
  areaIds?: string[];
}

/**
 * Fetch restaurants with optional filtering
 */
export async function fetchRestaurants(params: FetchRestaurantsParams = {}): Promise<Restaurant[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let restaurants = mockRestaurants;
    if (params.companyIds && params.companyIds.length > 0) {
      restaurants = restaurants.filter((r) => params.companyIds!.includes(r.companyId));
    }
    if (params.brandIds && params.brandIds.length > 0) {
      restaurants = restaurants.filter((r) => params.brandIds!.includes(r.brandId));
    }
    if (params.areaIds && params.areaIds.length > 0) {
      restaurants = restaurants.filter((r) => r.areaId && params.areaIds!.includes(r.areaId));
    }
    return restaurants.sort((a, b) => a.name.localeCompare(b.name));
  }

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }
  if (params.areaIds && params.areaIds.length > 0) {
    query = query.in('area_id', params.areaIds);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar los restaurantes');
  return (data as DbRestaurant[]).map(mapDbRestaurantToRestaurant);
}

/**
 * Fetch a single restaurant by ID
 */
export async function fetchRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar el restaurante');
  }
  return mapDbRestaurantToRestaurant(data as DbRestaurant);
}
