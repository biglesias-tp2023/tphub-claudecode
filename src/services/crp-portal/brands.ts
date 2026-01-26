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
import { deduplicateByNameKeepingLatest, getCurrentMonthFilter, parseNumericIds } from './utils';

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
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('pk_ts_month', getCurrentMonthFilter())
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

  // Deduplicate by NAME (des_store) case-insensitive, keeping the most recent pk_ts_month
  // This handles cases like "Bo&Mie" vs "BO&MIE"
  const uniqueStores = deduplicateByNameKeepingLatest(
    data as DbCrpStore[],
    (s) => s.des_store.toLowerCase()
  );

  return uniqueStores.map(mapBrand);
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
