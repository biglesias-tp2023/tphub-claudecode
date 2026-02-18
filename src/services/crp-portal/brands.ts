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
import { groupByName, parseNumericIds, normalizeName, deduplicateAndFilterDeleted } from './utils';

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
  // Query all months, order by pk_ts_month DESC for deduplication
  // NOTE: Do NOT filter flg_deleted here - filter AFTER deduplication (see utils.ts)
  let query = supabase
    .from(TABLE_NAME)
    .select('pk_id_store, des_store, pfk_id_company, flg_deleted, pk_ts_month')
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

  // Step 1: Deduplicate by pk_id_store and filter deleted records
  // CRITICAL: Must dedup FIRST, then filter - see deduplicateAndFilterDeleted docs
  const activeStores = deduplicateAndFilterDeleted(
    data as DbCrpStore[],
    (s) => String(s.pk_id_store)
  );

  // Step 2: Group by normalized NAME (des_store), collecting all IDs that share the same name
  // This handles multi-portal scenarios where the same brand has different IDs per platform
  // Uses normalizeName to handle variations like "26KG - Pasta" vs "26KG Pasta"
  const grouped = groupByName(
    activeStores,
    (s) => normalizeName(s.des_store),
    (s) => String(s.pk_id_store)
  );

  if (import.meta.env.DEV) {
    console.log('[fetchBrands] Raw:', data.length, '→ Active:', activeStores.length, '→ Grouped:', grouped.length);
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
  // Fetch most recent snapshot for this store
  // NOTE: Do NOT filter flg_deleted here - check AFTER getting most recent
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_store, des_store, pfk_id_company, flg_deleted, pk_ts_month')
    .eq('pk_id_store', parseInt(brandId, 10))
    .order('pk_ts_month', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error fetching brand: ${error.message}`);
  }

  // No data or store is deleted in most recent snapshot
  if (!data || data.length === 0) return null;
  const mostRecent = data[0] as DbCrpStore;
  if (mostRecent.flg_deleted !== 0) return null;

  return mapBrand(mostRecent);
}
