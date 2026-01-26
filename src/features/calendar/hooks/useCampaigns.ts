/**
 * Campaign Hooks
 *
 * React Query hooks for managing promotional campaigns.
 * Uses localStorage for demo mode until database schema is properly configured.
 *
 * @module features/calendar/hooks/useCampaigns
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import type {
  PromotionalCampaign,
  PromotionalCampaignInput,
  CampaignPlatform,
  CampaignStatus,
} from '@/types';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Use localStorage for campaigns (demo mode).
 * Set to false when database schema is properly configured.
 */
const USE_LOCAL_STORAGE = true;
const STORAGE_KEY = 'tphub_campaigns';

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function getStoredCampaigns(): PromotionalCampaign[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
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
  // Simulate async behavior
  await new Promise(resolve => setTimeout(resolve, 100));

  let campaigns = getStoredCampaigns();

  // Update statuses based on current date
  campaigns = campaigns.map(c => ({
    ...c,
    status: calculateStatus(c.startDate, c.endDate),
  }));

  // Apply filters
  if (params.restaurantIds?.length) {
    campaigns = campaigns.filter(c => params.restaurantIds!.includes(c.restaurantId));
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
      : fetchCampaignsLocal(params), // TODO: Replace with Supabase when ready
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
      : fetchCampaignsByMonthLocal(restaurantIds, year, month), // TODO: Replace with Supabase
    enabled: restaurantIds.length > 0,
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
      : fetchCampaignsLocal({ restaurantIds: [restaurantId!] }), // TODO: Replace with Supabase
    enabled: !!restaurantId,
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
      : fetchCampaignByIdLocal(id!), // TODO: Replace with Supabase
    enabled: !!id,
  });
}

/**
 * Hook to create a new campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PromotionalCampaignInput) =>
      USE_LOCAL_STORAGE
        ? createCampaignLocal(input)
        : createCampaignLocal(input), // TODO: Replace with Supabase
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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PromotionalCampaignInput> & { status?: CampaignStatus } }) =>
      USE_LOCAL_STORAGE
        ? updateCampaignLocal(id, updates)
        : updateCampaignLocal(id, updates), // TODO: Replace with Supabase
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
        : deleteCampaignLocal(id), // TODO: Replace with Supabase
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
        : cancelCampaignLocal(id), // TODO: Replace with Supabase
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
