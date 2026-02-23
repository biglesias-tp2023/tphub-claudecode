/** React Query stale/gc time constants for consistent cache behavior. */

/** Frequently changing data (orders, metrics) */
export const QUERY_STALE_SHORT = 2 * 60 * 1000;   // 2 min
export const QUERY_GC_SHORT = 5 * 60 * 1000;      // 5 min

/** Dimensional data (brands, areas, restaurants) */
export const QUERY_STALE_MEDIUM = 5 * 60 * 1000;  // 5 min
export const QUERY_GC_MEDIUM = 10 * 60 * 1000;    // 10 min

/** Reference data (companies, portals, configs) */
export const QUERY_STALE_LONG = 10 * 60 * 1000;   // 10 min
export const QUERY_GC_LONG = 30 * 60 * 1000;      // 30 min
