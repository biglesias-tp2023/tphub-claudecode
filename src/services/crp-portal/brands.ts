/**
 * CRP Portal Brands Service
 *
 * Handles all brand/store-related data operations from the CRP Portal database.
 * In CRP Portal, brands are called "stores" (dt_store table).
 *
 * @module services/crp-portal/brands
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles brand data operations
 * - Open/Closed: Can be extended with new brand operations without modification
 * - Dependency Inversion: Depends on Supabase client abstraction
 */

import { supabase } from '../supabase';
import type { Brand } from '@/types';
import type { DbCrpStore } from './types';
import { mapBrand } from './mappers';
import { groupByName, parseNumericIds } from './utils';

/** Table name for stores/brands in CRP Portal */
const TABLE_NAME = 'crp_portal__dt_store';

/**
 * Fetches brands (stores) from CRP Portal.
 *
 * Can optionally filter by company IDs to get only brands
 * belonging to specific companies.
 *
 * Results are deduplicated by pk_id_store to handle potential
 * duplicate entries in the source database.
 *
 * @param companyIds - Optional array of company IDs to filter by
 * @returns Promise resolving to array of Brand domain models
 * @throws Error if database query fails
 *
 * @example
 * // Get all brands
 * const allBrands = await fetchBrands();
 *
 * // Get brands for specific companies
 * const companyBrands = await fetchBrands(['1', '2', '3']);
 */
export async function fetchBrands(companyIds?: string[]): Promise<Brand[]> {
  // Query all months, order by pk_ts_month DESC so groupByName selects most recent
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('pk_ts_month', { ascending: false })
    .order('des_store');

  if (companyIds && companyIds.length > 0) {
    const numericIds = parseNumericIds(companyIds);
    query = query.in('pfk_id_company', numericIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching CRP stores:', error);
    throw new Error(`Error fetching brands: ${error.message}`);
  }

  // Group by NAME (des_store) case-insensitive, collecting all IDs that share the same name
  // This handles multi-portal scenarios where the same brand has different IDs per platform
  const grouped = groupByName(
    data as DbCrpStore[],
    (s) => s.des_store.toLowerCase(),
    (s) => String(s.pk_id_store)
  );

  // DEBUG: Log grouping results
  if (import.meta.env.DEV) {
    console.log('[fetchBrands] Raw data count:', data.length);
    console.log('[fetchBrands] Grouped count:', grouped.length);
    const multipleIds = grouped.filter(g => g.allIds.length > 1);
    if (multipleIds.length > 0) {
      console.log('[fetchBrands] Brands with multiple IDs:', multipleIds.map(g => ({
        name: g.primary.des_store,
        allIds: g.allIds
      })));
    }
  }

  return grouped.map(g => mapBrand(g.primary, g.allIds));
}

/**
 * Fetches a single brand by its ID.
 *
 * @param brandId - The brand ID (string representation of pk_id_store)
 * @returns Promise resolving to Brand or null if not found
 * @throws Error if database query fails (except for "not found" errors)
 *
 * @example
 * const brand = await fetchBrandById('456');
 * if (brand) {
 *   console.log(brand.name, brand.companyId);
 * }
 */
export async function fetchBrandById(brandId: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('pk_id_store', parseInt(brandId, 10))
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching brand: ${error.message}`);
  }

  return mapBrand(data as DbCrpStore);
}
