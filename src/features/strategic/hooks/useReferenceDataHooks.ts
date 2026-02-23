import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_GC_MEDIUM, QUERY_GC_LONG } from '@/constants/queryConfig';
import {
  fetchTaskAreas,
  fetchTaskSubareas,
  fetchAllProfiles,
} from '@/services/supabase-data';

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
    gcTime: QUERY_GC_LONG,
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
    gcTime: QUERY_GC_LONG,
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
    gcTime: QUERY_GC_MEDIUM,
  });
}
