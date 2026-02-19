/**
 * Companies data operations
 */

import { supabase, handleQueryError, isDevMode, mockCompanies } from './shared';
import { mapDbCompanyToCompany } from './mappers';
import type { Company, DbCompany } from '@/types';

/**
 * Fetch all companies (RLS will filter based on user's assigned companies)
 */
export async function fetchCompanies(): Promise<Company[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockCompanies;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) handleQueryError(error, 'No se pudieron cargar las empresas');
  return (data as DbCompany[]).map(mapDbCompanyToCompany);
}

/**
 * Fetch a single company by ID
 */
export async function fetchCompanyById(companyId: string): Promise<Company | null> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockCompanies.find((c) => c.id === companyId) || null;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    handleQueryError(error, 'No se pudo cargar la empresa');
  }
  return mapDbCompanyToCompany(data as DbCompany);
}
