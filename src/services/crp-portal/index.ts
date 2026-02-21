/**
 * CRP Portal Service
 *
 * Unified data access layer for ThinkPaladar's CRP Portal database.
 * This module provides a clean API for accessing company, brand, area,
 * restaurant, and portal data from Supabase.
 *
 * @module services/crp-portal
 *
 * Architecture Overview:
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    CRP Portal Service                        │
 * │                      (Public API)                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  companies.ts  │  brands.ts  │  areas.ts  │  restaurants.ts │
 * │                │             │            │                  │
 * │  fetchCompanies│  fetchBrands│ fetchAreas │ fetchRestaurants│
 * │  fetchById     │  fetchById  │ fetchById  │ fetchById       │
 * ├─────────────────────────────────────────────────────────────┤
 * │                      mappers.ts                              │
 * │           (Data transformation layer)                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │                       types.ts                               │
 * │              (Database & domain types)                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │                       utils.ts                               │
 * │            (Shared utility functions)                        │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Each module has one reason to change
 * - Open/Closed: Extensible without modifying existing code
 * - Liskov Substitution: Consistent return types across similar functions
 * - Interface Segregation: Specific interfaces for each entity
 * - Dependency Inversion: Depends on abstractions (types), not concretions
 *
 * Data Hierarchy:
 * ```
 * Company (Empresa)
 *    └── Brand (Marca/Store)
 *          └── Restaurant (Dirección/Address)
 *                └── Area (Zona geográfica)
 * ```
 *
 * @example
 * // Import specific functions
 * import { fetchCompanies, fetchBrands } from '@/services/crp-portal';
 *
 * // Fetch companies and their brands
 * const companies = await fetchCompanies();
 * const brands = await fetchBrands(companies.map(c => c.id));
 */

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  CompanyStatus,
  DbCrpCompany,
  DbCrpStore,
  DbCrpAddress,
  DbCrpBusinessArea,
  DbCrpPortal,
  DbCrpOrderHead,
  DbCrpReview,
  DbRestaurantCoordinate,
  DbHubspotContact,
  DbHubspotCompanyContact,
  FetchRestaurantsParams,
  FetchCoordinatesParams,
  Portal,
  PortalId,
} from './types';

export { VALID_COMPANY_STATUSES, PORTAL_IDS } from './types';

// ============================================
// SERVICE EXPORTS
// ============================================

// Companies
export {
  fetchCompanies as fetchCrpCompanies,
  fetchCompanyById as fetchCrpCompanyById,
} from './companies';

// Brands
export {
  fetchBrands as fetchCrpBrands,
  fetchBrandById as fetchCrpBrandById,
} from './brands';

// Areas
export {
  fetchAreas as fetchCrpAreas,
  fetchAreaById as fetchCrpAreaById,
} from './areas';

// Restaurants
export {
  fetchRestaurants as fetchCrpRestaurants,
  fetchRestaurantById as fetchCrpRestaurantById,
} from './restaurants';

// Portals
export { fetchPortals as fetchCrpPortals } from './portals';

// Coordinates (new unified table)
export {
  fetchRestaurantCoordinates,
  fetchRestaurantsForMap,
  fetchRestaurantCoordinateById,
  fetchRawCoordinates,
} from './coordinates';

// Orders
export {
  fetchCrpOrdersAggregated,
  fetchCrpOrdersRaw,
  fetchCrpOrdersComparison,
  fetchControllingMetricsRPC,
} from './orders';

export type {
  FetchOrdersParams,
  OrdersAggregation,
  ChannelAggregation,
  OrdersChanges,
  ControllingMetricsRow,
} from './orders';

// Reviews
export {
  fetchCrpReviewsAggregated,
  fetchCrpReviewsHeatmap,
  fetchCrpReviewsComparison,
  fetchCrpReviewsRaw,
} from './reviews';

export type {
  FetchReviewsParams,
  ReviewsAggregation,
  ChannelReviewAggregation,
  ReviewsChanges,
  ReviewsHeatmapCell,
  RawReview,
} from './reviews';

// Hierarchy (Company → Brand → Address → Channel)
export {
  fetchHierarchyData,
  fetchHierarchyDataRPC,
} from './hierarchy';

export type {
  HierarchyMetrics,
  HierarchyDataRow,
} from './hierarchy';

// Contacts (HubSpot)
export { fetchContactsByCompanyId } from './contacts';
export type { HubspotContact } from './contacts';

// Brand Channels (active channels per brand/restaurant)
export {
  fetchBrandActiveChannels,
  fetchRestaurantActiveChannels,
} from './brand-channels';

// Products (from order lines)
export {
  fetchCrpProducts,
  fetchCrpProductsByIds,
} from './products';

export type { CrpProduct } from './products';

// Customers (analytics)
export {
  fetchCustomerMetrics,
  fetchCustomerMetricsByChannel,
  fetchCustomerCohorts,
  fetchChurnRiskCustomers,
  fetchMultiPlatformAnalysis,
  fetchRevenueConcentration,
  fetchPostPromoHealth,
} from './customers';

export type {
  FetchCustomerDataParams,
  CustomerMetrics,
  CustomerMetricsWithChanges,
  ChannelCustomerMetrics,
  CohortData,
  CustomerChurnRisk,
  MultiPlatformAnalysis,
  RevenueConcentration,
  PostPromoHealth,
} from './customers';

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  deduplicateAndFilterDeleted,
  deduplicateBy,
  deduplicateByNameKeepingLatest,
  deduplicateAddressesKeepingLatest,
  normalizeAddress,
  getCurrentMonthFilter,
} from './utils';

// ============================================
// MAPPER EXPORTS (for testing/extension)
// ============================================

export {
  mapCompany,
  mapBrand,
  mapRestaurant,
  mapArea,
  mapPortal,
} from './mappers';
