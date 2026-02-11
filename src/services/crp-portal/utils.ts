/**
 * CRP Portal Utilities
 *
 * Generic utility functions used across the CRP Portal service.
 *
 * @module services/crp-portal/utils
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only contains utility functions
 * - Open/Closed: Generic functions that can be extended without modification
 */

/**
 * FUNDAMENTAL RULE: Dimension Filtering Pattern
 *
 * All CRP Portal dimension tables (dt_company, dt_store, dt_address, dt_portal)
 * have monthly snapshots (pk_ts_month) and a flg_deleted field.
 *
 * CRITICAL: Always deduplicate FIRST by PK, then filter deleted records.
 *
 * Why this order matters:
 * - A record can have flg_deleted=0 in January and flg_deleted=1 in February
 * - If you filter before dedup, you keep the January record (active but stale)
 * - The most recent snapshot is the source of truth
 *
 * Pattern:
 * 1. Fetch WITHOUT filtering flg_deleted, ORDER BY pk_ts_month DESC
 * 2. Deduplicate by PK (first occurrence = most recent snapshot)
 * 3. Filter out records where flg_deleted !== 0
 *
 * NEVER use .eq('flg_deleted', 0) in Supabase queries for dimension tables.
 * Always use this function after fetching.
 */

/**
 * Standard dimension fetch pattern for CRP Portal.
 * Deduplicates by key (keeping first/most recent), then filters deleted records.
 *
 * IMPORTANT: Data MUST be pre-sorted by pk_ts_month DESC before calling this function.
 *
 * @template T - Type of items (must have flg_deleted field)
 * @param data - Array of items sorted by pk_ts_month DESC
 * @param getKey - Function to extract the unique key (PK) from each item
 * @returns Deduplicated array with deleted records filtered out
 *
 * @example
 * // Fetch stores ordered by pk_ts_month DESC (most recent first)
 * const { data } = await supabase
 *   .from('crp_portal__dt_store')
 *   .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
 *   .order('pk_ts_month', { ascending: false });
 *
 * // Deduplicate and filter deleted
 * const activeStores = deduplicateAndFilterDeleted(data, s => s.pk_id_store);
 */
export function deduplicateAndFilterDeleted<T extends { flg_deleted?: number }>(
  data: T[],
  getKey: (item: T) => string | number
): T[] {
  // Step 1: Deduplicate by key (first occurrence = most recent due to ORDER BY pk_ts_month DESC)
  const map = new Map<string | number, T>();
  for (const item of data) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  // Step 2: Filter out deleted records (treat undefined as 0/active)
  return Array.from(map.values()).filter(item => (item.flg_deleted ?? 0) === 0);
}

/**
 * Deduplicate an array of items by a key extractor function.
 * Keeps the first occurrence of each unique key.
 *
 * @template T - The type of items in the array
 * @param items - Array of items to deduplicate
 * @param keyFn - Function to extract the unique key from each item
 * @returns Deduplicated array preserving original order
 *
 * @example
 * const users = [{ id: 1, name: 'A' }, { id: 1, name: 'B' }, { id: 2, name: 'C' }];
 * const unique = deduplicateBy(users, u => u.id);
 * // Result: [{ id: 1, name: 'A' }, { id: 2, name: 'C' }]
 */
export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Map<string | number, T>();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

/**
 * Parse an array of string IDs to numeric IDs.
 * Used for converting frontend string IDs to database numeric IDs.
 *
 * @param ids - Array of string IDs
 * @returns Array of numeric IDs
 *
 * @example
 * parseNumericIds(['1', '2', '3']) // [1, 2, 3]
 */
export function parseNumericIds(ids: string[]): number[] {
  return ids.map(id => parseInt(id, 10));
}

/**
 * Generate a URL-safe slug from a string.
 *
 * @param text - Text to convert to slug
 * @returns URL-safe slug
 *
 * @example
 * generateSlug('100 Montaditos') // '100-montaditos'
 */
export function generateSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Normalize a name for deduplication comparison.
 * Handles variations in brand/restaurant names like:
 * - "26KG - Pasta Fresca Italiana" vs "26KG Pasta Fresca Italiana"
 * - Names with accents vs without
 *
 * @param name - Name to normalize
 * @returns Normalized name for comparison
 *
 * @example
 * normalizeName('26KG - Pasta Fresca Italiana') // '26kg pasta fresca italiana'
 * normalizeName('Café Müller') // 'cafe muller'
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[-_.]/g, ' ')  // Replace hyphens/dots/underscores with spaces
    .replace(/\s+/g, ' ')    // Normalize multiple spaces
    .trim();
}

/**
 * Get the first day of the current month in YYYY-MM-DD format.
 * Used for filtering by pk_ts_month in CRP Portal tables.
 *
 * @returns Date string in format 'YYYY-MM-01'
 *
 * @example
 * // If today is 2026-01-23
 * getCurrentMonthFilter() // '2026-01-01'
 */
export function getCurrentMonthFilter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Deduplicate an array of items by name, keeping the one with the most recent pk_ts_month.
 * Useful for handling duplicate records across different monthly snapshots.
 *
 * @template T - The type of items in the array (must have pk_ts_month)
 * @param items - Array of items to deduplicate
 * @param nameFn - Function to extract the name/key from each item
 * @returns Deduplicated array with the most recent version of each unique name
 *
 * @example
 * const stores = [
 *   { des_store: 'Brand A', pk_ts_month: '2026-01-01' },
 *   { des_store: 'Brand A', pk_ts_month: '2025-12-01' },
 *   { des_store: 'Brand B', pk_ts_month: '2026-01-01' }
 * ];
 * const unique = deduplicateByNameKeepingLatest(stores, s => s.des_store);
 * // Result: [{ des_store: 'Brand A', pk_ts_month: '2026-01-01' }, { des_store: 'Brand B', pk_ts_month: '2026-01-01' }]
 */
export function deduplicateByNameKeepingLatest<T extends { pk_ts_month: string }>(
  items: T[],
  nameFn: (item: T) => string | number
): T[] {
  // Sort by pk_ts_month descending (most recent first)
  const sorted = [...items].sort((a, b) =>
    b.pk_ts_month.localeCompare(a.pk_ts_month)
  );

  // Keep only the first occurrence of each name (which is the most recent)
  const seen = new Map<string | number, T>();
  for (const item of sorted) {
    const key = nameFn(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

/**
 * Result type for groupByName function
 */
export interface GroupedItem<T> {
  /** Primary item (most recent by pk_ts_month) */
  primary: T;
  /** All IDs that share this name */
  allIds: string[];
}

/**
 * Group items by name, collecting all IDs that share the same name.
 * This is used for multi-portal deduplication where the same entity
 * (brand, restaurant) has different IDs for each platform (Glovo, Uber, etc).
 *
 * @template T - The type of items (must have pk_ts_month)
 * @param items - Array of items to group
 * @param nameFn - Function to extract the normalized name/key from each item
 * @param idFn - Function to extract the ID from each item
 * @returns Array of grouped items with primary item and all IDs
 *
 * @example
 * const stores = [
 *   { pk_id_store: 'A1', des_store: 'Brand A', pk_ts_month: '2026-01-01' },
 *   { pk_id_store: 'A2', des_store: 'Brand A', pk_ts_month: '2026-01-01' },
 *   { pk_id_store: 'B1', des_store: 'Brand B', pk_ts_month: '2026-01-01' }
 * ];
 * const grouped = groupByName(stores, s => s.des_store.toLowerCase(), s => s.pk_id_store);
 * // Result: [
 * //   { primary: { pk_id_store: 'A1', ... }, allIds: ['A1', 'A2'] },
 * //   { primary: { pk_id_store: 'B1', ... }, allIds: ['B1'] }
 * // ]
 */
export function groupByName<T extends { pk_ts_month?: string }>(
  items: T[],
  nameFn: (item: T) => string,
  idFn: (item: T) => string
): GroupedItem<T>[] {
  // Group items by normalized name
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = nameFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  // For each group, select the primary (most recent) and collect all IDs
  const results: GroupedItem<T>[] = [];

  for (const [, group] of groups) {
    // Sort by pk_ts_month descending (most recent first)
    const sorted = [...group].sort((a, b) =>
      (b.pk_ts_month ?? '').localeCompare(a.pk_ts_month ?? '')
    );

    // Primary is the most recent
    const primary = sorted[0];

    // Collect all unique IDs
    const allIds = [...new Set(group.map(idFn))];

    results.push({ primary, allIds });
  }

  return results;
}

/**
 * Normalize an address string for deduplication.
 * Handles Spanish/Catalan street name variations.
 * Extracts only street name + number, ignoring city/postal code.
 *
 * @param address - Address string to normalize
 * @returns Normalized address string for comparison
 *
 * @example
 * normalizeAddress('C/ de Sancho de Ávila, 175') // 'sancho avila 175'
 * normalizeAddress('Calle de Sancho de Ávila 175') // 'sancho avila 175'
 * normalizeAddress('Calle de Mozart 5, 28008 Madrid, Spain') // 'mozart 5'
 * normalizeAddress('Calle Mozart 5') // 'mozart 5'
 * normalizeAddress('C. de San Enrique, 16, Tetuán, 28020') // 'san enrique 16'
 * normalizeAddress('Calle de San Enrique 16, 28020 Madrid') // 'san enrique 16'
 */
export function normalizeAddress(address: string): string {
  // Extract street number pattern before splitting (handles "16", "14 Local 3", etc.)
  const numberMatch = address.match(/\b(\d+(?:\s*(?:local|piso|bajo|ático|[a-z])?\s*\d*)?)\b/i);
  const streetNumber = numberMatch ? numberMatch[1] : '';

  // Remove postal code and everything after (5 digits followed by city)
  let streetPart = address
    .replace(/,?\s*\d{5}\s*.*/i, '')  // Remove postal code and city
    .replace(/,?\s*(madrid|barcelona|valencia|sevilla|zaragoza|málaga|murcia|palma|bilbao|alicante|córdoba|valladolid|vigo|gijón|tetuán|chamberí|salamanca|retiro|moncloa|arganzuela|carabanchel|usera|latina|puente de vallecas|moratalaz|ciudad lineal|hortaleza|villaverde|villa de vallecas|vicálvaro|san blas|barajas)\b.*/i, '')  // Remove city/district names
    .split(',')[0]  // Take first part
    .trim();

  const normalized = streetPart
    .toLowerCase()
    // Remove common street prefixes (Spanish/Catalan) - includes c.
    .replace(/^(c\.|c\/|calle|carrer|carretera|avenida|avinguda|av\.|avda\.|paseo|passeig|plaza|plaça|pl\.|ronda|travesía|travessera)\s*/i, '')
    // Remove prepositions
    .replace(/\b(de|del|dels|de la|de les|d')\b/gi, '')
    // Remove accents
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Remove punctuation and extra spaces
    .replace(/[,.\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If we lost the number in the normalization, append it
  if (streetNumber && !normalized.match(/\d/)) {
    return `${normalized} ${streetNumber}`.replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

/**
 * Deduplicate addresses by normalized name.
 * Keeps the most complete address (longest) and merges coordinates from all duplicates.
 * Uses address normalization to handle variations like "C/", "Calle", "Carrer".
 *
 * @template T - The type of items in the array (must have pk_ts_month and optional coordinates)
 * @param items - Array of address items to deduplicate
 * @param addressFn - Function to extract the address string from each item
 * @returns Deduplicated array with the most complete version of each unique address
 */
export function deduplicateAddressesKeepingLatest<T extends { pk_ts_month: string; des_latitude?: number | null; des_longitude?: number | null }>(
  items: T[],
  addressFn: (item: T) => string
): T[] {
  // Group items by normalized address
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const normalizedKey = normalizeAddress(addressFn(item));
    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, []);
    }
    groups.get(normalizedKey)!.push(item);
  }

  // For each group, pick the best representative
  const results: T[] = [];

  for (const [, group] of groups) {
    // Sort by: 1) address length (longest first), 2) pk_ts_month (most recent first)
    const sorted = [...group].sort((a, b) => {
      const lenDiff = addressFn(b).length - addressFn(a).length;
      if (lenDiff !== 0) return lenDiff;
      return b.pk_ts_month.localeCompare(a.pk_ts_month);
    });

    // Take the best (longest, most recent)
    const best = { ...sorted[0] };

    // If the best doesn't have coordinates, try to find them in other duplicates
    if (!best.des_latitude || !best.des_longitude) {
      for (const item of group) {
        if (item.des_latitude && item.des_longitude) {
          best.des_latitude = item.des_latitude;
          best.des_longitude = item.des_longitude;
          break;
        }
      }
    }

    results.push(best as T);
  }

  return results;
}

/**
 * Group addresses by normalized name, collecting all IDs that share the same address.
 * This is used for multi-portal deduplication where the same address
 * has different IDs for each platform (Glovo, Uber, etc).
 *
 * @template T - The type of items (must have pk_ts_month and optional coordinates)
 * @param items - Array of address items to group
 * @param addressFn - Function to extract the address string from each item
 * @param idFn - Function to extract the ID from each item
 * @returns Array of grouped items with primary item and all IDs
 *
 * @example
 * const addresses = [
 *   { pk_id_address: 'A1', des_address: 'C/ Mozart 5', pk_ts_month: '2026-01-01' },
 *   { pk_id_address: 'A2', des_address: 'Calle Mozart 5', pk_ts_month: '2026-01-01' },
 *   { pk_id_address: 'B1', des_address: 'Av. Diagonal 123', pk_ts_month: '2026-01-01' }
 * ];
 * const grouped = groupAddressesByName(addresses, a => a.des_address, a => a.pk_id_address);
 * // Result: [
 * //   { primary: { pk_id_address: 'A1', des_address: 'C/ Mozart 5', ... }, allIds: ['A1', 'A2'] },
 * //   { primary: { pk_id_address: 'B1', ... }, allIds: ['B1'] }
 * // ]
 */
export function groupAddressesByName<T extends { pk_ts_month?: string; des_latitude?: number | null; des_longitude?: number | null }>(
  items: T[],
  addressFn: (item: T) => string,
  idFn: (item: T) => string
): GroupedItem<T>[] {
  // Group items by normalized address
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const normalizedKey = normalizeAddress(addressFn(item));
    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, []);
    }
    groups.get(normalizedKey)!.push(item);
  }

  // For each group, select the primary (best) and collect all IDs
  const results: GroupedItem<T>[] = [];

  for (const [, group] of groups) {
    // Sort by: 1) address length (longest first), 2) pk_ts_month (most recent first)
    const sorted = [...group].sort((a, b) => {
      const lenDiff = addressFn(b).length - addressFn(a).length;
      if (lenDiff !== 0) return lenDiff;
      return (b.pk_ts_month ?? '').localeCompare(a.pk_ts_month ?? '');
    });

    // Primary is the best (longest, most recent)
    const primary = { ...sorted[0] };

    // If the primary doesn't have coordinates, try to find them in other duplicates
    if (!primary.des_latitude || !primary.des_longitude) {
      for (const item of group) {
        if (item.des_latitude && item.des_longitude) {
          primary.des_latitude = item.des_latitude;
          primary.des_longitude = item.des_longitude;
          break;
        }
      }
    }

    // Collect all unique IDs
    const allIds = [...new Set(group.map(idFn))];

    results.push({ primary: primary as T, allIds });
  }

  return results;
}
