/**
 * Alert Preferences Hooks
 *
 * React Query hooks for managing per-company alert preferences.
 *
 * @module features/my-clients/hooks/useAlertPreferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_GC_SHORT } from '@/constants/queryConfig';
import {
  fetchAlertPreferences,
  upsertAlertPreference,
  bulkUpsertAlertPreferences,
  deleteAlertPreference,
  type AlertPreference,
  type AlertPreferenceInput,
} from '@/services/alertPreferences';

// Query keys
export const alertPreferenceKeys = {
  all: ['alert-preferences'] as const,
  lists: () => [...alertPreferenceKeys.all, 'list'] as const,
  list: (consultantId: string) => [...alertPreferenceKeys.lists(), consultantId] as const,
};

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Hook to fetch alert preferences for a consultant
 */
export function useAlertPreferences(consultantId: string | undefined) {
  return useQuery({
    queryKey: alertPreferenceKeys.list(consultantId || ''),
    queryFn: () => fetchAlertPreferences(consultantId!),
    enabled: !!consultantId,
    staleTime: 30 * 1000,
    gcTime: QUERY_GC_SHORT,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to upsert an alert preference
 */
export function useUpsertAlertPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AlertPreferenceInput) => upsertAlertPreference(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: alertPreferenceKeys.list(data.consultantId),
      });
    },
  });
}

/**
 * Hook to bulk upsert alert preferences
 */
export function useBulkUpsertAlertPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: AlertPreferenceInput[]) => bulkUpsertAlertPreferences(inputs),
    onSuccess: (_data, inputs) => {
      // Invalidate for each unique consultant
      const consultantIds = [...new Set(inputs.map((i) => i.consultantId))];
      for (const id of consultantIds) {
        queryClient.invalidateQueries({
          queryKey: alertPreferenceKeys.list(id),
        });
      }
    },
  });
}

/**
 * Hook to delete an alert preference (revert to defaults)
 */
export function useDeleteAlertPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAlertPreference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: alertPreferenceKeys.all,
      });
    },
  });
}

// ============================================
// RE-EXPORTS
// ============================================

export type { AlertPreference, AlertPreferenceInput };
