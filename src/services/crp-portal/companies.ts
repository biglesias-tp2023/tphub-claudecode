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
import { deduplicateByNameKeepingLatest } from './utils';
import { handleCrpError } from './errors';

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
  // Query last 2 months WITHOUT status filter, order by pk_ts_month DESC
  // We deduplicate first (keeping most recent snapshot), THEN filter by status.
  // This ensures that if a company changed to "Churn" in the latest month,
  // we don't fall back to an older month where it was still "Cliente Activo".
  // Limiting to 2 months avoids pulling entire history while handling month transitions.
  const now = new Date();
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const minMonth = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_company, des_company_name, des_status, des_key_account_manager, td_firma_contrato, flg_deleted, pk_ts_month, pct_commission_glovo, pct_commission_uber_eats')
    .gte('pk_ts_month', minMonth)
    .order('pk_ts_month', { ascending: false });

  if (error) {
    handleCrpError('fetchCompanies', error);
  }

  // Step 1: Deduplicate by NAME, keeping the most recent pk_ts_month snapshot
  const uniqueCompanies = deduplicateByNameKeepingLatest(
    data as DbCrpCompany[],
    (c) => c.des_company_name.toLowerCase()
  );

  // Step 2: Filter by valid status AFTER deduplication (uses latest status)
  const activeCompanies = uniqueCompanies.filter((c) =>
    (VALID_COMPANY_STATUSES as readonly string[]).includes(c.des_status)
  );

  return activeCompanies.map(mapCompany);
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
  // Get the most recent snapshot (no status filter — check after)
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('pk_id_company, des_company_name, des_status, des_key_account_manager, td_firma_contrato, flg_deleted, pk_ts_month, pct_commission_glovo, pct_commission_uber_eats')
    .eq('pk_id_company', parseInt(companyId, 10))
    .order('pk_ts_month', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = Row not found
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching company: ${error.message}`);
  }

  const company = data as DbCrpCompany;

  // Check status from the latest snapshot
  if (!(VALID_COMPANY_STATUSES as readonly string[]).includes(company.des_status)) return null;

  return mapCompany(company);
}
