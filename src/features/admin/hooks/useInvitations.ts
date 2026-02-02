/**
 * Invitation Hooks
 *
 * React Query hooks for managing user invitations.
 *
 * @module features/admin/hooks/useInvitations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInvitationsWithDetails,
  fetchInvitationById,
  createInvitation,
  updateInvitation,
  cancelInvitation,
  resendInvitation,
  deleteInvitation,
  getInvitationStats,
  type InvitationInput,
  type FetchInvitationsParams,
  type UserInvitation,
  type InvitationStatus,
} from '@/services/invitations';

// Query keys
const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (params: FetchInvitationsParams) => [...invitationKeys.lists(), params] as const,
  details: () => [...invitationKeys.all, 'detail'] as const,
  detail: (id: string) => [...invitationKeys.details(), id] as const,
  stats: () => [...invitationKeys.all, 'stats'] as const,
};

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Hook to fetch invitations list
 */
export function useInvitations(params: FetchInvitationsParams = {}) {
  return useQuery({
    queryKey: invitationKeys.list(params),
    queryFn: () => fetchInvitationsWithDetails(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch pending invitations
 */
export function usePendingInvitations() {
  return useInvitations({ status: 'pending' });
}

/**
 * Hook to fetch a single invitation
 */
export function useInvitation(id: string | undefined) {
  return useQuery({
    queryKey: invitationKeys.detail(id || ''),
    queryFn: () => fetchInvitationById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch invitation statistics
 */
export function useInvitationStats() {
  return useQuery({
    queryKey: invitationKeys.stats(),
    queryFn: getInvitationStats,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new invitation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InvitationInput) => createInvitation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

/**
 * Hook to update an invitation
 */
export function useUpdateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<InvitationInput, 'role' | 'assignedCompanyIds' | 'invitationNote'>>;
    }) => updateInvitation(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(invitationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
}

/**
 * Hook to cancel an invitation
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: (data) => {
      queryClient.setQueryData(invitationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
    },
  });
}

/**
 * Hook to resend an invitation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: (data) => {
      queryClient.setQueryData(invitationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
}

/**
 * Hook to delete an invitation
 */
export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvitation(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: invitationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
    },
  });
}

// ============================================
// RE-EXPORTS
// ============================================

export type { UserInvitation, InvitationInput, InvitationStatus, FetchInvitationsParams };
