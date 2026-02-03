/**
 * useShareLinks Hook
 *
 * React Query hooks for managing objective share links.
 *
 * Features:
 * - Fetch share link by objective ID
 * - Create/update/delete share links
 * - Regenerate tokens
 * - Copy link to clipboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchShareLinkByObjectiveId,
  fetchShareLinkByToken,
  createShareLink,
  updateShareLink,
  deleteShareLink,
  regenerateShareLinkToken,
  recordShareLinkAccess,
  getShareLinkUrl,
  type CreateShareLinkParams,
  type UpdateShareLinkParams,
} from '@/services/shareLinks';
import type { ObjectiveShareLink } from '@/types';

// ============================================
// QUERY KEYS
// ============================================

export const shareLinkKeys = {
  all: ['shareLinks'] as const,
  byObjective: (objectiveId: string) => [...shareLinkKeys.all, 'objective', objectiveId] as const,
  byToken: (token: string) => [...shareLinkKeys.all, 'token', token] as const,
};

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch share link for a specific objective
 */
export function useShareLink(objectiveId: string | undefined) {
  return useQuery({
    queryKey: shareLinkKeys.byObjective(objectiveId || ''),
    queryFn: () => fetchShareLinkByObjectiveId(objectiveId!),
    enabled: !!objectiveId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch share link by token (for public access)
 */
export function useShareLinkByToken(token: string | undefined) {
  return useQuery({
    queryKey: shareLinkKeys.byToken(token || ''),
    queryFn: () => fetchShareLinkByToken(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new share link
 */
export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateShareLinkParams) => createShareLink(params),
    onSuccess: (data) => {
      queryClient.setQueryData(shareLinkKeys.byObjective(data.objectiveId), data);
    },
    onError: (error: Error) => {
      console.error('Error creating share link:', error);
    },
  });
}

/**
 * Update an existing share link
 */
export function useUpdateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateShareLinkParams }) =>
      updateShareLink(id, params),
    onSuccess: (data) => {
      queryClient.setQueryData(shareLinkKeys.byObjective(data.objectiveId), data);
    },
    onError: (error: Error) => {
      console.error('Error updating share link:', error);
    },
  });
}

/**
 * Delete a share link
 */
export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, objectiveId }: { id: string; objectiveId: string }) =>
      deleteShareLink(id).then(() => objectiveId),
    onSuccess: (objectiveId) => {
      queryClient.setQueryData(shareLinkKeys.byObjective(objectiveId), null);
    },
    onError: (error: Error) => {
      console.error('Error deleting share link:', error);
    },
  });
}

/**
 * Regenerate token for a share link
 */
export function useRegenerateToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateShareLinkToken(id),
    onSuccess: (data) => {
      queryClient.setQueryData(shareLinkKeys.byObjective(data.objectiveId), data);
    },
    onError: (error: Error) => {
      console.error('Error regenerating token:', error);
    },
  });
}

/**
 * Record access to a share link (for analytics)
 */
export function useRecordAccess() {
  return useMutation({
    mutationFn: (token: string) => recordShareLinkAccess(token),
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to manage share link with all operations
 */
export function useShareLinkManager(objectiveId: string | undefined) {
  const { data: shareLink, isLoading, error } = useShareLink(objectiveId);
  const createMutation = useCreateShareLink();
  const updateMutation = useUpdateShareLink();
  const deleteMutation = useDeleteShareLink();
  const regenerateMutation = useRegenerateToken();

  const create = (params?: Omit<CreateShareLinkParams, 'objectiveId'>) => {
    if (!objectiveId) return;
    return createMutation.mutateAsync({
      objectiveId,
      ...params,
    });
  };

  const toggleActive = () => {
    if (!shareLink) return;
    return updateMutation.mutateAsync({
      id: shareLink.id,
      params: { isActive: !shareLink.isActive },
    });
  };

  const setExpiration = (expiresAt: string | null) => {
    if (!shareLink) return;
    return updateMutation.mutateAsync({
      id: shareLink.id,
      params: { expiresAt },
    });
  };

  const setAllowedEmails = (emails: string[]) => {
    if (!shareLink) return;
    return updateMutation.mutateAsync({
      id: shareLink.id,
      params: { allowedEmails: emails },
    });
  };

  const regenerate = () => {
    if (!shareLink) return;
    return regenerateMutation.mutateAsync(shareLink.id);
  };

  const remove = () => {
    if (!shareLink || !objectiveId) return;
    return deleteMutation.mutateAsync({
      id: shareLink.id,
      objectiveId,
    });
  };

  const copyToClipboard = async () => {
    if (!shareLink) return false;
    try {
      const url = getShareLinkUrl(shareLink.token);
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      console.error('Error copying to clipboard');
      return false;
    }
  };

  const getUrl = () => {
    if (!shareLink) return null;
    return getShareLinkUrl(shareLink.token);
  };

  return {
    shareLink,
    isLoading,
    error,
    hasLink: !!shareLink,
    url: getUrl(),
    isActive: shareLink?.isActive ?? false,
    viewCount: shareLink?.viewCount ?? 0,

    // Mutations
    create,
    toggleActive,
    setExpiration,
    setAllowedEmails,
    regenerate,
    remove,
    copyToClipboard,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRegenerating: regenerateMutation.isPending,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      regenerateMutation.isPending,
  };
}

// ============================================
// HELPER
// ============================================

/**
 * Format the share link URL for display
 */
export function formatShareUrl(link: ObjectiveShareLink): string {
  return getShareLinkUrl(link.token);
}
