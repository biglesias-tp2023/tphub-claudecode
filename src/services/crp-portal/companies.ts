/**
 * CRP Portal Companies Service
 *
 * Handles all company-related data operations from the CRP Portal database.
 *
 * @module services/crp-portal/companies
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles company data operations
 * - Open/Closed: Can be extended with new company operations without modification
 * - Dependency Inversion: Depends on Supabase client abstraction
 */

import { supabase } from '../supabase';
import type { Company } from '@/types';
import type { DbCrpCompany } from './types';
import { VALID_COMPANY_STATUSES } from './types';
import { mapCompany } from './mappers';
import { deduplicateByNameKeepingLatest, getCurrentMonthFilter } from './utils';

/** Table name for companies in CRP Portal */
const TABLE_NAME = 'crp_portal__dt_company';

/**
 * Fetches all active companies from CRP Portal.
 *
 * Only returns companies with valid status values:
 * - Onboarding
 * - Cliente Activo
 * - Stand By
 * - PiP
 *
 * Results are deduplicated by pk_id_company to handle potential
 * duplicate entries in the source database.
 *
 * @returns Promise resolving to array of Company domain models
 * @throws Error if database query fails
 *
 * @example
 * const companies = await fetchCompanies();
 * console.log(companies.length); // Number of active companies
 */
export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_company, des_company_name, des_status, des_key_account_manager, td_firma_contrato, flg_deleted, pk_ts_month')
    .eq('pk_ts_month', getCurrentMonthFilter())
    .in('des_status', VALID_COMPANY_STATUSES)
    .order('des_company_name');

  if (error) {
    console.error('Error fetching CRP companies:', error);
    throw new Error(`Error fetching companies: ${error.message}`);
  }

  // Deduplicate by NAME (des_company_name) case-insensitive, keeping the most recent pk_ts_month
  // This handles cases where different IDs have the same company name
  const uniqueCompanies = deduplicateByNameKeepingLatest(
    data as DbCrpCompany[],
    (c) => c.des_company_name.toLowerCase()
  );

  return uniqueCompanies.map(mapCompany);
}

/**
 * Fetches a single company by its ID.
 *
 * @param companyId - The company ID (string representation of pk_id_company)
 * @returns Promise resolving to Company or null if not found
 * @throws Error if database query fails (except for "not found" errors)
 *
 * @example
 * const company = await fetchCompanyById('123');
 * if (company) {
 *   console.log(company.name);
 * }
 */
export async function fetchCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_company, des_company_name, des_status, des_key_account_manager, td_firma_contrato, flg_deleted, pk_ts_month')
    .eq('pk_id_company', parseInt(companyId, 10))
    .eq('pk_ts_month', getCurrentMonthFilter())
    .in('des_status', VALID_COMPANY_STATUSES)
    .single();

  if (error) {
    // PGRST116 = Row not found
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching company: ${error.message}`);
  }

  return mapCompany(data as DbCrpCompany);
}
