import type { ChannelId, DateRange, OrderStatus } from '@/types';

// ============================================
// INTERNAL FILTER TYPES FOR QUERY KEYS
// ============================================

interface OrderFilters {
  companyIds?: string[];
  brandIds?: string[];
  areaIds?: string[];
  restaurantIds?: string[];
  channelIds?: ChannelId[];
  dateRange: DateRange;
  status?: OrderStatus[];
  page?: number;
  limit?: number;
}

interface AnalyticsFilters {
  companyIds?: string[];
  brandIds?: string[];
  areaIds?: string[];
  restaurantIds?: string[];
  channelIds?: ChannelId[];
  dateRange: DateRange;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

interface ProductFilters {
  brandIds?: string[];
  category?: string;
  isActive?: boolean;
  search?: string;
}

interface RestaurantFilters {
  companyIds?: string[];
  brandIds?: string[];
  areaIds?: string[];
}

interface ObjectivesFilters {
  restaurantIds?: string[];
  channels?: ChannelId[];
  startMonth?: string;
  endMonth?: string;
}

interface AuditFilters {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  auditTypeIds?: string[];
  status?: string;
}

interface CampaignFilters {
  restaurantIds?: string[];
  platforms?: string[];
  status?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================
// QUERY KEYS
// ============================================

/**
 * Centralized query keys for React Query cache management.
 * Follows the factory pattern for consistent key generation.
 *
 * @example
 * // In a hook:
 * useQuery({
 *   queryKey: queryKeys.companies.list(userId),
 *   queryFn: () => fetchCompanies(userId),
 * })
 */
export const queryKeys = {
  /** Current authenticated user */
  currentUser: ['user', 'current'] as const,

  /** Company queries */
  companies: {
    all: ['companies'] as const,
    list: (userId: string) => ['companies', 'list', userId] as const,
    detail: (companyId: string) => ['companies', 'detail', companyId] as const,
    search: (query: string) => ['companies', 'search', query] as const,
  },

  /** Brand queries (filtered by company) */
  brands: {
    all: (companyIds: string[]) => ['brands', companyIds] as const,
    list: (companyIds: string[]) => ['brands', 'list', companyIds] as const,
    detail: (brandId: string) => ['brands', 'detail', brandId] as const,
  },

  /** Area/City queries (filtered by brand) */
  areas: {
    all: (brandIds: string[]) => ['areas', brandIds] as const,
    list: (brandIds: string[]) => ['areas', 'list', brandIds] as const,
    detail: (areaId: string) => ['areas', 'detail', areaId] as const,
  },

  /** Restaurant/Address queries (filtered by company, brand, area) */
  restaurants: {
    all: (filters: RestaurantFilters) => ['restaurants', filters] as const,
    list: (filters: RestaurantFilters) => ['restaurants', 'list', filters] as const,
    detail: (restaurantId: string) => ['restaurants', 'detail', restaurantId] as const,
  },

  /** Order queries */
  orders: {
    all: (filters: OrderFilters) => ['orders', filters] as const,
    list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
    infinite: (filters: OrderFilters) => ['orders', 'infinite', filters] as const,
  },

  /** Analytics queries */
  analytics: {
    all: (filters: AnalyticsFilters) => ['analytics', filters] as const,
    summary: (filters: AnalyticsFilters) => ['analytics', 'summary', filters] as const,
    trends: (filters: AnalyticsFilters) => ['analytics', 'trends', filters] as const,
    channels: (filters: AnalyticsFilters) => ['analytics', 'channels', filters] as const,
    products: (filters: AnalyticsFilters) => ['analytics', 'products', filters] as const,
  },

  /** Product queries */
  products: {
    all: (brandIds: string[]) => ['products', brandIds] as const,
    list: (brandIds: string[], filters?: ProductFilters) => ['products', 'list', brandIds, filters] as const,
    detail: (productId: string) => ['products', 'detail', productId] as const,
  },

  /** Report queries */
  reports: {
    all: (companyIds: string[]) => ['reports', companyIds] as const,
    scheduled: (companyIds: string[]) => ['reports', 'scheduled', companyIds] as const,
    history: (companyIds: string[]) => ['reports', 'history', companyIds] as const,
  },

  /** Objectives queries */
  objectives: {
    all: (restaurantIds: string[]) => ['objectives', restaurantIds] as const,
    list: (filters: ObjectivesFilters) => ['objectives', 'list', filters] as const,
    detail: (objectiveId: string) => ['objectives', 'detail', objectiveId] as const,
  },

  /** Strategic objectives (OKRs) */
  strategicObjectives: {
    all: (restaurantIds: string[]) => ['strategic-objectives', restaurantIds] as const,
    byHorizon: (restaurantIds: string[], horizon: string) =>
      ['strategic-objectives', 'horizon', restaurantIds, horizon] as const,
    detail: (id: string) => ['strategic-objectives', 'detail', id] as const,
  },

  /** Strategic tasks (linked to objectives) */
  strategicTasks: {
    all: (restaurantIds: string[]) => ['strategic-tasks', restaurantIds] as const,
    pending: (restaurantIds: string[]) => ['strategic-tasks', 'pending', restaurantIds] as const,
    completed: (restaurantIds: string[]) => ['strategic-tasks', 'completed', restaurantIds] as const,
    byObjective: (objectiveId: string) => ['strategic-tasks', 'objective', objectiveId] as const,
    byDateRange: (restaurantIds: string[], startDate: string, endDate: string) =>
      ['strategic-tasks', 'range', restaurantIds, startDate, endDate] as const,
    detail: (id: string) => ['strategic-tasks', 'detail', id] as const,
  },

  /** Task areas and subareas */
  taskAreas: {
    all: ['task-areas'] as const,
    subareas: (areaId?: string) => ['task-subareas', areaId] as const,
  },

  /** Tasks */
  tasks: {
    all: (restaurantIds: string[]) => ['tasks', restaurantIds] as const,
    pending: (restaurantIds: string[]) => ['tasks', 'pending', restaurantIds] as const,
    completed: (restaurantIds: string[]) => ['tasks', 'completed', restaurantIds] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },

  /** Profiles (for task owners) */
  profiles: {
    all: ['profiles'] as const,
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },

  /** Audit types */
  auditTypes: {
    all: ['audit-types'] as const,
    detail: (id: string) => ['audit-types', 'detail', id] as const,
    bySlug: (slug: string) => ['audit-types', 'slug', slug] as const,
  },

  /** Audits */
  audits: {
    all: ['audits'] as const,
    list: (filters: AuditFilters) => ['audits', 'list', filters] as const,
    detail: (id: string) => ['audits', 'detail', id] as const,
    withDetails: (id: string) => ['audits', 'with-details', id] as const,
  },

  /** Promotional Campaigns */
  campaigns: {
    all: ['campaigns'] as const,
    list: (filters: CampaignFilters) => ['campaigns', 'list', filters] as const,
    byRestaurant: (restaurantId: string) => ['campaigns', 'restaurant', restaurantId] as const,
    byMonth: (restaurantIds: string[], year: number, month: number) =>
      ['campaigns', 'month', restaurantIds, year, month] as const,
    detail: (id: string) => ['campaigns', 'detail', id] as const,
  },

  /** Calendar Events */
  calendarEvents: {
    all: ['calendar-events'] as const,
    byMonth: (year: number, month: number, countryCode?: string) =>
      ['calendar-events', 'month', year, month, countryCode] as const,
    byDateRange: (startDate: string, endDate: string) =>
      ['calendar-events', 'range', startDate, endDate] as const,
  },

  /** Weather Forecast */
  weather: {
    byLocation: (lat: number, lng: number) => ['weather', lat, lng] as const,
    byRestaurant: (restaurantId: string) => ['weather', 'restaurant', restaurantId] as const,
  },
  /** Sales Projections */
  salesProjections: {
    byScope: (companyId: string, brandId?: string | null, addressId?: string | null) =>
      ['sales-projections', companyId, brandId ?? '__NULL__', addressId ?? '__NULL__'] as const,
  },
} as const;
