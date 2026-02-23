/**
 * Campaign Hooks
 *
 * React Query hooks for managing promotional campaigns.
 * Supports both localStorage (demo mode) and Supabase (production).
 *
 * @module features/calendar/hooks/useCampaigns
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { supabase } from '@/services/supabase';
import type {
  PromotionalCampaign,
  PromotionalCampaignInput,
  CampaignPlatform,
  CampaignStatus,
  DbPromotionalCampaign,
} from '@/types';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Use localStorage for campaigns (demo mode).
 * Controlled by VITE_CAMPAIGNS_USE_LOCAL_STORAGE environment variable.
 * Set to 'false' in .env.local to use Supabase with CRP Portal references.
 */
const USE_LOCAL_STORAGE = import.meta.env.VITE_CAMPAIGNS_USE_LOCAL_STORAGE !== 'false';
const STORAGE_KEY = 'tphub_campaigns';

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function getStoredCampaigns(): PromotionalCampaign[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn('[useCampaigns] Invalid localStorage data: expected array, got', typeof parsed);
      return [];
    }

    return parsed;
  } catch (error) {
    console.warn('[useCampaigns] Failed to parse localStorage campaigns:', error);
    return [];
  }
}

function setStoredCampaigns(campaigns: PromotionalCampaign[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
}

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate campaign status based on dates
 */
function calculateStatus(startDate: string, endDate: string): CampaignStatus {
  const today = new Date().toISOString().split('T')[0];
  if (today > endDate) return 'completed';
  if (today >= startDate && today <= endDate) return 'active';
  return 'scheduled';
}

// ============================================
// MAPPERS
// ============================================

interface DbCampaignWithCrp extends DbPromotionalCampaign {
  crp_restaurant_id?: string | null;
  crp_company_id?: string | null;
  crp_brand_id?: string | null;
}

function mapDbCampaignToCampaign(db: DbCampaignWithCrp): PromotionalCampaign {
  return {
    id: db.id,
    restaurantId: db.crp_restaurant_id || db.restaurant_id,
    platform: db.platform as CampaignPlatform,
    campaignType: db.campaign_type,
    name: db.name,
    config: db.config,
    productIds: db.product_ids || [],
    startDate: db.start_date,
    endDate: db.end_date,
    status: db.status as CampaignStatus,
    metrics: db.metrics || undefined,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// EXTENDED INPUT WITH CRP REFERENCES
// ============================================

export interface CampaignInputWithCrp extends PromotionalCampaignInput {
  crpRestaurantId?: string;
  crpCompanyId?: string;
  crpBrandId?: string;
}

// ============================================
// DATA FUNCTIONS (LOCAL STORAGE MODE)
// ============================================

interface FetchCampaignsParams {
  restaurantIds?: string[];
  platforms?: CampaignPlatform[];
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
}

async function fetchCampaignsLocal(params: FetchCampaignsParams = {}): Promise<PromotionalCampaign[]> {
  await new Promise(resolve => setTimeout(resolve, 100));

  let campaigns = getStoredCampaigns();

  // Update statuses based on current date
  campaigns = campaigns.map(c => ({
    ...c,
    status: calculateStatus(c.startDate, c.endDate),
  }));

  // Apply filters
  if (params.restaurantIds?.length) {
    // Include campaigns for specific restaurants OR campaigns that apply to "all"
    campaigns = campaigns.filter(c =>
      c.restaurantId === 'all' || params.restaurantIds!.includes(c.restaurantId)
    );
  }

  if (params.platforms?.length) {
    campaigns = campaigns.filter(c => params.platforms!.includes(c.platform));
  }

  if (params.status) {
    campaigns = campaigns.filter(c => c.status === params.status);
  }

  if (params.startDate) {
    campaigns = campaigns.filter(c => c.endDate >= params.startDate!);
  }

  if (params.endDate) {
    campaigns = campaigns.filter(c => c.startDate <= params.endDate!);
  }

  return campaigns.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

async function fetchCampaignsByMonthLocal(
  restaurantIds: string[],
  year: number,
  month: number
): Promise<PromotionalCampaign[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  return fetchCampaignsLocal({ restaurantIds, startDate, endDate });
}

async function fetchCampaignByIdLocal(id: string): Promise<PromotionalCampaign | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const campaigns = getStoredCampaigns();
  return campaigns.find(c => c.id === id) || null;
}

async function createCampaignLocal(input: PromotionalCampaignInput): Promise<PromotionalCampaign> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const now = new Date().toISOString();
  const newCampaign: PromotionalCampaign = {
    id: generateId(),
    restaurantId: input.restaurantId,
    platform: input.platform,
    campaignType: input.campaignType,
    name: input.name || null,
    config: input.config,
    productIds: input.productIds || [],
    startDate: input.startDate,
    endDate: input.endDate,
    status: calculateStatus(input.startDate, input.endDate),
    metrics: undefined,
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const campaigns = getStoredCampaigns();
  campaigns.push(newCampaign);
  setStoredCampaigns(campaigns);

  return newCampaign;
}

async function updateCampaignLocal(
  id: string,
  updates: Partial<PromotionalCampaignInput> & { status?: CampaignStatus }
): Promise<PromotionalCampaign> {
  await new Promise(resolve => setTimeout(resolve, 150));

  const campaigns = getStoredCampaigns();
  const index = campaigns.findIndex(c => c.id === id);

  if (index === -1) {
    throw new Error('Campaign not found');
  }

  const updated: PromotionalCampaign = {
    ...campaigns[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate status if dates changed
  if (updates.startDate || updates.endDate) {
    updated.status = calculateStatus(updated.startDate, updated.endDate);
  }

  campaigns[index] = updated;
  setStoredCampaigns(campaigns);

  return updated;
}

async function deleteCampaignLocal(id: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));

  const campaigns = getStoredCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);
  setStoredCampaigns(filtered);
}

async function cancelCampaignLocal(id: string): Promise<PromotionalCampaign> {
  return updateCampaignLocal(id, { status: 'cancelled' });
}

// ============================================
// DATA FUNCTIONS (SUPABASE MODE)
// ============================================

async function fetchCampaignsSupabase(params: FetchCampaignsParams = {}): Promise<PromotionalCampaign[]> {
  let query = supabase
    .from('promotional_campaigns')
    .select('*')
    .order('start_date', { ascending: true });

  // Filter by CRP restaurant IDs or UUID restaurant IDs
  // Also include campaigns that apply to "all" restaurants
  if (params.restaurantIds?.length) {
    query = query.or(
      `crp_restaurant_id.in.(${params.restaurantIds.join(',')}),restaurant_id.in.(${params.restaurantIds.join(',')}),crp_restaurant_id.eq.all,restaurant_id.eq.all`
    );
  }

  if (params.platforms?.length) {
    query = query.in('platform', params.platforms);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.startDate) {
    query = query.gte('end_date', params.startDate);
  }

  if (params.endDate) {
    query = query.lte('start_date', params.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching campaigns: ${error.message}`);
  return (data as DbCampaignWithCrp[]).map(mapDbCampaignToCampaign);
}

async function fetchCampaignsByMonthSupabase(
  restaurantIds: string[],
  year: number,
  month: number
): Promise<PromotionalCampaign[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  return fetchCampaignsSupabase({ restaurantIds, startDate, endDate });
}

async function fetchCampaignByIdSupabase(id: string): Promise<PromotionalCampaign | null> {
  const { data, error } = await supabase
    .from('promotional_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching campaign: ${error.message}`);
  }

  return mapDbCampaignToCampaign(data as DbCampaignWithCrp);
}

async function createCampaignSupabase(input: CampaignInputWithCrp): Promise<PromotionalCampaign> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput: Record<string, unknown> = {
    platform: input.platform,
    campaign_type: input.campaignType,
    name: input.name || null,
    config: input.config,
    product_ids: input.productIds || [],
    start_date: input.startDate,
    end_date: input.endDate,
    created_by: userId,
    updated_by: userId,
  };

  // Use CRP references if provided, otherwise use UUID
  if (input.crpRestaurantId) {
    dbInput.crp_restaurant_id = input.crpRestaurantId;
    dbInput.crp_company_id = input.crpCompanyId || null;
    dbInput.crp_brand_id = input.crpBrandId || null;
  } else {
    dbInput.restaurant_id = input.restaurantId;
  }

  const { data, error } = await supabase
    .from('promotional_campaigns')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating campaign: ${error.message}`);
  return mapDbCampaignToCampaign(data as DbCampaignWithCrp);
}

async function updateCampaignSupabase(
  id: string,
  updates: Partial<CampaignInputWithCrp> & { status?: CampaignStatus }
): Promise<PromotionalCampaign> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = {
    updated_by: userId,
  };

  if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
  if (updates.campaignType !== undefined) dbUpdates.campaign_type = updates.campaignType;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.config !== undefined) dbUpdates.config = updates.config;
  if (updates.productIds !== undefined) dbUpdates.product_ids = updates.productIds;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  // CRP references
  if (updates.crpRestaurantId !== undefined) dbUpdates.crp_restaurant_id = updates.crpRestaurantId;
  if (updates.crpCompanyId !== undefined) dbUpdates.crp_company_id = updates.crpCompanyId;
  if (updates.crpBrandId !== undefined) dbUpdates.crp_brand_id = updates.crpBrandId;

  const { data, error } = await supabase
    .from('promotional_campaigns')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating campaign: ${error.message}`);
  return mapDbCampaignToCampaign(data as DbCampaignWithCrp);
}

async function deleteCampaignSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('promotional_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting campaign: ${error.message}`);
}

async function cancelCampaignSupabase(id: string): Promise<PromotionalCampaign> {
  return updateCampaignSupabase(id, { status: 'cancelled' });
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch campaigns with optional filtering
 */
export function useCampaigns(params: FetchCampaignsParams = {}) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: () => USE_LOCAL_STORAGE
      ? fetchCampaignsLocal(params)
      : fetchCampaignsSupabase(params),
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Hook to fetch campaigns for a specific month
 */
export function useCampaignsByMonth(
  restaurantIds: string[],
  year: number,
  month: number
) {
  return useQuery({
    queryKey: queryKeys.campaigns.byMonth(restaurantIds, year, month),
    queryFn: () => USE_LOCAL_STORAGE
      ? fetchCampaignsByMonthLocal(restaurantIds, year, month)
      : fetchCampaignsByMonthSupabase(restaurantIds, year, month),
    enabled: restaurantIds.length > 0,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Hook to fetch campaigns for a single restaurant
 */
export function useCampaignsByRestaurant(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.byRestaurant(restaurantId || ''),
    queryFn: () => USE_LOCAL_STORAGE
      ? fetchCampaignsLocal({ restaurantIds: [restaurantId!] })
      : fetchCampaignsSupabase({ restaurantIds: [restaurantId!] }),
    enabled: !!restaurantId,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Hook to fetch a single campaign by ID
 */
export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id || ''),
    queryFn: () => USE_LOCAL_STORAGE
      ? fetchCampaignByIdLocal(id!)
      : fetchCampaignByIdSupabase(id!),
    enabled: !!id,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Hook to create a new campaign
 * Supports CRP Portal references for tracking
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CampaignInputWithCrp) =>
      USE_LOCAL_STORAGE
        ? createCampaignLocal(input)
        : createCampaignSupabase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Hook to update a campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CampaignInputWithCrp> & { status?: CampaignStatus } }) =>
      USE_LOCAL_STORAGE
        ? updateCampaignLocal(id, updates)
        : updateCampaignSupabase(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Hook to delete a campaign
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      USE_LOCAL_STORAGE
        ? deleteCampaignLocal(id)
        : deleteCampaignSupabase(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.campaigns.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Hook to cancel a campaign
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      USE_LOCAL_STORAGE
        ? cancelCampaignLocal(id)
        : cancelCampaignSupabase(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
