import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { queryKeys } from '@/constants/queryKeys';
import {
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask,
} from '@/services/supabase-data';
import { fetchCrpRestaurants } from '@/services/crp-portal';
import type { TaskInput } from '@/types';

// ============================================
// HOOKS: TASKS
// ============================================

/**
 * Fetch tasks for selected restaurants
 */
export function useTasks(isCompleted?: boolean) {
  const { companyIds } = useGlobalFiltersStore();
  const { restaurantIds: filterRestaurantIds } = useDashboardFiltersStore();

  // First fetch restaurants to get IDs (using CRP Portal)
  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants.list({ companyIds }),
    queryFn: () => fetchCrpRestaurants({ companyIds: companyIds.length > 0 ? companyIds : undefined }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter restaurant IDs
  const restaurantIds = useMemo(() => {
    if (!restaurantsQuery.data) return [];
    if (filterRestaurantIds.length > 0) {
      return filterRestaurantIds;
    }
    return restaurantsQuery.data.map((r) => r.id);
  }, [restaurantsQuery.data, filterRestaurantIds]);

  // Fetch tasks
  const tasksQuery = useQuery({
    queryKey: isCompleted !== undefined
      ? (isCompleted ? queryKeys.tasks.completed(restaurantIds) : queryKeys.tasks.pending(restaurantIds))
      : queryKeys.tasks.all(restaurantIds),
    queryFn: () => fetchTasks({ restaurantIds, isCompleted }),
    enabled: restaurantIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Separate pending and completed tasks
  const { pendingTasks, completedTasks } = useMemo(() => {
    const tasks = tasksQuery.data || [];
    return {
      pendingTasks: tasks.filter((t) => !t.isCompleted),
      completedTasks: tasks.filter((t) => t.isCompleted),
    };
  }, [tasksQuery.data]);

  return {
    tasks: tasksQuery.data || [],
    pendingTasks,
    completedTasks,
    restaurantIds,
    isLoading: restaurantsQuery.isLoading || tasksQuery.isLoading,
    error: restaurantsQuery.error || tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}

/**
 * Create a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TaskInput> & { isCompleted?: boolean } }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Toggle task completion
 */
export function useToggleTaskCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      toggleTaskCompletion(id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
