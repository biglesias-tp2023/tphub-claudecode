/**
 * CRP Portal Portals Service
 *
 * Handles all delivery portal/platform-related data operations from the CRP Portal database.
 * Portals represent delivery platforms like Glovo, UberEats, JustEat.
 *
 * @module services/crp-portal/portals
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles portal data operations
 * - Open/Closed: Can be extended with new portal operations without modification
 * - Dependency Inversion: Depends on Supabase client abstraction
 */

import { supabase } from '../supabase';
import type { DbCrpPortal, Portal } from './types';
import { mapPortal } from './mappers';
import { deduplicateBy } from './utils';
import { handleCrpError } from './errors';

/** Table name for portals in CRP Portal */
const TABLE_NAME = 'crp_portal__dt_portal';

/**
 * Fetches all available delivery portals from CRP Portal.
 *
 * Results are deduplicated by pk_id_portal to handle potential
 * duplicate entries in the source database.
 *
 * @returns Promise resolving to array of Portal domain models
 * @throws Error if database query fails
 *
 * @example
 * const portals = await fetchPortals();
 * console.log(portals.map(p => p.name)); // ['Glovo', 'UberEats', 'JustEat']
 */
export async function fetchPortals(): Promise<Portal[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('des_portal');

  if (error) {
    handleCrpError('fetchPortals', error);
  }

  const uniquePortals = deduplicateBy(
    data as DbCrpPortal[],
    (p) => p.pk_id_portal
  );

  return uniquePortals.map(mapPortal);
}
