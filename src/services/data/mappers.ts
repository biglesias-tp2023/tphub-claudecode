/**
 * Mappers: Convert DB types to Frontend types
 */

import type {
  Company,
  Brand,
  Area,
  Restaurant,
  Profile,
  RestaurantKpis,
  ChannelId,
  UserRole,
  PeriodType,
  DbCompany,
  DbBrand,
  DbArea,
  DbRestaurant,
  DbProfile,
  DbRestaurantKpis,
} from '@/types';

export function mapDbCompanyToCompany(db: DbCompany): Company {
  return {
    id: db.id,
    externalId: db.external_id,
    name: db.name,
    slug: db.slug,
    logoUrl: db.logo_url,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapDbBrandToBrand(db: DbBrand): Brand {
  return {
    id: db.id,
    allIds: [db.id],
    externalId: db.external_id,
    companyId: db.company_id,
    name: db.name,
    slug: db.slug,
    logoUrl: db.logo_url,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapDbAreaToArea(db: DbArea): Area {
  return {
    id: db.id,
    externalId: db.external_id,
    name: db.name,
    country: db.country,
    timezone: db.timezone,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

export function mapDbRestaurantToRestaurant(db: DbRestaurant): Restaurant {
  return {
    id: db.id,
    allIds: [db.id],
    externalId: db.external_id,
    companyId: db.company_id,
    brandId: db.brand_id,
    areaId: db.area_id,
    name: db.name,
    address: db.address,
    latitude: db.latitude,
    longitude: db.longitude,
    deliveryRadiusKm: db.delivery_radius_km,
    activeChannels: db.active_channels as ChannelId[],
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapDbProfileToProfile(db: DbProfile): Profile {
  return {
    id: db.id,
    email: db.email,
    fullName: db.full_name,
    avatarUrl: db.avatar_url,
    role: db.role as UserRole,
    assignedCompanyIds: db.assigned_company_ids,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapDbKpisToKpis(db: DbRestaurantKpis): RestaurantKpis {
  return {
    id: db.id,
    restaurantId: db.restaurant_id,
    periodDate: db.period_date,
    periodType: db.period_type as PeriodType,
    totalOrders: db.total_orders,
    totalRevenue: db.total_revenue,
    avgTicket: db.avg_ticket,
    avgDeliveryTimeMin: db.avg_delivery_time_min,
    avgRating: db.avg_rating,
    newCustomers: db.new_customers,
    newCustomerPct: db.new_customer_pct,
    ordersGlovo: db.orders_glovo,
    ordersUbereats: db.orders_ubereats,
    ordersJusteat: db.orders_justeat,
    revenueGlovo: db.revenue_glovo,
    revenueUbereats: db.revenue_ubereats,
    revenueJusteat: db.revenue_justeat,
    incidenceCount: db.incidence_count,
    incidenceRate: db.incidence_rate,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
