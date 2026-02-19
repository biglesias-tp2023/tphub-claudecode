import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { queryKeys } from '@/constants/queryKeys';
import {
  fetchRestaurants,
  fetchStrategicTasks,
  fetchStrategicTasksWithDetails,
  createStrategicTask,
  updateStrategicTask,
  toggleStrategicTaskCompleted,
  deleteStrategicTask,
  generateTasksForObjective,
} from '@/services/supabase-data';
import type {
  StrategicObjective,
  StrategicTaskInput,
  StrategicTaskWithDetails,
} from '@/types';

// ============================================
// HOOKS: STRATEGIC TASKS (linked to objectives)
// ============================================

/**
 * Fetch strategic tasks for selected restaurants
 */
export function useStrategicTasks(params?: {
  isCompleted?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  const { companyIds } = useGlobalFiltersStore();
  const { restaurantIds: filterRestaurantIds } = useDashboardFiltersStore();

  // First fetch restaurants to get IDs
  const restaurantsQuery = useQuery({
    queryKey: queryKeys.restaurants.list({ companyIds }),
    queryFn: () => fetchRestaurants({ companyIds }),
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

  // Determine query key based on params
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const queryKey = useMemo(() => {
    if (params?.startDate && params?.endDate) {
      return queryKeys.strategicTasks.byDateRange(restaurantIds, params.startDate, params.endDate);
    }
    if (params?.isCompleted === true) {
      return queryKeys.strategicTasks.completed(restaurantIds);
    }
    if (params?.isCompleted === false) {
      return queryKeys.strategicTasks.pending(restaurantIds);
    }
    return queryKeys.strategicTasks.all(restaurantIds);
  }, [restaurantIds, params?.isCompleted, params?.startDate, params?.endDate]);

  // Fetch tasks with details
  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => fetchStrategicTasksWithDetails({
      restaurantIds,
      isCompleted: params?.isCompleted,
      startDate: params?.startDate,
      endDate: params?.endDate,
    }),
    enabled: restaurantIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Group tasks by date for calendar view
  const tasksByDate = useMemo(() => {
    const tasks = tasksQuery.data || [];
    const grouped: Record<string, StrategicTaskWithDetails[]> = {};

    for (const task of tasks) {
      const dateKey = task.deadline
        ? task.deadline.split('T')[0]
        : 'no-date';

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    }

    // Sort each day's tasks by display order
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return grouped;
  }, [tasksQuery.data]);

  // Get sorted date keys
  const sortedDates = useMemo(() => {
    return Object.keys(tasksByDate)
      .filter((d) => d !== 'no-date')
      .sort((a, b) => a.localeCompare(b));
  }, [tasksByDate]);

  // Stats
  const stats = useMemo(() => {
    const tasks = tasksQuery.data || [];
    const completed = tasks.filter((t) => t.isCompleted).length;
    const pending = tasks.filter((t) => !t.isCompleted).length;
    const overdue = tasks.filter((t) => {
      if (t.isCompleted || !t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    return { completed, pending, overdue, total: tasks.length };
  }, [tasksQuery.data]);

  // Task counts by objective ID (for ObjectiveCard)
  const taskCountByObjectiveId = useMemo(() => {
    const tasks = tasksQuery.data || [];
    const counts: Record<string, { completed: number; total: number }> = {};

    for (const task of tasks) {
      if (!task.objectiveId) continue;
      if (!counts[task.objectiveId]) {
        counts[task.objectiveId] = { completed: 0, total: 0 };
      }
      counts[task.objectiveId].total++;
      if (task.isCompleted) {
        counts[task.objectiveId].completed++;
      }
    }

    return counts;
  }, [tasksQuery.data]);

  return {
    tasks: tasksQuery.data || [],
    tasksByDate,
    sortedDates,
    stats,
    taskCountByObjectiveId,
    restaurantIds,
    isLoading: restaurantsQuery.isLoading || tasksQuery.isLoading,
    error: restaurantsQuery.error || tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}

/**
 * Fetch strategic tasks for a specific objective
 */
export function useStrategicTasksForObjective(objectiveId: string) {
  return useQuery({
    queryKey: queryKeys.strategicTasks.byObjective(objectiveId),
    queryFn: () => fetchStrategicTasks({ objectiveIds: [objectiveId] }),
    enabled: !!objectiveId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a strategic task
 */
export function useCreateStrategicTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStrategicTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
  });
}

/**
 * Update a strategic task
 */
export function useUpdateStrategicTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StrategicTaskInput> & { isCompleted?: boolean } }) =>
      updateStrategicTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
  });
}

/**
 * Toggle strategic task completion
 */
export function useToggleStrategicTaskCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleStrategicTaskCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
  });
}

/**
 * Delete a strategic task
 */
export function useDeleteStrategicTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStrategicTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
  });
}

/**
 * Generate tasks for an objective (used after creating objective)
 */
export function useGenerateTasksForObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objective, companyName }: { objective: StrategicObjective; companyName?: string }) =>
      generateTasksForObjective(objective, companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
  });
}
