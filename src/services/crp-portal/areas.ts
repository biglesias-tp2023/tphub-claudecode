/**
 * CRP Portal Areas Service
 *
 * Handles all business area-related data operations from the CRP Portal database.
 * Business areas represent geographic regions (cities, districts).
 *
 * @module services/crp-portal/areas
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles area data operations
 * - Open/Closed: Can be extended with new area operations without modification
 * - Dependency Inversion: Depends on Supabase client abstraction
 */

import { supabase } from '../supabase';
import type { Area } from '@/types';
import type { DbCrpBusinessArea } from './types';
import { mapArea } from './mappers';
import { deduplicateBy } from './utils';

/** Table name for business areas in CRP Portal */
const TABLE_NAME = 'crp_portal__ct_business_area';

/**
 * Fetches all business areas from CRP Portal.
 *
 * Results are deduplicated by pk_id_business_area to handle potential
 * duplicate entries in the source database.
 *
 * @returns Promise resolving to array of Area domain models
 * @throws Error if database query fails
 *
 * @example
 * const areas = await fetchAreas();
 * console.log(areas.map(a => a.name)); // ['Madrid', 'Barcelona', ...]
 */
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('des_business_area');

  if (error) {
    console.error('Error fetching CRP business areas:', error);
    throw new Error(`Error fetching areas: ${error.message}`);
  }

  const uniqueAreas = deduplicateBy(
    data as DbCrpBusinessArea[],
    (a) => a.pk_id_business_area
  );

  return uniqueAreas.map(mapArea);
}

/**
 * Fetches a single area by its ID.
 *
 * @param areaId - The area ID (string representation of pk_id_business_area)
 * @returns Promise resolving to Area or null if not found
 * @throws Error if database query fails (except for "not found" errors)
 *
 * @example
 * const area = await fetchAreaById('789');
 * if (area) {
 *   console.log(area.name, area.country);
 * }
 */
export async function fetchAreaById(areaId: string): Promise<Area | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('pk_id_business_area', parseInt(areaId, 10))
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching area: ${error.message}`);
  }

  return mapArea(data as DbCrpBusinessArea);
}
