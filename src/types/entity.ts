// ============================================
// COMPANY (Compañía/Holding - Nivel 1)
// ============================================
// Ej: Restalia Holding, Alsea, Grupo Vips

import type { ChannelId } from './channel';

/**
 * Company from Supabase companies table
 */
export type CompanyStatus = 'Onboarding' | 'Cliente Activo' | 'Stand By' | 'PiP';

export interface Company {
  id: string;                       // UUID
  externalId?: number | null;       // pk_id_company from Athena
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  status?: CompanyStatus | null;    // Status del cliente
  keyAccountManager?: string | null; // Assigned Key Account Manager
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BRAND (Marca - Nivel 2)
// ============================================
// Ej: 100 Montaditos, TGB, La Sureña, Foster's Hollywood

/**
 * Brand from Supabase brands table
 */
export interface Brand {
  id: string;                       // UUID (primary, most recent)
  allIds: string[];                 // All IDs that share this name (for multi-portal dedup)
  externalId?: number | null;       // pk_id_store from Athena
  companyId: string;                // FK → Company (UUID)
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AREA (Ciudad/Zona - Geographic)
// ============================================
// Ej: Madrid, Barcelona, Valencia
// Note: Areas are geographic, not brand-specific

/**
 * Area from Supabase areas table
 */
export interface Area {
  id: string;                       // UUID
  externalId?: number | null;       // pk_id from Athena
  name: string;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// RESTAURANT (Local/Restaurante - Nivel 4)
// ============================================
// Ej: Calle Gran Vía 42, Paseo de Gracia 15

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Restaurant from Supabase restaurants table
 */
export interface Restaurant {
  id: string;                       // UUID (primary, most recent)
  allIds: string[];                 // All IDs that share this name (for multi-portal dedup)
  externalId?: number | null;       // pk_id_address from Athena
  companyId: string;                // FK → Company (UUID)
  brandId: string;                  // FK → Brand (UUID)
  areaId: string | null;            // FK → Area (UUID, optional)
  name: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryRadiusKm?: number | null;
  activeChannels: ChannelId[];      // ['glovo', 'ubereats', 'justeat']
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Restaurant with joined brand and area data
 */
export interface RestaurantWithDetails extends Restaurant {
  brandName?: string;
  areaName?: string;
  companyName?: string;
}

// ============================================
// SUPABASE DATABASE TYPES (Entity)
// ============================================

export interface DbCompany {
  id: string;
  external_id: number | null;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBrand {
  id: string;
  external_id: number | null;
  company_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbArea {
  id: string;
  external_id: number | null;
  name: string;
  country: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface DbRestaurant {
  id: string;
  external_id: number | null;
  company_id: string;
  brand_id: string;
  area_id: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_radius_km: number | null;
  active_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
