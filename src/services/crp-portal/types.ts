/**
 * CRP Portal Database Types
 *
 * This module defines the database schema types for the CRP Portal tables.
 * These types represent the raw data structure from Supabase tables prefixed with crp_portal__.
 *
 * @module services/crp-portal/types
 *
 * SOLID Principles Applied:
 * - Interface Segregation: Each entity has its own specific interface
 * - Single Responsibility: Only defines types, no logic
 *
 * Database Naming Convention (CRP Portal):
 * - pk_id_* : Primary key columns
 * - pfk_id_* : Foreign key columns
 * - des_* : Description/text columns
 * - flg_* : Flag/boolean columns
 * - td_* : Date columns
 * - url_* : URL columns
 */

// ============================================
// COMPANY STATUS
// ============================================

/**
 * Valid status values for companies in the portal.
 * Only companies with these statuses are shown to users.
 */
export const VALID_COMPANY_STATUSES = [
  'Onboarding',
  'Cliente Activo',
  'Stand By',
  'PiP',
] as const;

export type CompanyStatus = typeof VALID_COMPANY_STATUSES[number];

// ============================================
// DATABASE ROW TYPES
// ============================================

/**
 * Raw database row from crp_portal__dt_company table.
 * Represents a client company in ThinkPaladar's system.
 */
export interface DbCrpCompany {
  /** Primary key - unique company identifier */
  pk_id_company: number;
  /** Company name */
  des_company_name: string;
  /** Company status (Onboarding, Cliente Activo, Stand By, PiP) */
  des_status: string;
  /** Assigned Key Account Manager */
  des_key_account_manager: string | null;
  /** URL to Paladar Portal */
  url_paladar_portal: string | null;
  /** Contract signature date */
  td_firma_contrato: string | null;
  /** Soft delete flag (0 = active, 1 = deleted) */
  flg_deleted?: number;
  /** Month of the snapshot (e.g., '2026-01-01') */
  pk_ts_month: string;
}

/**
 * Raw database row from crp_portal__dt_store table.
 * Represents a brand/store owned by a company.
 */
export interface DbCrpStore {
  /** Primary key - unique store identifier */
  pk_id_store: number;
  /** Store/brand name */
  des_store: string;
  /** Foreign key to company */
  pfk_id_company: number;
  /** Soft delete flag */
  flg_deleted?: number;
  /** Month of the snapshot (e.g., '2026-01-01') */
  pk_ts_month: string;
}

/**
 * Raw database row from crp_portal__dt_address table.
 * Represents a physical restaurant location.
 */
export interface DbCrpAddress {
  /** Primary key - unique address identifier */
  pk_id_address: number;
  /** Address/location name */
  des_address: string;
  /** Foreign key to company */
  pfk_id_company: number;
  /** Foreign key to store (does NOT exist in actual table — optional for safety) */
  pfk_id_store?: number | null;
  /** Foreign key to business area (does NOT exist in actual table — optional for safety) */
  pfk_id_business_area?: number | null;
  /** Latitude coordinate (does NOT exist in actual table — use tphub_restaurant_coordinates) */
  des_latitude?: number | null;
  /** Longitude coordinate (does NOT exist in actual table — use tphub_restaurant_coordinates) */
  des_longitude?: number | null;
  /** Soft delete flag */
  flg_deleted?: number;
  /** Month of the snapshot (e.g., '2026-01-01') */
  pk_ts_month: string;
}

/**
 * Raw database row from crp_portal__ct_business_area table.
 * Represents a geographic business area (city/region).
 */
export interface DbCrpBusinessArea {
  /** Primary key - unique business area identifier */
  pk_id_business_area: number;
  /** Business area name */
  des_business_area: string;
  /** Soft delete flag */
  flg_deleted?: number;
}

/**
 * Raw database row from crp_portal__dt_portal table.
 * Represents a delivery platform (Glovo, UberEats, JustEat).
 */
export interface DbCrpPortal {
  /** Primary key - unique portal identifier */
  pk_id_portal: number;
  /** Portal/platform name */
  des_portal: string;
  /** Soft delete flag */
  flg_deleted?: number;
}

// ============================================
// QUERY PARAMETERS
// ============================================

/**
 * Parameters for fetching restaurants with optional filtering.
 */
export interface FetchRestaurantsParams {
  /** Filter by company IDs */
  companyIds?: string[];
  /** Filter by brand/store IDs (handled at hook level due to DB limitations) */
  brandIds?: string[];
  /** Filter by business area IDs */
  areaIds?: string[];
}

/**
 * Portal entity for frontend use.
 */
export interface Portal {
  id: string;
  name: string;
}

// ============================================
// ORDER HEAD (Cabecera de pedidos)
// ============================================

/**
 * Portal ID constants for channel mapping.
 * Maps internal portal IDs to channel names.
 */
export const PORTAL_IDS = {
  GLOVO: 'E22BC362',        // Glovo original
  GLOVO_NEW: 'E22BC362-2',  // Glovo Nuevo (post-migración)
  UBEREATS: '3CCD6861',
  // JUSTEAT ID pending - will return null in getPortalIdForPlatform
} as const;

export type PortalId = typeof PORTAL_IDS[keyof typeof PORTAL_IDS];

// ============================================
// RESTAURANT COORDINATES (Nueva tabla unificada)
// ============================================

/**
 * Raw database row from tphub_restaurant_coordinates table.
 * Contains deduplicated restaurant addresses with geocoded coordinates.
 */
export interface DbRestaurantCoordinate {
  /** UUID primary key */
  id: string;
  /** Normalized address for deduplication (e.g., "mozart 5") */
  normalized_address: string;
  /** Full display address (e.g., "Calle de Mozart 5, 28008 Madrid, España") */
  display_address: string;
  /** Latitude coordinate from Mapbox */
  latitude: number | null;
  /** Longitude coordinate from Mapbox */
  longitude: number | null;
  /** Company ID reference (pfk_id_company as string) */
  company_id: string;
  /** Original CRP address ID (pk_id_address as string) */
  crp_address_id: string;
  /** Brand/store ID reference (pfk_id_store as string, nullable) */
  brand_id: string | null;
  /** Business area ID reference (pfk_id_business_area as string, nullable) */
  area_id: string | null;
  /** Geocoding confidence score (0-1) */
  geocode_confidence: number | null;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
}

/**
 * Parameters for fetching restaurant coordinates.
 */
export interface FetchCoordinatesParams {
  /** Filter by company IDs */
  companyIds?: string[];
  /** Filter by brand/store IDs */
  brandIds?: string[];
  /** Filter by business area IDs */
  areaIds?: string[];
  /** Minimum geocode confidence (0-1), default 0 */
  minConfidence?: number;
}

/**
 * Raw database row from crp_portal__ft_order_head table.
 * Represents a sales order from delivery platforms.
 */
export interface DbCrpOrderHead {
  /** Primary key - unique order identifier */
  pk_uuid_order: string;
  /** Foreign key to company */
  pfk_id_company: number;
  /** Foreign key to store/brand */
  pfk_id_store: number;
  /** Foreign key to store address */
  pfk_id_store_address: number;
  /** Foreign key to portal (delivery platform) */
  pfk_id_portal: string;
  /** Order creation timestamp */
  td_creation_time: string;
  /** Total order amount in EUR */
  amt_total_price: number;
  /** Promotional discounts in EUR */
  amt_promotions: number | null;
  /** Refunds amount in EUR */
  amt_refunds: number | null;
  /** Customer identifier */
  cod_id_customer: string | null;
}

// ============================================
// REVIEW (Reseñas)
// ============================================

/**
 * Raw database row from crp_portal__ft_review table.
 * Represents a customer review from delivery platforms.
 */
export interface DbCrpReview {
  /** Primary key - unique review identifier */
  pk_id_review: string;
  /** Foreign key to order */
  fk_id_order: string;
  /** Foreign key to company */
  pfk_id_company: string;
  /** Foreign key to store/brand */
  pfk_id_store: string;
  /** Foreign key to store address */
  pfk_id_store_address: string;
  /** Foreign key to portal (delivery platform) */
  pfk_id_portal: string;
  /** Review creation timestamp */
  ts_creation_time: string;
  /** Rating value (1-5) */
  val_rating: number;
}

// ============================================
// HUBSPOT CONTACT TYPES
// ============================================

/**
 * Raw database row from crp_hubspot__dt_contact_mp table.
 * Represents a HubSpot contact.
 */
export interface DbHubspotContact {
  pk_id_contact: string;
  des_first_name: string;
  des_last_name: string;
  des_email: string;
  pk_ts_month: string;
}

/**
 * Raw database row from crp_hubspot__lt_company_contact_mp table.
 * Maps HubSpot contacts to companies.
 */
export interface DbHubspotCompanyContact {
  pk_id_contact: string;
  pk_id_company: string;
  pk_ts_month: string;
}
