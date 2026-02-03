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
    // Priority and archiving
    priority: (db.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
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
    // Priority and archiving
    priority: input.priority || 'medium',
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
  // Priority and archiving
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
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
  DbAuditType,
  DbAudit,
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
    updatedAt: db.updated_at,
  };
}

function mapDbAuditToAudit(db: DbAudit): Audit {
  return {
    id: db.id,
    auditNumber: db.audit_number,
    companyId: db.company_id,
    brandId: db.brand_id,
    addressId: db.address_id,
    areaId: db.area_id,
    auditTypeId: db.audit_type_id,
    fieldData: db.field_data,
    status: db.status as AuditStatus,
    scheduledDate: db.scheduled_date,
    completedAt: db.completed_at,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

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
  addressIds?: string[];
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
    .order('created_at', { ascending: false });

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }
  if (params.addressIds && params.addressIds.length > 0) {
    query = query.in('address_id', params.addressIds);
  }
  if (params.auditTypeIds && params.auditTypeIds.length > 0) {
    query = query.in('audit_type_id', params.auditTypeIds);
  }
  if (params.status) {
    query = query.eq('status', params.status);
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

  // Fetch related data
  const auditTypeIds = [...new Set(audits.map((a) => a.auditTypeId))];
  const companyIds = [...new Set(audits.filter((a) => a.companyId).map((a) => a.companyId!))];
  const brandIds = [...new Set(audits.filter((a) => a.brandId).map((a) => a.brandId!))];
  const addressIds = [...new Set(audits.filter((a) => a.addressId).map((a) => a.addressId!))];
  const areaIds = [...new Set(audits.filter((a) => a.areaId).map((a) => a.areaId!))];
  const creatorIds = [...new Set(audits.filter((a) => a.createdBy).map((a) => a.createdBy!))];

  // Fetch audit types
  const { data: auditTypes } = await supabase
    .from('audit_types')
    .select('*')
    .in('id', auditTypeIds);
  const auditTypeMap = new Map(
    (auditTypes as DbAuditType[] || []).map((t) => [t.id, mapDbAuditTypeToAuditType(t)])
  );

  // Fetch companies
  let companyMap = new Map<string, Company>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds);
    companyMap = new Map(
      (companies as DbCompany[] || []).map((c) => [c.id, mapDbCompanyToCompany(c)])
    );
  }

  // Fetch brands from CRP Portal
  let brandMap = new Map<string, Brand>();
  if (brandIds.length > 0) {
    const { data: brands } = await supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company')
      .in('pk_id_store', brandIds.map(Number));
    brandMap = new Map(
      (brands || []).map((b: { pk_id_store: number; des_store: string; pfk_id_company: number }) => [
        String(b.pk_id_store),
        { id: String(b.pk_id_store), name: b.des_store, companyId: String(b.pfk_id_company) } as Brand,
      ])
    );
  }

  // Fetch addresses from CRP Portal
  let addressMap = new Map<string, Restaurant>();
  if (addressIds.length > 0) {
    const { data: addresses } = await supabase
      .from('crp_portal__dt_address')
      .select('pk_id_address, des_address, pfk_id_company, pfk_id_store, pfk_id_business_area, des_latitude, des_longitude')
      .in('pk_id_address', addressIds.map(Number));
    addressMap = new Map(
      (addresses || []).map((a: { pk_id_address: number; des_address: string; pfk_id_company: number; pfk_id_store: number | null; pfk_id_business_area: number | null; des_latitude: number | null; des_longitude: number | null }) => [
        String(a.pk_id_address),
        {
          id: String(a.pk_id_address),
          name: a.des_address,
          companyId: String(a.pfk_id_company),
          brandId: a.pfk_id_store ? String(a.pfk_id_store) : null,
          areaId: a.pfk_id_business_area ? String(a.pfk_id_business_area) : null,
          latitude: a.des_latitude,
          longitude: a.des_longitude,
        } as Restaurant,
      ])
    );
  }

  // Fetch areas
  let areaMap = new Map<string, Area>();
  if (areaIds.length > 0) {
    const { data: areas } = await supabase
      .from('areas')
      .select('*')
      .in('id', areaIds);
    areaMap = new Map(
      (areas as DbArea[] || []).map((a) => [a.id, mapDbAreaToArea(a)])
    );
  }

  // Fetch creators
  let creatorMap = new Map<string, { fullName: string; avatarUrl: string | null }>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', creatorIds);
    creatorMap = new Map(
      (profiles || []).map((p: { id: string; full_name: string | null; avatar_url: string | null }) => [
        p.id,
        { fullName: p.full_name || 'Usuario', avatarUrl: p.avatar_url },
      ])
    );
  }

  // Enrich audits
  return audits.map((audit) => ({
    ...audit,
    auditType: auditTypeMap.get(audit.auditTypeId),
    company: audit.companyId ? companyMap.get(audit.companyId) : undefined,
    brand: audit.brandId ? brandMap.get(audit.brandId) : undefined,
    address: audit.addressId ? addressMap.get(audit.addressId) : undefined,
    area: audit.areaId ? areaMap.get(audit.areaId) : undefined,
    createdByProfile: audit.createdBy ? creatorMap.get(audit.createdBy) : undefined,
  }));
}

/**
 * Fetch a single audit by ID
 */
export async function fetchAuditById(id: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
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

  // Fetch brand from CRP Portal
  const fetchBrandById = async (brandId: string): Promise<Brand | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company')
      .eq('pk_id_store', Number(brandId))
      .single();
    if (!data) return null;
    return {
      id: String(data.pk_id_store),
      name: data.des_store,
      companyId: String(data.pfk_id_company),
    } as Brand;
  };

  // Fetch address from CRP Portal
  const fetchAddressById = async (addressId: string): Promise<Restaurant | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_address')
      .select('pk_id_address, des_address, pfk_id_company, pfk_id_store, pfk_id_business_area, des_latitude, des_longitude')
      .eq('pk_id_address', Number(addressId))
      .single();
    if (!data) return null;
    return {
      id: String(data.pk_id_address),
      name: data.des_address,
      companyId: String(data.pfk_id_company),
      brandId: data.pfk_id_store ? String(data.pfk_id_store) : null,
      areaId: data.pfk_id_business_area ? String(data.pfk_id_business_area) : null,
      latitude: data.des_latitude,
      longitude: data.des_longitude,
    } as Restaurant;
  };

  const [auditType, company, brand, address, area, creator] = await Promise.all([
    fetchAuditTypeById(audit.auditTypeId),
    audit.companyId ? fetchCompanyById(audit.companyId) : null,
    audit.brandId ? fetchBrandById(audit.brandId) : null,
    audit.addressId ? fetchAddressById(audit.addressId) : null,
    audit.areaId ? fetchAreaById(audit.areaId) : null,
    audit.createdBy
      ? supabase.from('profiles').select('full_name, avatar_url').eq('id', audit.createdBy).single()
      : null,
  ]);

  return {
    ...audit,
    auditType: auditType || undefined,
    company: company || undefined,
    brand: brand || undefined,
    address: address || undefined,
    area: area || undefined,
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
    company_id: input.companyId || null,
    brand_id: input.brandId || null,
    address_id: input.addressId || null,
    area_id: input.areaId || null,
    audit_type_id: input.auditTypeId,
    field_data: input.fieldData || null,
    status: input.status || 'draft',
    scheduled_date: input.scheduledDate || null,
    created_by: userId,
    updated_by: userId,
  };

  // If audit number is provided, use it (new nomenclature)
  if (input.auditNumber) {
    dbInput.audit_number = input.auditNumber;
  }

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
  updates: Partial<AuditInput> & { status?: AuditStatus }
): Promise<Audit> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
  if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
  if (updates.addressId !== undefined) dbUpdates.address_id = updates.addressId;
  if (updates.areaId !== undefined) dbUpdates.area_id = updates.areaId;
  if (updates.auditNumber !== undefined) dbUpdates.audit_number = updates.auditNumber;
  if (updates.fieldData !== undefined) dbUpdates.field_data = updates.fieldData;
  if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'completed') {
      dbUpdates.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('audits')
    .update(dbUpdates)
    .eq('id', id)
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
    .eq('id', id);

  if (error) throw new Error(`Error deleting audit: ${error.message}`);
}

/**
 * Mark an audit as completed
 */
export async function completeAudit(id: string): Promise<Audit> {
  return updateAudit(id, { status: 'completed' });
}
