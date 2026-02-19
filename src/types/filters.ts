// ============================================
// TIPOS DE FILTROS (2 NIVELES)
// ============================================

import type { ChannelId } from './channel';

export interface DateRange {
  start: Date;
  end: Date;
}

export type DatePreset =
  | 'this_week'
  | 'this_month'
  | 'last_week'
  | 'last_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_12_weeks'
  | 'last_12_months'
  | 'custom';

// FILTRO GLOBAL (Navbar - persiste en todas las páginas)
export interface GlobalFilters {
  companyIds: string[];             // Múltiple selección (vacío = todas)
}

// FILTROS DE DASHBOARD (por página)
export interface DashboardFilters {
  brandIds: string[];               // Múltiple selección (vacío = todas)
  areaIds: string[];                // Múltiple selección (vacío = todas)
  restaurantIds: string[];          // Múltiple selección (vacío = todos)
  channelIds: ChannelId[];          // Múltiple selección (vacío = todos)
  dateRange: DateRange;
  datePreset: DatePreset;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
