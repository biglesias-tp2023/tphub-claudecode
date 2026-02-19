import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { queryKeys } from '@/constants/queryKeys';
import {
  fetchStrategicObjectives,
  createStrategicObjective,
  updateStrategicObjective,
  updateStrategicObjectiveOrder,
  deleteStrategicObjective,
} from '@/services/supabase-data';
import { fetchCrpRestaurants } from '@/services/crp-portal';
import type {
  StrategicObjectiveInput,
  ObjectiveHorizon,
  ObjectiveStatus,
} from '@/types';

// ============================================
// HOOKS: STRATEGIC OBJECTIVES
// ============================================

/**
 * Fetch strategic objectives for selected companies
 * Now uses companyIds directly instead of filtering through restaurants
 */
export function useStrategicObjectives(horizon?: ObjectiveHorizon) {
  const { companyIds } = useGlobalFiltersStore();
  const { brandIds, restaurantIds: filterAddressIds } = useDashboardFiltersStore();

  // Also fetch restaurants for backward compatibility (used by other components)
  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants.list({ companyIds }),
    queryFn: () => fetchCrpRestaurants({ companyIds: companyIds.length > 0 ? companyIds : undefined }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch objectives directly by companyIds (no longer filtered through restaurants)
  // Note: restaurantIds from store maps to addressIds in the new CRP Portal model
  const objectivesQuery = useQuery({
    queryKey: horizon
      ? queryKeys.strategicObjectives.byHorizon(companyIds, horizon)
      : queryKeys.strategicObjectives.all(companyIds),
    queryFn: () => fetchStrategicObjectives({
      companyIds: companyIds.length > 0 ? companyIds : undefined,
      brandIds: brandIds.length > 0 ? brandIds : undefined,
      addressIds: filterAddressIds.length > 0 ? filterAddressIds : undefined,
      horizon,
    }),
    // Always enabled - show all objectives if no company filter is set
    staleTime: 2 * 60 * 1000,
  });

  // Group objectives by horizon
  const objectivesByHorizon = useMemo(() => {
    const objectives = objectivesQuery.data || [];
    return {
      short: objectives.filter((o) => o.horizon === 'short'),
      medium: objectives.filter((o) => o.horizon === 'medium'),
      long: objectives.filter((o) => o.horizon === 'long'),
    };
  }, [objectivesQuery.data]);

  // Calculate stats
  const stats = useMemo(() => {
    const objectives = objectivesQuery.data || [];
    const completed = objectives.filter((o) => o.status === 'completed').length;
    const inProgress = objectives.filter((o) => o.status === 'in_progress').length;
    const pending = objectives.filter((o) => o.status === 'pending').length;
    const total = objectives.length;
    const effectiveness = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      inProgress,
      pending,
      notCompleted: pending, // Alias for UI
      total,
      effectiveness,
    };
  }, [objectivesQuery.data]);

  // Get restaurant IDs from fetched restaurants (for backward compatibility)
  const restaurantIds = useMemo(() => {
    return (restaurantsQuery.data || []).map((r) => r.id);
  }, [restaurantsQuery.data]);

  return {
    objectives: objectivesQuery.data || [],
    objectivesByHorizon,
    stats,
    restaurants: restaurantsQuery.data || [],
    restaurantIds,
    companyIds, // Expose companyIds for the editor
    isLoading: restaurantsQuery.isLoading || objectivesQuery.isLoading,
    error: objectivesQuery.error,
    refetch: objectivesQuery.refetch,
  };
}

/**
 * Create a strategic objective
 */
export function useCreateStrategicObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStrategicObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-objectives'] });
    },
  });
}

/**
 * Update a strategic objective
 */
export function useUpdateStrategicObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StrategicObjectiveInput> & { status?: ObjectiveStatus } }) =>
      updateStrategicObjective(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-objectives'] });
    },
  });
}

/**
 * Reorder strategic objectives (drag & drop)
 */
export function useReorderStrategicObjectives() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStrategicObjectiveOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-objectives'] });
    },
  });
}

/**
 * Delete a strategic objective
 */
export function useDeleteStrategicObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStrategicObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-objectives'] });
    },
  });
}
