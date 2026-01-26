/**
 * CRP Portal Data Mappers
 *
 * Functions to transform database row types to frontend model types.
 * These mappers handle the translation between CRP Portal's database schema
 * and the application's domain models.
 *
 * @module services/crp-portal/mappers
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles data transformation
 * - Open/Closed: New mappers can be added without modifying existing ones
 * - Dependency Inversion: Depends on type abstractions, not concrete implementations
 */

import type { Company, Brand, Area, Restaurant, ChannelId } from '@/types';
import type {
  DbCrpCompany,
  DbCrpStore,
  DbCrpAddress,
  DbCrpBusinessArea,
  DbCrpPortal,
  Portal,
} from './types';
import { generateSlug } from './utils';

/**
 * Maps a CRP Portal company database row to a Company domain model.
 *
 * @param db - Raw database row from crp_portal__dt_company
 * @returns Company domain model
 *
 * Field mappings:
 * - pk_id_company → id (string), externalId (number)
 * - des_company_name → name, slug
 * - des_status → status
 * - td_firma_contrato → createdAt
 */
export function mapCompany(db: DbCrpCompany): Company {
  return {
    id: String(db.pk_id_company),
    externalId: db.pk_id_company,
    name: db.des_company_name,
    slug: generateSlug(db.des_company_name),
    logoUrl: null,
    status: db.des_status as Company['status'],
    keyAccountManager: db.des_key_account_manager,
    isActive: true,
    createdAt: db.td_firma_contrato || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps a CRP Portal store database row to a Brand domain model.
 *
 * @param db - Raw database row from crp_portal__dt_store
 * @returns Brand domain model
 *
 * Field mappings:
 * - pk_id_store → id (string), externalId (number)
 * - des_store → name, slug
 * - pfk_id_company → companyId
 */
export function mapBrand(db: DbCrpStore): Brand {
  return {
    id: String(db.pk_id_store),
    externalId: db.pk_id_store,
    companyId: String(db.pfk_id_company),
    name: db.des_store,
    slug: generateSlug(db.des_store),
    logoUrl: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps a CRP Portal address database row to a Restaurant domain model.
 *
 * @param db - Raw database row from crp_portal__dt_address
 * @returns Restaurant domain model
 *
 * Field mappings:
 * - pk_id_address → id (string), externalId (number)
 * - des_address → name, address
 * - pfk_id_company → companyId
 * - pfk_id_store → brandId (defaults to '0' if null)
 * - pfk_id_business_area → areaId (null if not set)
 * - des_latitude/des_longitude → latitude/longitude
 *
 * Note: activeChannels defaults to all channels as the database
 * doesn't store channel information per address.
 */
export function mapRestaurant(db: DbCrpAddress): Restaurant {
  return {
    id: String(db.pk_id_address),
    externalId: db.pk_id_address,
    companyId: String(db.pfk_id_company),
    brandId: String(db.pfk_id_store || 0),
    areaId: db.pfk_id_business_area ? String(db.pfk_id_business_area) : null,
    name: db.des_address,
    address: db.des_address,
    latitude: db.des_latitude,
    longitude: db.des_longitude,
    deliveryRadiusKm: null,
    activeChannels: ['glovo', 'ubereats', 'justeat'] as ChannelId[],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps a CRP Portal business area database row to an Area domain model.
 *
 * @param db - Raw database row from crp_portal__ct_business_area
 * @returns Area domain model
 *
 * Field mappings:
 * - pk_id_business_area → id (string), externalId (number)
 * - des_business_area → name
 *
 * Note: country and timezone default to Spain values as CRP Portal
 * currently only operates in Spain.
 */
export function mapArea(db: DbCrpBusinessArea): Area {
  return {
    id: String(db.pk_id_business_area),
    externalId: db.pk_id_business_area,
    name: db.des_business_area,
    country: 'ES',
    timezone: 'Europe/Madrid',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Maps a CRP Portal portal database row to a Portal domain model.
 *
 * @param db - Raw database row from crp_portal__dt_portal
 * @returns Portal domain model
 */
export function mapPortal(db: DbCrpPortal): Portal {
  return {
    id: String(db.pk_id_portal),
    name: db.des_portal,
  };
}
