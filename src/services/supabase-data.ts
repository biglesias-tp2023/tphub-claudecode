/**
 * Supabase Data Service
 *
 * This service handles all data operations with Supabase for the TPHub portal.
 * Replaces the previous AWS Lambda + Athena backend.
 */

import { supabase } from './supabase';
import {
  isDevMode,
  mockCompanies,
  mockBrands,
  mockAreas,
  mockRestaurants,
  mockKpis,
  mockStrategicObjectives,
  mockStrategicTasks,
  addMockStrategicObjective,
  updateMockStrategicObjective,
  deleteMockStrategicObjective,
  addMockStrategicTask,
  updateMockStrategicTask,
  deleteMockStrategicTask,
} from './mock-data';
import type {
  Company,
  Brand,
  Area,
  Restaurant,
  Profile,
  RestaurantKpis,
  RestaurantObjective,
  RestaurantObjectiveInput,
  StrategicObjective,
  StrategicObjectiveInput,
  StrategicTask,
  StrategicTaskInput,
  StrategicTaskWithDetails,
  TaskArea,
  TaskSubarea,
  Task,
  TaskInput,
  ChannelId,
  UserRole,
  InvestmentMode,
  ObjectiveHorizon,
  ObjectiveStatus,
  ObjectiveCategory,
  ObjectiveResponsible,
  ObjectivePriority,
  DbCompany,
  DbBrand,
  DbArea,
  DbRestaurant,
  DbProfile,
  DbRestaurantKpis,
  DbRestaurantObjective,
  DbStrategicObjective,
  DbStrategicTask,
  DbTaskArea,
  DbTaskSubarea,
  DbTask,
  PeriodType,
} from '@/types';

// ============================================
// MAPPERS: Convert DB types to Frontend types
// ============================================

function mapDbCompanyToCompany(db: DbCompany): Company {
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

function mapDbBrandToBrand(db: DbBrand): Brand {
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

function mapDbAreaToArea(db: DbArea): Area {
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

function mapDbRestaurantToRestaurant(db: DbRestaurant): Restaurant {
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

function mapDbProfileToProfile(db: DbProfile): Profile {
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

function mapDbKpisToKpis(db: DbRestaurantKpis): RestaurantKpis {
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

// ============================================
// COMPANIES
// ============================================

/**
 * Fetch all companies (RLS will filter based on user's assigned companies)
 */
export async function fetchCompanies(): Promise<Company[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockCompanies;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(`Error fetching companies: ${error.message}`);
  return (data as DbCompany[]).map(mapDbCompanyToCompany);
}

/**
 * Fetch a single company by ID
 */
export async function fetchCompanyById(companyId: string): Promise<Company | null> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockCompanies.find((c) => c.id === companyId) || null;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Error fetching company: ${error.message}`);
  }
  return mapDbCompanyToCompany(data as DbCompany);
}

// ============================================
// BRANDS
// ============================================

/**
 * Fetch brands, optionally filtered by company IDs
 */
export async function fetchBrands(companyIds?: string[]): Promise<Brand[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let brands = mockBrands;
    if (companyIds && companyIds.length > 0) {
      brands = brands.filter((b) => companyIds.includes(b.companyId));
    }
    return brands.sort((a, b) => a.name.localeCompare(b.name));
  }

  let query = supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (companyIds && companyIds.length > 0) {
    query = query.in('company_id', companyIds);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching brands: ${error.message}`);
  return (data as DbBrand[]).map(mapDbBrandToBrand);
}

/**
 * Fetch a single brand by ID
 */
export async function fetchBrandById(brandId: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching brand: ${error.message}`);
  }
  return mapDbBrandToBrand(data as DbBrand);
}

// ============================================
// AREAS
// ============================================

/**
 * Fetch all areas (geographic, not company-specific)
 */
export async function fetchAreas(): Promise<Area[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockAreas.sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(`Error fetching areas: ${error.message}`);
  return (data as DbArea[]).map(mapDbAreaToArea);
}

/**
 * Fetch a single area by ID
 */
export async function fetchAreaById(areaId: string): Promise<Area | null> {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('id', areaId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching area: ${error.message}`);
  }
  return mapDbAreaToArea(data as DbArea);
}

// ============================================
// RESTAURANTS
// ============================================

interface FetchRestaurantsParams {
  companyIds?: string[];
  brandIds?: string[];
  areaIds?: string[];
}

/**
 * Fetch restaurants with optional filtering
 */
export async function fetchRestaurants(params: FetchRestaurantsParams = {}): Promise<Restaurant[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let restaurants = mockRestaurants;
    if (params.companyIds && params.companyIds.length > 0) {
      restaurants = restaurants.filter((r) => params.companyIds!.includes(r.companyId));
    }
    if (params.brandIds && params.brandIds.length > 0) {
      restaurants = restaurants.filter((r) => params.brandIds!.includes(r.brandId));
    }
    if (params.areaIds && params.areaIds.length > 0) {
      restaurants = restaurants.filter((r) => r.areaId && params.areaIds!.includes(r.areaId));
    }
    return restaurants.sort((a, b) => a.name.localeCompare(b.name));
  }

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }
  if (params.areaIds && params.areaIds.length > 0) {
    query = query.in('area_id', params.areaIds);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching restaurants: ${error.message}`);
  return (data as DbRestaurant[]).map(mapDbRestaurantToRestaurant);
}

/**
 * Fetch a single restaurant by ID
 */
export async function fetchRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching restaurant: ${error.message}`);
  }
  return mapDbRestaurantToRestaurant(data as DbRestaurant);
}

// ============================================
// PROFILES
// ============================================

/**
 * Fetch the current user's profile
 */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching profile: ${error.message}`);
  }
  return mapDbProfileToProfile(data as DbProfile);
}

/**
 * Fetch all profiles (admin only - RLS enforced)
 */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');

  if (error) throw new Error(`Error fetching profiles: ${error.message}`);
  return (data as DbProfile[]).map(mapDbProfileToProfile);
}

/**
 * Update a user's profile (admin can update any, users can update their own)
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<{
    fullName: string;
    avatarUrl: string;
    role: UserRole;
    assignedCompanyIds: string[];
  }>
): Promise<Profile> {
  const dbUpdates: Partial<DbProfile> = {};

  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.assignedCompanyIds !== undefined) {
    dbUpdates.assigned_company_ids = updates.assignedCompanyIds;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw new Error(`Error updating profile: ${error.message}`);
  return mapDbProfileToProfile(data as DbProfile);
}

/**
 * Delete a user's profile (admin/superadmin only, owner cannot be deleted)
 *
 * Note: This only deletes the profile record, not the auth.users entry.
 * The user won't be able to access TPHub but their Supabase auth account remains.
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    // Check for owner protection trigger
    if (error.message?.includes('Cannot delete owner')) {
      throw new Error('No se puede eliminar la cuenta del Owner');
    }
    throw new Error(`Error deleting profile: ${error.message}`);
  }
}

// ============================================
// RESTAURANT KPIs
// ============================================

interface FetchKpisParams {
  restaurantIds?: string[];
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
}

/**
 * Fetch restaurant KPIs with optional filtering
 */
export async function fetchRestaurantKpis(params: FetchKpisParams = {}): Promise<RestaurantKpis[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let kpis = mockKpis;
    if (params.restaurantIds && params.restaurantIds.length > 0) {
      kpis = kpis.filter((k) => params.restaurantIds!.includes(k.restaurantId));
    }
    if (params.startDate) {
      kpis = kpis.filter((k) => k.periodDate >= params.startDate!);
    }
    if (params.endDate) {
      kpis = kpis.filter((k) => k.periodDate <= params.endDate!);
    }
    if (params.periodType) {
      kpis = kpis.filter((k) => k.periodType === params.periodType);
    }
    return kpis.sort((a, b) => b.periodDate.localeCompare(a.periodDate));
  }

  let query = supabase
    .from('restaurant_kpis')
    .select('*')
    .order('period_date', { ascending: false });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.startDate) {
    query = query.gte('period_date', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('period_date', params.endDate);
  }
  if (params.periodType) {
    query = query.eq('period_type', params.periodType);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching KPIs: ${error.message}`);
  return (data as DbRestaurantKpis[]).map(mapDbKpisToKpis);
}

/**
 * Fetch aggregated KPIs for multiple restaurants
 */
export async function fetchAggregatedKpis(params: FetchKpisParams = {}): Promise<{
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  avgRating: number | null;
  ordersByChannel: { glovo: number; ubereats: number; justeat: number };
  revenueByChannel: { glovo: number; ubereats: number; justeat: number };
}> {
  const kpis = await fetchRestaurantKpis(params);

  if (kpis.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgTicket: 0,
      avgRating: null,
      ordersByChannel: { glovo: 0, ubereats: 0, justeat: 0 },
      revenueByChannel: { glovo: 0, ubereats: 0, justeat: 0 },
    };
  }

  const totalOrders = kpis.reduce((sum, k) => sum + k.totalOrders, 0);
  const totalRevenue = kpis.reduce((sum, k) => sum + k.totalRevenue, 0);
  const ratingsWithValues = kpis.filter((k) => k.avgRating !== null);
  const avgRating = ratingsWithValues.length > 0
    ? ratingsWithValues.reduce((sum, k) => sum + (k.avgRating || 0), 0) / ratingsWithValues.length
    : null;

  return {
    totalOrders,
    totalRevenue,
    avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    avgRating,
    ordersByChannel: {
      glovo: kpis.reduce((sum, k) => sum + k.ordersGlovo, 0),
      ubereats: kpis.reduce((sum, k) => sum + k.ordersUbereats, 0),
      justeat: kpis.reduce((sum, k) => sum + k.ordersJusteat, 0),
    },
    revenueByChannel: {
      glovo: kpis.reduce((sum, k) => sum + k.revenueGlovo, 0),
      ubereats: kpis.reduce((sum, k) => sum + k.revenueUbereats, 0),
      justeat: kpis.reduce((sum, k) => sum + k.revenueJusteat, 0),
    },
  };
}

// ============================================
// RESTAURANT OBJECTIVES
// ============================================

function mapDbObjectiveToObjective(db: DbRestaurantObjective): RestaurantObjective {
  return {
    id: db.id,
    restaurantId: db.restaurant_id,
    channel: db.channel as ChannelId,
    periodMonth: db.period_month,
    revenueTarget: db.revenue_target,
    adsInvestmentMode: db.ads_investment_mode as InvestmentMode,
    adsInvestmentValue: db.ads_investment_value,
    promosInvestmentMode: db.promos_investment_mode as InvestmentMode,
    promosInvestmentValue: db.promos_investment_value,
    foodcostTarget: db.foodcost_target,
    marginTarget: db.margin_target,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchObjectivesParams {
  restaurantIds?: string[];
  channels?: ChannelId[];
  startMonth?: string;
  endMonth?: string;
}

/**
 * Fetch restaurant objectives with optional filtering
 */
export async function fetchRestaurantObjectives(
  params: FetchObjectivesParams = {}
): Promise<RestaurantObjective[]> {
  let query = supabase
    .from('restaurant_objectives')
    .select('*')
    .order('period_month', { ascending: true });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.channels && params.channels.length > 0) {
    query = query.in('channel', params.channels);
  }
  if (params.startMonth) {
    query = query.gte('period_month', params.startMonth);
  }
  if (params.endMonth) {
    query = query.lte('period_month', params.endMonth);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching objectives: ${error.message}`);
  return (data as DbRestaurantObjective[]).map(mapDbObjectiveToObjective);
}

/**
 * Upsert (create or update) a restaurant objective
 */
export async function upsertRestaurantObjective(
  input: RestaurantObjectiveInput
): Promise<RestaurantObjective> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    restaurant_id: input.restaurantId,
    channel: input.channel,
    period_month: input.periodMonth,
    revenue_target: input.revenueTarget,
    ads_investment_mode: input.adsInvestmentMode,
    ads_investment_value: input.adsInvestmentValue,
    promos_investment_mode: input.promosInvestmentMode,
    promos_investment_value: input.promosInvestmentValue,
    foodcost_target: input.foodcostTarget,
    updated_by: userId,
  };

  // Check if objective already exists
  const { data: existing } = await supabase
    .from('restaurant_objectives')
    .select('id')
    .eq('restaurant_id', input.restaurantId)
    .eq('channel', input.channel)
    .eq('period_month', input.periodMonth)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('restaurant_objectives')
      .update(dbInput)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Error updating objective: ${error.message}`);
    return mapDbObjectiveToObjective(data as DbRestaurantObjective);
  } else {
    // Create new
    const { data, error } = await supabase
      .from('restaurant_objectives')
      .insert({ ...dbInput, created_by: userId })
      .select()
      .single();

    if (error) throw new Error(`Error creating objective: ${error.message}`);
    return mapDbObjectiveToObjective(data as DbRestaurantObjective);
  }
}

/**
 * Bulk upsert multiple restaurant objectives
 */
export async function bulkUpsertRestaurantObjectives(
  inputs: RestaurantObjectiveInput[]
): Promise<RestaurantObjective[]> {
  const results: RestaurantObjective[] = [];

  for (const input of inputs) {
    const result = await upsertRestaurantObjective(input);
    results.push(result);
  }

  return results;
}

/**
 * Delete a restaurant objective
 */
export async function deleteRestaurantObjective(id: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_objectives')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting objective: ${error.message}`);
}

// ============================================
// STRATEGIC OBJECTIVES (OKRs)
// ============================================

// Priority mapping: DB uses integers, TypeScript uses strings
const PRIORITY_DB_TO_TS: Record<number, ObjectivePriority> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};

const PRIORITY_TS_TO_DB: Record<ObjectivePriority, number> = {
  critical: 1,
  high: 1,
  medium: 2,
  low: 3,
};

function mapDbStrategicObjective(db: DbStrategicObjective): StrategicObjective {
  // Parse fieldData from JSON string
  let fieldData = null;
  if (db.field_data) {
    try {
      fieldData = JSON.parse(db.field_data);
    } catch {
      fieldData = null;
    }
  }

  return {
    id: db.id,
    companyId: db.company_id,
    brandId: db.brand_id,
    addressId: db.address_id,
    title: db.title,
    description: db.description,
    category: db.category as ObjectiveCategory,
    objectiveTypeId: db.objective_type_id || '',
    horizon: db.horizon as ObjectiveHorizon,
    status: db.status as ObjectiveStatus,
    responsible: (db.responsible as ObjectiveResponsible) || 'thinkpaladar',
    kpiType: db.kpi_type,
    kpiCurrentValue: db.kpi_current_value,
    kpiTargetValue: db.kpi_target_value,
    kpiUnit: db.kpi_unit,
    // Progress tracking fields
    baselineValue: db.baseline_value,
    baselineDate: db.baseline_date,
    targetDirection: (db.target_direction as 'increase' | 'decrease' | 'maintain') || 'increase',
    // Priority and archiving (DB integer → TS string)
    priority: PRIORITY_DB_TO_TS[Number(db.priority)] || 'medium',
    isArchived: db.is_archived || false,
    fieldData,
    evaluationDate: db.evaluation_date,
    completedAt: db.completed_at,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchStrategicObjectivesParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  horizon?: ObjectiveHorizon;
  status?: ObjectiveStatus;
}

/**
 * Fetch strategic objectives with optional filtering
 */
export async function fetchStrategicObjectives(
  params: FetchStrategicObjectivesParams = {}
): Promise<StrategicObjective[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let objectives = [...mockStrategicObjectives];
    if (params.companyIds && params.companyIds.length > 0) {
      objectives = objectives.filter((o) => params.companyIds!.includes(o.companyId));
    }
    if (params.brandIds && params.brandIds.length > 0) {
      objectives = objectives.filter((o) => o.brandId && params.brandIds!.includes(o.brandId));
    }
    if (params.addressIds && params.addressIds.length > 0) {
      objectives = objectives.filter((o) => o.addressId && params.addressIds!.includes(o.addressId));
    }
    if (params.horizon) {
      objectives = objectives.filter((o) => o.horizon === params.horizon);
    }
    if (params.status) {
      objectives = objectives.filter((o) => o.status === params.status);
    }
    return objectives.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  let query = supabase
    .from('strategic_objectives')
    .select('*')
    .order('display_order', { ascending: true });

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }
  if (params.addressIds && params.addressIds.length > 0) {
    query = query.in('address_id', params.addressIds);
  }
  if (params.horizon) {
    query = query.eq('horizon', params.horizon);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching strategic objectives: ${error.message}`);
  return (data as DbStrategicObjective[]).map(mapDbStrategicObjective);
}

/**
 * Fetch a single strategic objective by ID
 */
export async function fetchStrategicObjectiveById(
  id: string
): Promise<StrategicObjective | null> {
  // Return mock data in dev mode
  if (isDevMode) {
    const objective = mockStrategicObjectives.find((o) => o.id === id);
    return objective || null;
  }

  const { data, error } = await supabase
    .from('strategic_objectives')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Error fetching strategic objective: ${error.message}`);
  }

  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Create a strategic objective
 */
export async function createStrategicObjective(
  input: StrategicObjectiveInput
): Promise<StrategicObjective> {
  // Mock mode: add to in-memory storage
  if (isDevMode) {
    return addMockStrategicObjective({
      companyId: input.companyId,
      brandId: input.brandId || null,
      addressId: input.addressId || null,
      title: input.title,
      description: input.description || null,
      category: input.category,
      objectiveTypeId: input.objectiveTypeId || '',
      horizon: input.horizon,
      status: input.status || 'pending',
      responsible: input.responsible || 'thinkpaladar',
      kpiType: input.kpiType || null,
      kpiCurrentValue: input.kpiCurrentValue || null,
      kpiTargetValue: input.kpiTargetValue || null,
      kpiUnit: input.kpiUnit || null,
      // Progress tracking fields
      baselineValue: input.baselineValue || null,
      baselineDate: input.baselineDate || new Date().toISOString().split('T')[0],
      targetDirection: input.targetDirection || 'increase',
      // Priority and archiving
      priority: input.priority || 'medium',
      isArchived: input.isArchived || false,
      fieldData: input.fieldData || null,
      evaluationDate: input.evaluationDate || null,
      completedAt: null,
      displayOrder: input.displayOrder || 0,
      createdBy: 'dev-user-001',
      updatedBy: 'dev-user-001',
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    company_id: input.companyId,
    brand_id: input.brandId || null,
    address_id: input.addressId || null,
    title: input.title,
    description: input.description || null,
    category: input.category,
    objective_type_id: input.objectiveTypeId || '',
    horizon: input.horizon,
    status: input.status || 'pending',
    responsible: input.responsible || 'thinkpaladar',
    kpi_type: input.kpiType || null,
    kpi_current_value: input.kpiCurrentValue || null,
    kpi_target_value: input.kpiTargetValue || null,
    kpi_unit: input.kpiUnit || null,
    // Progress tracking fields
    baseline_value: input.baselineValue || null,
    baseline_date: input.baselineDate || new Date().toISOString().split('T')[0],
    target_direction: input.targetDirection || 'increase',
    // Priority and archiving (TS string → DB integer)
    priority: PRIORITY_TS_TO_DB[input.priority || 'medium'] || 2,
    is_archived: input.isArchived || false,
    field_data: input.fieldData ? JSON.stringify(input.fieldData) : null,
    evaluation_date: input.evaluationDate || null,
    display_order: input.displayOrder || 0,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('strategic_objectives')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating strategic objective: ${error.message}`);
  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Update a strategic objective
 */
export async function updateStrategicObjective(
  id: string,
  updates: Partial<StrategicObjectiveInput> & { status?: ObjectiveStatus }
): Promise<StrategicObjective> {
  // Mock mode: update in-memory storage
  if (isDevMode) {
    const mockUpdates: Partial<StrategicObjective> = {};
    if (updates.title !== undefined) mockUpdates.title = updates.title;
    if (updates.description !== undefined) mockUpdates.description = updates.description;
    if (updates.category !== undefined) mockUpdates.category = updates.category;
    if (updates.horizon !== undefined) mockUpdates.horizon = updates.horizon;
    if (updates.status !== undefined) {
      mockUpdates.status = updates.status;
      if (updates.status === 'completed') {
        mockUpdates.completedAt = new Date().toISOString();
      }
    }
    if (updates.kpiType !== undefined) mockUpdates.kpiType = updates.kpiType;
    if (updates.kpiCurrentValue !== undefined) mockUpdates.kpiCurrentValue = updates.kpiCurrentValue;
    if (updates.kpiTargetValue !== undefined) mockUpdates.kpiTargetValue = updates.kpiTargetValue;
    if (updates.kpiUnit !== undefined) mockUpdates.kpiUnit = updates.kpiUnit;
    // Progress tracking fields
    if (updates.baselineValue !== undefined) mockUpdates.baselineValue = updates.baselineValue;
    if (updates.baselineDate !== undefined) mockUpdates.baselineDate = updates.baselineDate;
    if (updates.targetDirection !== undefined) mockUpdates.targetDirection = updates.targetDirection;
    // Priority and archiving
    if (updates.priority !== undefined) mockUpdates.priority = updates.priority;
    if (updates.isArchived !== undefined) mockUpdates.isArchived = updates.isArchived;
    if (updates.evaluationDate !== undefined) mockUpdates.evaluationDate = updates.evaluationDate;
    if (updates.displayOrder !== undefined) mockUpdates.displayOrder = updates.displayOrder;
    if (updates.responsible !== undefined) mockUpdates.responsible = updates.responsible;
    if (updates.objectiveTypeId !== undefined) mockUpdates.objectiveTypeId = updates.objectiveTypeId;

    const result = updateMockStrategicObjective(id, mockUpdates);
    if (!result) throw new Error(`Objective not found: ${id}`);
    return result;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  // Scope fields (CRP Portal references)
  if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
  if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
  if (updates.addressId !== undefined) dbUpdates.address_id = updates.addressId;

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.horizon !== undefined) dbUpdates.horizon = updates.horizon;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'completed') {
      dbUpdates.completed_at = new Date().toISOString();
    }
  }
  if (updates.kpiType !== undefined) dbUpdates.kpi_type = updates.kpiType;
  if (updates.kpiCurrentValue !== undefined) dbUpdates.kpi_current_value = updates.kpiCurrentValue;
  if (updates.kpiTargetValue !== undefined) dbUpdates.kpi_target_value = updates.kpiTargetValue;
  if (updates.kpiUnit !== undefined) dbUpdates.kpi_unit = updates.kpiUnit;
  // Progress tracking fields
  if (updates.baselineValue !== undefined) dbUpdates.baseline_value = updates.baselineValue;
  if (updates.baselineDate !== undefined) dbUpdates.baseline_date = updates.baselineDate;
  if (updates.targetDirection !== undefined) dbUpdates.target_direction = updates.targetDirection;
  // Priority and archiving (TS string → DB integer)
  if (updates.priority !== undefined) dbUpdates.priority = PRIORITY_TS_TO_DB[updates.priority] || 2;
  if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
  if (updates.evaluationDate !== undefined) dbUpdates.evaluation_date = updates.evaluationDate;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

  const { data, error } = await supabase
    .from('strategic_objectives')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating strategic objective: ${error.message}`);
  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Update display order for multiple objectives (for drag & drop)
 */
export async function updateStrategicObjectiveOrder(
  updates: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('strategic_objectives')
      .update({ display_order: update.displayOrder })
      .eq('id', update.id);

    if (error) throw new Error(`Error updating objective order: ${error.message}`);
  }
}

/**
 * Delete a strategic objective
 */
export async function deleteStrategicObjective(id: string): Promise<void> {
  // Mock mode: delete from in-memory storage
  if (isDevMode) {
    // Also delete associated tasks
    const tasksToDelete = mockStrategicTasks.filter((t) => t.objectiveId === id);
    for (const task of tasksToDelete) {
      deleteMockStrategicTask(task.id);
    }
    const deleted = deleteMockStrategicObjective(id);
    if (!deleted) throw new Error(`Objective not found: ${id}`);
    return;
  }

  const { error } = await supabase
    .from('strategic_objectives')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting strategic objective: ${error.message}`);
}

// ============================================
// TASK AREAS & SUBAREAS
// ============================================

function mapDbTaskArea(db: DbTaskArea): TaskArea {
  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    icon: db.icon,
    color: db.color,
    displayOrder: db.display_order,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

function mapDbTaskSubarea(db: DbTaskSubarea): TaskSubarea {
  return {
    id: db.id,
    areaId: db.area_id,
    name: db.name,
    slug: db.slug,
    displayOrder: db.display_order,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

/**
 * Fetch all task areas
 */
export async function fetchTaskAreas(): Promise<TaskArea[]> {
  const { data, error } = await supabase
    .from('task_areas')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw new Error(`Error fetching task areas: ${error.message}`);
  return (data as DbTaskArea[]).map(mapDbTaskArea);
}

/**
 * Fetch task subareas, optionally filtered by area
 */
export async function fetchTaskSubareas(areaId?: string): Promise<TaskSubarea[]> {
  let query = supabase
    .from('task_subareas')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (areaId) {
    query = query.eq('area_id', areaId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching task subareas: ${error.message}`);
  return (data as DbTaskSubarea[]).map(mapDbTaskSubarea);
}

// ============================================
// TASKS
// ============================================

function mapDbTask(db: DbTask): Task {
  return {
    id: db.id,
    restaurantId: db.restaurant_id,
    title: db.title,
    description: db.description,
    areaId: db.area_id,
    subareaId: db.subarea_id,
    ownerId: db.owner_id,
    deadline: db.deadline,
    completedAt: db.completed_at,
    isCompleted: db.is_completed,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchTasksParams {
  restaurantIds?: string[];
  areaId?: string;
  ownerId?: string;
  isCompleted?: boolean;
}

/**
 * Fetch tasks with optional filtering
 */
export async function fetchTasks(params: FetchTasksParams = {}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('display_order', { ascending: true });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.areaId) {
    query = query.eq('area_id', params.areaId);
  }
  if (params.ownerId) {
    query = query.eq('owner_id', params.ownerId);
  }
  if (params.isCompleted !== undefined) {
    query = query.eq('is_completed', params.isCompleted);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching tasks: ${error.message}`);
  return (data as DbTask[]).map(mapDbTask);
}

/**
 * Create a task
 */
export async function createTask(input: TaskInput): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    restaurant_id: input.restaurantId,
    title: input.title,
    description: input.description || null,
    area_id: input.areaId,
    subarea_id: input.subareaId,
    owner_id: input.ownerId || null,
    deadline: input.deadline || null,
    display_order: input.displayOrder || 0,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating task: ${error.message}`);
  return mapDbTask(data as DbTask);
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  updates: Partial<TaskInput> & { isCompleted?: boolean }
): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.areaId !== undefined) dbUpdates.area_id = updates.areaId;
  if (updates.subareaId !== undefined) dbUpdates.subarea_id = updates.subareaId;
  if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
  if (updates.isCompleted !== undefined) {
    dbUpdates.is_completed = updates.isCompleted;
    dbUpdates.completed_at = updates.isCompleted ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating task: ${error.message}`);
  return mapDbTask(data as DbTask);
}

/**
 * Toggle task completion
 */
export async function toggleTaskCompletion(id: string, isCompleted: boolean): Promise<Task> {
  return updateTask(id, { isCompleted });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting task: ${error.message}`);
}

// ============================================
// STRATEGIC TASKS (linked to objectives)
// ============================================

function mapDbStrategicTask(db: DbStrategicTask): StrategicTask {
  return {
    id: db.id,
    objectiveId: db.objective_id,
    restaurantId: db.restaurant_id,
    title: db.title,
    description: db.description,
    category: db.category as ObjectiveCategory,
    responsible: db.responsible as ObjectiveResponsible,
    assigneeId: db.assignee_id,
    clientName: db.client_name,
    deadline: db.deadline,
    isCompleted: db.is_completed,
    completedAt: db.completed_at,
    isAutoGenerated: db.is_auto_generated,
    templateKey: db.template_key,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchStrategicTasksParams {
  restaurantIds?: string[];
  objectiveIds?: string[];
  isCompleted?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch strategic tasks with optional filtering
 */
export async function fetchStrategicTasks(
  params: FetchStrategicTasksParams = {}
): Promise<StrategicTask[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockStrategicTasks.filter((task) => {
      if (params.restaurantIds?.length && !params.restaurantIds.includes(task.restaurantId)) {
        return false;
      }
      if (params.objectiveIds?.length && !params.objectiveIds.includes(task.objectiveId)) {
        return false;
      }
      if (params.isCompleted !== undefined && task.isCompleted !== params.isCompleted) {
        return false;
      }
      if (params.startDate && task.deadline && task.deadline < params.startDate) {
        return false;
      }
      if (params.endDate && task.deadline && task.deadline > params.endDate) {
        return false;
      }
      return true;
    });
  }

  let query = supabase
    .from('strategic_tasks')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('display_order', { ascending: true });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.objectiveIds && params.objectiveIds.length > 0) {
    query = query.in('objective_id', params.objectiveIds);
  }
  if (params.isCompleted !== undefined) {
    query = query.eq('is_completed', params.isCompleted);
  }
  if (params.startDate) {
    query = query.gte('deadline', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('deadline', params.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching strategic tasks: ${error.message}`);
  return (data as DbStrategicTask[]).map(mapDbStrategicTask);
}

/**
 * Fetch strategic tasks with joined details (objective title, assignee name)
 */
export async function fetchStrategicTasksWithDetails(
  params: FetchStrategicTasksParams = {}
): Promise<StrategicTaskWithDetails[]> {
  // For now, fetch tasks and enrich with additional queries
  const tasks = await fetchStrategicTasks(params);

  if (tasks.length === 0) return [];

  // Get unique assignee IDs
  const assigneeIds = [...new Set(tasks.filter((t) => t.assigneeId).map((t) => t.assigneeId!))];

  // Fetch objectives (map restaurantIds to addressIds for CRP Portal model)
  const objectives = await fetchStrategicObjectives({ addressIds: params.restaurantIds });
  const objectiveMap = new Map(objectives.map((o) => [o.id, o]));

  // Fetch profiles if needed
  let profileMap = new Map<string, Profile>();
  if (assigneeIds.length > 0 && !isDevMode) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', assigneeIds);
    if (profiles) {
      profileMap = new Map((profiles as DbProfile[]).map((p) => [p.id, mapDbProfileToProfile(p)]));
    }
  }

  // Enrich tasks
  return tasks.map((task) => {
    const objective = objectiveMap.get(task.objectiveId);
    const assignee = task.assigneeId ? profileMap.get(task.assigneeId) : undefined;

    return {
      ...task,
      objectiveTitle: objective?.title,
      assigneeName: assignee?.fullName || undefined,
      assigneeAvatarUrl: assignee?.avatarUrl,
    };
  });
}

/**
 * Create a strategic task
 */
export async function createStrategicTask(
  input: StrategicTaskInput
): Promise<StrategicTask> {
  // Mock mode
  if (isDevMode) {
    return addMockStrategicTask({
      objectiveId: input.objectiveId,
      restaurantId: input.restaurantId,
      title: input.title,
      description: input.description || null,
      category: input.category,
      responsible: input.responsible,
      assigneeId: input.assigneeId || null,
      clientName: input.clientName || null,
      deadline: input.deadline || null,
      isCompleted: false,
      completedAt: null,
      isAutoGenerated: input.isAutoGenerated ?? false,
      templateKey: input.templateKey || null,
      displayOrder: input.displayOrder || 0,
      createdBy: 'dev-user-001',
      updatedBy: 'dev-user-001',
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    objective_id: input.objectiveId,
    restaurant_id: input.restaurantId,
    title: input.title,
    description: input.description || null,
    category: input.category,
    responsible: input.responsible,
    assignee_id: input.assigneeId || null,
    client_name: input.clientName || null,
    deadline: input.deadline || null,
    is_auto_generated: input.isAutoGenerated ?? false,
    template_key: input.templateKey || null,
    display_order: input.displayOrder || 0,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('strategic_tasks')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating strategic task: ${error.message}`);
  return mapDbStrategicTask(data as DbStrategicTask);
}

/**
 * Generate tasks for an objective from templates
 */
export async function generateTasksForObjective(
  objective: StrategicObjective,
  companyName?: string
): Promise<StrategicTask[]> {
  // Import templates dynamically to avoid circular dependencies
  const { getTaskTemplatesForObjective } = await import('@/features/strategic/config/objectiveConfig');

  const templates = getTaskTemplatesForObjective(objective.objectiveTypeId);

  if (templates.length === 0) return [];

  const tasks: StrategicTask[] = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];

    // Calculate deadline based on objective evaluation date
    let deadline: string | undefined;
    if (objective.evaluationDate) {
      const evalDate = new Date(objective.evaluationDate);
      evalDate.setDate(evalDate.getDate() + template.daysFromObjectiveDeadline);
      deadline = evalDate.toISOString();
    }

    const task = await createStrategicTask({
      objectiveId: objective.id,
      restaurantId: objective.addressId || '',  // Map addressId to restaurantId for task
      title: template.title,
      description: template.description,
      category: objective.category,
      responsible: template.responsible,
      clientName: template.responsible === 'cliente' ? companyName : undefined,
      deadline,
      isAutoGenerated: true,
      templateKey: template.key,
      displayOrder: i,
    });

    tasks.push(task);
  }

  return tasks;
}

/**
 * Update a strategic task
 */
export async function updateStrategicTask(
  id: string,
  updates: Partial<StrategicTaskInput> & { isCompleted?: boolean }
): Promise<StrategicTask> {
  // Mock mode
  if (isDevMode) {
    const task = updateMockStrategicTask(id, updates);
    if (!task) throw new Error('Task not found');
    return task;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;
  if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
  if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
  if (updates.isCompleted !== undefined) {
    dbUpdates.is_completed = updates.isCompleted;
    dbUpdates.completed_at = updates.isCompleted ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('strategic_tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating strategic task: ${error.message}`);
  return mapDbStrategicTask(data as DbStrategicTask);
}

/**
 * Toggle strategic task completion
 */
export async function toggleStrategicTaskCompleted(id: string): Promise<StrategicTask> {
  // First fetch the current state
  if (isDevMode) {
    const task = mockStrategicTasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    return updateStrategicTask(id, { isCompleted: !task.isCompleted });
  }

  const { data: current, error: fetchError } = await supabase
    .from('strategic_tasks')
    .select('is_completed')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`Error fetching task: ${fetchError.message}`);

  return updateStrategicTask(id, { isCompleted: !current.is_completed });
}

/**
 * Delete a strategic task
 */
export async function deleteStrategicTask(id: string): Promise<void> {
  // Mock mode
  if (isDevMode) {
    deleteMockStrategicTask(id);
    return;
  }

  const { error } = await supabase
    .from('strategic_tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting strategic task: ${error.message}`);
}

/**
 * Delete all tasks for an objective
 */
export async function deleteTasksForObjective(objectiveId: string): Promise<void> {
  if (isDevMode) {
    const indices = mockStrategicTasks
      .map((t, i) => (t.objectiveId === objectiveId ? i : -1))
      .filter((i) => i !== -1)
      .reverse();
    for (const i of indices) {
      mockStrategicTasks.splice(i, 1);
    }
    return;
  }

  const { error } = await supabase
    .from('strategic_tasks')
    .delete()
    .eq('objective_id', objectiveId);

  if (error) throw new Error(`Error deleting tasks for objective: ${error.message}`);
}

// ============================================
// AUDITS
// ============================================

import type {
  AuditType,
  Audit,
  AuditInput,
  AuditWithDetails,
  AuditStatus,
  AuditResponse,
  AuditImage,
  DbAuditType,
  DbAudit,
  DbAuditResponse,
  DbAuditImage,
} from '@/types';

function mapDbAuditTypeToAuditType(db: DbAuditType): AuditType {
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    description: db.description,
    icon: db.icon,
    fieldSchema: db.field_schema,
    isActive: db.is_active,
    displayOrder: db.display_order,
    createdAt: db.created_at,
  };
}

function mapDbAuditToAudit(db: DbAudit): Audit {
  return {
    pkIdAudit: db.pk_id_audit,
    pfkIdCompany: db.pfk_id_company,
    pfkIdStore: db.pfk_id_store,
    pfkIdPortal: db.pfk_id_portal,
    pfkIdAuditType: db.pfk_id_audit_type,
    desAuditNumber: db.des_audit_number,
    desStatus: db.des_status as AuditStatus,
    desTitle: db.des_title,
    desNotes: db.des_notes,
    desConsultant: db.des_consultant,
    desKamEvaluator: db.des_kam_evaluator,
    desFieldData: db.des_field_data,
    amtScoreTotal: db.amt_score_total,
    tdCreatedAt: db.td_created_at,
    tdUpdatedAt: db.td_updated_at,
    tdScheduledDate: db.td_scheduled_date,
    tdCompletedAt: db.td_completed_at,
    tdDeliveredAt: db.td_delivered_at,
    pfkCreatedBy: db.pfk_created_by,
    pfkUpdatedBy: db.pfk_updated_by,
  };
}

// Prepared for future use when audit responses are implemented
function _mapDbAuditResponseToAuditResponse(db: DbAuditResponse): AuditResponse {
  return {
    pkIdResponse: db.pk_id_response,
    pfkIdAudit: db.pfk_id_audit,
    desSection: db.des_section,
    desFieldKey: db.des_field_key,
    desFieldType: db.des_field_type as AuditResponse['desFieldType'],
    desValueText: db.des_value_text,
    amtValueNumber: db.amt_value_number,
    tdCreatedAt: db.td_created_at,
    tdUpdatedAt: db.td_updated_at,
  };
}

// Prepared for future use when audit images are implemented
function _mapDbAuditImageToAuditImage(db: DbAuditImage): AuditImage {
  return {
    pkIdImage: db.pk_id_image,
    pfkIdAudit: db.pfk_id_audit,
    desFieldKey: db.des_field_key,
    desStoragePath: db.des_storage_path,
    desFileName: db.des_file_name,
    desMimeType: db.des_mime_type,
    numFileSize: db.num_file_size,
    numSortOrder: db.num_sort_order,
    tdCreatedAt: db.td_created_at,
  };
}

// Export for future use
export { _mapDbAuditResponseToAuditResponse, _mapDbAuditImageToAuditImage };

/**
 * Fetch all active audit types
 */
export async function fetchAuditTypes(): Promise<AuditType[]> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw new Error(`Error fetching audit types: ${error.message}`);
  return (data as DbAuditType[]).map(mapDbAuditTypeToAuditType);
}

/**
 * Fetch a single audit type by slug
 */
export async function fetchAuditTypeBySlug(slug: string): Promise<AuditType | null> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching audit type: ${error.message}`);
  }
  return mapDbAuditTypeToAuditType(data as DbAuditType);
}

/**
 * Fetch a single audit type by ID
 */
export async function fetchAuditTypeById(id: string): Promise<AuditType | null> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching audit type: ${error.message}`);
  }
  return mapDbAuditTypeToAuditType(data as DbAuditType);
}

interface FetchAuditsParams {
  companyIds?: string[];
  brandIds?: string[];
  auditTypeIds?: string[];
  status?: AuditStatus;
  search?: string;
}

/**
 * Fetch audits with optional filtering
 */
export async function fetchAudits(params: FetchAuditsParams = {}): Promise<Audit[]> {
  let query = supabase
    .from('audits')
    .select('*')
    .order('td_created_at', { ascending: false });

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('pfk_id_company', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('pfk_id_store', params.brandIds);
  }
  if (params.auditTypeIds && params.auditTypeIds.length > 0) {
    query = query.in('pfk_id_audit_type', params.auditTypeIds);
  }
  if (params.status) {
    query = query.eq('des_status', params.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching audits: ${error.message}`);
  return (data as DbAudit[]).map(mapDbAuditToAudit);
}

/**
 * Fetch audits with details (joined data)
 */
export async function fetchAuditsWithDetails(
  params: FetchAuditsParams = {}
): Promise<AuditWithDetails[]> {
  const audits = await fetchAudits(params);

  if (audits.length === 0) return [];

  // Collect unique IDs
  const auditTypeIds = [...new Set(audits.map((a) => a.pfkIdAuditType))];
  const companyIds = [...new Set(audits.filter((a) => a.pfkIdCompany).map((a) => a.pfkIdCompany!))];
  const brandIds = [...new Set(audits.filter((a) => a.pfkIdStore).map((a) => a.pfkIdStore!))];
  const portalIds = [...new Set(audits.filter((a) => a.pfkIdPortal).map((a) => a.pfkIdPortal!))];
  const creatorIds = [...new Set(audits.filter((a) => a.pfkCreatedBy).map((a) => a.pfkCreatedBy!))];

  // Fetch all related data in parallel
  const [
    { data: auditTypes },
    { data: companies },
    { data: brands },
    { data: portals },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('audit_types').select('*').in('id', auditTypeIds),
    companyIds.length > 0
      ? supabase.from('crp_portal__dt_company').select('pk_id_company, des_company_name, flg_deleted').in('pk_id_company', companyIds.map(Number)).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_company: number; des_company_name: string; flg_deleted: number }> }),
    brandIds.length > 0
      ? supabase.from('crp_portal__dt_store').select('pk_id_store, des_store, pfk_id_company, flg_deleted').in('pk_id_store', brandIds.map(Number)).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_store: number; des_store: string; pfk_id_company: number; flg_deleted: number }> }),
    portalIds.length > 0
      ? supabase.from('crp_portal__dt_portal').select('pk_id_portal, des_portal').in('pk_id_portal', portalIds).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_portal: string; des_portal: string }> }),
    creatorIds.length > 0
      ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
  ]);

  // Build audit type map
  const auditTypeMap = new Map(
    (auditTypes as DbAuditType[] || []).map((t) => [t.id, mapDbAuditTypeToAuditType(t)])
  );

  // Build company map (deduplicate by PK, keep most recent)
  const companyMap = new Map<string, Company>();
  for (const c of (companies || []) as Array<{ pk_id_company: number; des_company_name: string; flg_deleted: number }>) {
    const id = String(c.pk_id_company);
    if (!companyMap.has(id)) {
      companyMap.set(id, { id, name: c.des_company_name } as Company);
    }
  }

  // Build brand map (deduplicate by PK, keep most recent)
  const brandMap = new Map<string, Brand>();
  for (const b of (brands || []) as Array<{ pk_id_store: number; des_store: string; pfk_id_company: number; flg_deleted: number }>) {
    const id = String(b.pk_id_store);
    if (!brandMap.has(id)) {
      brandMap.set(id, { id, name: b.des_store, companyId: String(b.pfk_id_company) } as Brand);
    }
  }

  // Build portal map (deduplicate by PK, keep most recent)
  const portalMap = new Map<string, { id: string; name: string }>();
  for (const p of (portals || []) as Array<{ pk_id_portal: string; des_portal: string }>) {
    const id = String(p.pk_id_portal);
    if (!portalMap.has(id)) {
      portalMap.set(id, { id, name: p.des_portal });
    }
  }

  // Build creator map
  const creatorMap = new Map(
    (profiles || []).map((p: { id: string; full_name: string | null; avatar_url: string | null }) => [
      p.id,
      { fullName: p.full_name || 'Usuario', avatarUrl: p.avatar_url },
    ])
  );

  // Enrich audits
  return audits.map((audit) => ({
    ...audit,
    auditType: auditTypeMap.get(audit.pfkIdAuditType),
    company: audit.pfkIdCompany ? companyMap.get(audit.pfkIdCompany) : undefined,
    brand: audit.pfkIdStore ? brandMap.get(audit.pfkIdStore) : undefined,
    portal: audit.pfkIdPortal ? portalMap.get(audit.pfkIdPortal) : undefined,
    createdByProfile: audit.pfkCreatedBy ? creatorMap.get(audit.pfkCreatedBy) : undefined,
  }));
}

/**
 * Fetch a single audit by ID
 */
export async function fetchAuditById(id: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('pk_id_audit', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching audit: ${error.message}`);
  }
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Fetch a single audit with details by ID
 */
export async function fetchAuditWithDetailsById(id: string): Promise<AuditWithDetails | null> {
  const audit = await fetchAuditById(id);
  if (!audit) return null;

  // Fetch company from CRP Portal
  const fetchCrpCompanyById = async (companyId: string): Promise<Company | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_company')
      .select('pk_id_company, des_company, des_key_account_manager, flg_deleted')
      .eq('pk_id_company', Number(companyId))
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const mostRecent = data[0];
    if (mostRecent.flg_deleted !== 0) return null;
    return {
      id: String(mostRecent.pk_id_company),
      name: mostRecent.des_company,
      keyAccountManager: mostRecent.des_key_account_manager,
    } as Company;
  };

  // Fetch brand from CRP Portal
  // NOTE: Do NOT filter flg_deleted - get most recent snapshot first
  const fetchBrandById = async (brandId: string): Promise<Brand | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
      .eq('pk_id_store', Number(brandId))
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const mostRecent = data[0];
    if (mostRecent.flg_deleted !== 0) return null;
    return {
      id: String(mostRecent.pk_id_store),
      name: mostRecent.des_store,
      companyId: String(mostRecent.pfk_id_company),
    } as Brand;
  };

  // Fetch portal name from CRP Portal
  const fetchPortalById = async (portalId: string): Promise<{ id: string; name: string } | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_portal')
      .select('pk_id_portal, des_portal')
      .eq('pk_id_portal', portalId)
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    return { id: String(data[0].pk_id_portal), name: data[0].des_portal };
  };

  const fetchCreatorProfile = async () => {
    if (!audit.pfkCreatedBy) return null;
    try {
      return await supabase.from('profiles').select('full_name, avatar_url').eq('id', audit.pfkCreatedBy).single();
    } catch {
      return null;
    }
  };

  const [auditType, company, brand, portal, creator] = await Promise.all([
    fetchAuditTypeById(audit.pfkIdAuditType).catch(() => null),
    audit.pfkIdCompany ? fetchCrpCompanyById(audit.pfkIdCompany).catch(() => null) : null,
    audit.pfkIdStore ? fetchBrandById(audit.pfkIdStore).catch(() => null) : null,
    audit.pfkIdPortal ? fetchPortalById(audit.pfkIdPortal).catch(() => null) : null,
    fetchCreatorProfile(),
  ]);

  return {
    ...audit,
    auditType: auditType || undefined,
    company: company || undefined,
    brand: brand || undefined,
    portal: portal || undefined,
    createdByProfile: creator?.data
      ? { fullName: creator.data.full_name || 'Usuario', avatarUrl: creator.data.avatar_url }
      : undefined,
  };
}

/**
 * Create a new audit
 */
export async function createAudit(input: AuditInput): Promise<Audit> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput: Record<string, unknown> = {
    pfk_id_company: input.pfkIdCompany || null,
    pfk_id_store: input.pfkIdStore || null,
    pfk_id_portal: input.pfkIdPortal || null,
    pfk_id_audit_type: input.pfkIdAuditType,
    des_audit_number: input.desAuditNumber || null,
    des_title: input.desTitle || null,
    des_notes: input.desNotes || null,
    des_consultant: input.desConsultant || null,
    des_kam_evaluator: input.desKamEvaluator || null,
    des_field_data: input.desFieldData || null,
    des_status: input.desStatus || 'draft',
    td_scheduled_date: input.tdScheduledDate || null,
    pfk_created_by: userId,
    pfk_updated_by: userId,
  };

  const { data, error } = await supabase
    .from('audits')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating audit: ${error.message}`);
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Update an audit
 */
export async function updateAudit(
  id: string,
  updates: Partial<AuditInput> & { desStatus?: AuditStatus; amtScoreTotal?: number; tdDeliveredAt?: string }
): Promise<Audit> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { pfk_updated_by: userId };

  if (updates.pfkIdCompany !== undefined) dbUpdates.pfk_id_company = updates.pfkIdCompany;
  if (updates.pfkIdStore !== undefined) dbUpdates.pfk_id_store = updates.pfkIdStore;
  if (updates.pfkIdPortal !== undefined) dbUpdates.pfk_id_portal = updates.pfkIdPortal;
  if (updates.desAuditNumber !== undefined) dbUpdates.des_audit_number = updates.desAuditNumber;
  if (updates.desTitle !== undefined) dbUpdates.des_title = updates.desTitle;
  if (updates.desNotes !== undefined) dbUpdates.des_notes = updates.desNotes;
  if (updates.desConsultant !== undefined) dbUpdates.des_consultant = updates.desConsultant;
  if (updates.desKamEvaluator !== undefined) dbUpdates.des_kam_evaluator = updates.desKamEvaluator;
  if (updates.amtScoreTotal !== undefined) dbUpdates.amt_score_total = updates.amtScoreTotal;
  if (updates.desFieldData !== undefined) dbUpdates.des_field_data = updates.desFieldData;
  if (updates.tdScheduledDate !== undefined) dbUpdates.td_scheduled_date = updates.tdScheduledDate;
  if (updates.desStatus !== undefined) {
    dbUpdates.des_status = updates.desStatus;
    if (updates.desStatus === 'completed') {
      dbUpdates.td_completed_at = new Date().toISOString();
    }
    if (updates.desStatus === 'delivered') {
      dbUpdates.td_delivered_at = updates.tdDeliveredAt || new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('audits')
    .update(dbUpdates)
    .eq('pk_id_audit', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating audit: ${error.message}`);
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Delete an audit
 */
export async function deleteAudit(id: string): Promise<void> {
  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('pk_id_audit', id);

  if (error) throw new Error(`Error deleting audit: ${error.message}`);
}

/**
 * Mark an audit as completed
 */
export async function completeAudit(id: string): Promise<Audit> {
  return updateAudit(id, { desStatus: 'completed' });
}
