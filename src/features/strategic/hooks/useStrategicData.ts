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
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask,
  fetchTaskAreas,
  fetchTaskSubareas,
  fetchRestaurants,
  fetchAllProfiles,
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
  StrategicObjectiveInput,
  StrategicTaskInput,
  StrategicTaskWithDetails,
  TaskInput,
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
    queryFn: () => fetchRestaurants({ companyIds }),
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
    error: restaurantsQuery.error || objectivesQuery.error,
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

// ============================================
// HOOKS: TASKS
// ============================================

/**
 * Fetch tasks for selected restaurants
 */
export function useTasks(isCompleted?: boolean) {
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

// ============================================
// HOOKS: TASK AREAS & SUBAREAS
// ============================================

/**
 * Fetch all task areas
 */
export function useTaskAreas() {
  return useQuery({
    queryKey: queryKeys.taskAreas.all,
    queryFn: fetchTaskAreas,
    staleTime: 10 * 60 * 1000, // 10 minutes - these rarely change
  });
}

/**
 * Fetch task subareas for an area
 */
export function useTaskSubareas(areaId?: string) {
  return useQuery({
    queryKey: queryKeys.taskAreas.subareas(areaId),
    queryFn: () => fetchTaskSubareas(areaId),
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================
// HOOKS: PROFILES (for task owners)
// ============================================

/**
 * Fetch all profiles for task owner selection
 */
export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles.all,
    queryFn: fetchAllProfiles,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get horizon display info
 */
export function getHorizonInfo(horizon: ObjectiveHorizon) {
  const info = {
    short: { label: 'Corto Plazo', subtitle: '0-3 meses', color: 'blue' },
    medium: { label: 'Medio Plazo', subtitle: '3-12 meses', color: 'purple' },
    long: { label: 'Largo Plazo', subtitle: '+1 año', color: 'gray' },
  };
  return info[horizon];
}

/**
 * Get status display info
 */
export function getStatusInfo(status: ObjectiveStatus) {
  const info = {
    pending: { label: 'Pendiente', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    in_progress: { label: 'En Progreso', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    completed: { label: 'Cumplido', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  };
  return info[status];
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: string) {
  const info: Record<string, { label: string; icon: string; color: string }> = {
    financiero: { label: 'Financiero', icon: 'TrendingUp', color: 'green' },
    operaciones: { label: 'Operaciones', icon: 'Clock', color: 'purple' },
    reputacion: { label: 'Reputación', icon: 'Star', color: 'yellow' },
    marketing: { label: 'Marketing', icon: 'Megaphone', color: 'pink' },
    otro: { label: 'Otro', icon: 'MoreHorizontal', color: 'gray' },
  };
  return info[category] || info.otro;
}

/**
 * Calculate progress percentage for an objective
 */
export function calculateProgress(objective: StrategicObjective): number {
  if (!objective.kpiCurrentValue || !objective.kpiTargetValue) {
    return 0;
  }
  const progress = (objective.kpiCurrentValue / objective.kpiTargetValue) * 100;
  return Math.min(Math.round(progress), 100);
}

/**
 * Format KPI value for display
 */
export function formatKpiValue(value: number | null, unit: string | null): string {
  if (value === null) return '-';

  const formattedValue = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toFixed(value % 1 === 0 ? 0 : 1);

  return unit ? `${formattedValue}${unit}` : formattedValue;
}
