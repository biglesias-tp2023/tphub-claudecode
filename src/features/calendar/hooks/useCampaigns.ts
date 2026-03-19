/**
 * Campaign Hooks
 *
 * React Query hooks for managing promotional campaigns via Supabase.
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
// FETCH PARAMS
// ============================================

interface FetchCampaignsParams {
  restaurantIds?: string[];
  platforms?: CampaignPlatform[];
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
}

// ============================================
// DATA FUNCTIONS (SUPABASE)
// ============================================

async function fetchCampaigns(params: FetchCampaignsParams = {}): Promise<PromotionalCampaign[]> {
  let query = supabase
    .from('promotional_campaigns')
    .select('*')
    .order('start_date', { ascending: true });

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

async function fetchCampaignsByMonth(
  restaurantIds: string[],
  year: number,
  month: number
): Promise<PromotionalCampaign[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  return fetchCampaigns({ restaurantIds, startDate, endDate });
}

async function fetchCampaignById(id: string): Promise<PromotionalCampaign | null> {
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

async function createCampaign(input: CampaignInputWithCrp): Promise<PromotionalCampaign> {
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

async function updateCampaign(
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

async function deleteCampaignById(id: string): Promise<void> {
  const { error } = await supabase
    .from('promotional_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting campaign: ${error.message}`);
}

async function cancelCampaign(id: string): Promise<PromotionalCampaign> {
  return updateCampaign(id, { status: 'cancelled' });
}

// ============================================
// HOOKS
// ============================================

export function useCampaigns(params: FetchCampaignsParams = {}) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: () => fetchCampaigns(params),
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

export function useCampaignsByMonth(
  restaurantIds: string[],
  year: number,
  month: number
) {
  return useQuery({
    queryKey: queryKeys.campaigns.byMonth(restaurantIds, year, month),
    queryFn: () => fetchCampaignsByMonth(restaurantIds, year, month),
    enabled: restaurantIds.length > 0,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

export function useCampaignsByRestaurant(restaurantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.byRestaurant(restaurantId || ''),
    queryFn: () => fetchCampaigns({ restaurantIds: [restaurantId!] }),
    enabled: !!restaurantId,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id || ''),
    queryFn: () => fetchCampaignById(id!),
    enabled: !!id,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CampaignInputWithCrp) => createCampaign(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CampaignInputWithCrp> & { status?: CampaignStatus } }) =>
      updateCampaign(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCampaignById(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.campaigns.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelCampaign(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
