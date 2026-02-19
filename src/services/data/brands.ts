/**
 * Brands data operations
 */

import { supabase, handleQueryError, isDevMode, mockBrands } from './shared';
import { mapDbBrandToBrand } from './mappers';
import type { Brand, DbBrand } from '@/types';

/**
 * Fetch brands, optionally filtered by company IDs
 */
export async function fetchBrands(companyIds?: string[]): Promise<Brand[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let brands = mockBrands;
    if (companyIds && companyIds.length > 0) {
      brands = brands.filter((b) => companyIds.includes(b.companyId));
    }
    return brands.sort((a, b) => a.name.localeCompare(b.name));
  }

  let query = supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (companyIds && companyIds.length > 0) {
    query = query.in('company_id', companyIds);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar las marcas');
  return (data as DbBrand[]).map(mapDbBrandToBrand);
}

/**
 * Fetch a single brand by ID
 */
export async function fetchBrandById(brandId: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar la marca');
  }
  return mapDbBrandToBrand(data as DbBrand);
}
