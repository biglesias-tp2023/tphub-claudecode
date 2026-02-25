/**
 * CRP Portal HubSpot Contacts Service
 *
 * Fetches HubSpot contacts associated with a company.
 *
 * @module services/crp-portal/contacts
 */

import { supabase } from '../supabase';
import type { DbHubspotContact, DbHubspotCompanyContact } from './types';
import { deduplicateBy } from './utils';

export interface HubspotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

/**
 * Fetches HubSpot contacts associated with a company.
 *
 * 1. Gets the latest pk_ts_month from the company-contact mapping table
 * 2. Gets all contact IDs linked to the company for that month
 * 3. Fetches contact details for those IDs
 *
 * @param companyId - The company ID (string representation of pk_id_company)
 * @returns Array of HubSpot contacts with id, name, and email
 */
export async function fetchContactsByCompanyId(companyId: string): Promise<HubspotContact[]> {
  // Step 1: Get the latest pk_ts_month for THIS company
  const { data: latestMonth, error: monthError } = await supabase
    .from('crp_hubspot__lt_company_contact_mp')
    .select('pk_ts_month')
    .eq('pk_id_company', companyId)
    .order('pk_ts_month', { ascending: false })
    .limit(1)
    .single();

  if (monthError || !latestMonth) {
    if (import.meta.env.DEV) {
      console.error('[crp-portal] fetchContactsByCompanyId: no month found for company', companyId, monthError);
    }
    return [];
  }

  const pkTsMonth = latestMonth.pk_ts_month;

  // Step 2: Get contact IDs linked to this company
  let step2Query = supabase
    .from('crp_hubspot__lt_company_contact_mp')
    .select('pk_id_contact')
    .eq('pk_id_company', companyId);
  step2Query = pkTsMonth == null
    ? step2Query.is('pk_ts_month', null)
    : step2Query.eq('pk_ts_month', pkTsMonth);
  const { data: companyContacts, error: contactsError } = await step2Query;

  if (contactsError || !companyContacts?.length) {
    if (import.meta.env.DEV) {
      console.error('[crp-portal] fetchContactsByCompanyId: no contacts for company', companyId, contactsError);
    }
    return [];
  }

  const contactIds = (companyContacts as DbHubspotCompanyContact[]).map((c) => c.pk_id_contact);

  // Step 3: Fetch contact details (use latest month from contacts table, may differ from mapping table)
  const { data: contacts, error: detailsError } = await supabase
    .from('crp_hubspot__dt_contact_mp')
    .select('pk_id_contact, des_first_name, des_last_name, des_email, pk_ts_month')
    .in('pk_id_contact', contactIds)
    .order('pk_ts_month', { ascending: false });

  if (detailsError || !contacts?.length) {
    if (import.meta.env.DEV) {
      console.error('[crp-portal] fetchContactsByCompanyId: no contact details found', detailsError);
    }
    return [];
  }

  // Deduplicate by contact ID (ordered by pk_ts_month DESC, so first = most recent)
  const uniqueContacts = deduplicateBy(contacts as DbHubspotContact[], (c) => c.pk_id_contact);

  return uniqueContacts.map((c) => ({
    id: String(c.pk_id_contact),
    firstName: c.des_first_name || '',
    lastName: c.des_last_name || '',
    email: c.des_email || '',
    fullName: [c.des_first_name, c.des_last_name].filter(Boolean).join(' ') || c.des_email || '',
  }));
}
