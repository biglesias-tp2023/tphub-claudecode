/**
 * Audit Data Hooks
 *
 * React Query hooks for fetching and managing audit data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import {
  fetchAuditTypes,
  fetchAuditTypeById,
  fetchAuditTypeBySlug,
  fetchAudits,
  fetchAuditsWithDetails,
  fetchAuditById,
  fetchAuditWithDetailsById,
  createAudit,
  updateAudit,
  deleteAudit,
  completeAudit,
} from '@/services/supabase-data';
import type { AuditInput, AuditStatus } from '@/types';

// ============================================
// AUDIT TYPES HOOKS
// ============================================

/**
 * Hook to fetch all active audit types
 */
export function useAuditTypes() {
  return useQuery({
    queryKey: queryKeys.auditTypes.all,
    queryFn: fetchAuditTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes - audit types rarely change
  });
}

/**
 * Hook to fetch a single audit type by ID
 */
export function useAuditType(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditTypes.detail(id || ''),
    queryFn: () => fetchAuditTypeById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch a single audit type by slug
 */
export function useAuditTypeBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditTypes.bySlug(slug || ''),
    queryFn: () => fetchAuditTypeBySlug(slug!),
    enabled: !!slug,
  });
}

// ============================================
// AUDITS HOOKS
// ============================================

interface UseAuditsParams {
  companyIds?: string[];
  brandIds?: string[];
  auditTypeIds?: string[];
  status?: AuditStatus;
}

/**
 * Hook to fetch audits with optional filtering
 */
export function useAudits(params: UseAuditsParams = {}) {
  return useQuery({
    queryKey: queryKeys.audits.list(params),
    queryFn: () => fetchAudits(params),
  });
}

/**
 * Hook to fetch audits with joined details
 */
export function useAuditsWithDetails(params: UseAuditsParams = {}) {
  return useQuery({
    queryKey: queryKeys.audits.list({ ...params, withDetails: true } as Record<string, unknown>),
    queryFn: () => fetchAuditsWithDetails(params),
  });
}

/**
 * Hook to fetch a single audit by ID
 */
export function useAudit(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.audits.detail(id || ''),
    queryFn: () => fetchAuditById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch a single audit with details by ID
 */
export function useAuditWithDetails(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.audits.withDetails(id || ''),
    queryFn: () => fetchAuditWithDetailsById(id!),
    enabled: !!id,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new audit
 */
export function useCreateAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AuditInput) => createAudit(input),
    onSuccess: () => {
      // Invalidate all audit queries
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });
}

/**
 * Hook to update an audit
 */
export function useUpdateAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AuditInput> & { desStatus?: AuditStatus } }) =>
      updateAudit(id, updates),
    onSuccess: (data) => {
      // Update the specific audit in the cache
      queryClient.setQueryData(queryKeys.audits.detail(data.pkIdAudit), data);
      // Invalidate the withDetails query so it refetches with fresh joined data
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.withDetails(data.pkIdAudit) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['audits', 'list'] });
    },
  });
}

/**
 * Hook to delete an audit
 */
export function useDeleteAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAudit(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.audits.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.audits.withDetails(id) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['audits', 'list'] });
    },
  });
}

/**
 * Hook to mark an audit as completed
 */
export function useCompleteAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeAudit(id),
    onSuccess: (data) => {
      // Update the specific audit in the cache
      queryClient.setQueryData(queryKeys.audits.detail(data.pkIdAudit), data);
      // Invalidate the withDetails query so it refetches with fresh joined data
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.withDetails(data.pkIdAudit) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['audits', 'list'] });
    },
  });
}

/**
 * Hook to save audit field data (partial update)
 */
export function useSaveAuditFieldData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fieldData }: { id: string; fieldData: Record<string, unknown> }) =>
      updateAudit(id, { desFieldData: fieldData }),
    onSuccess: (data) => {
      // Update the specific audit in the cache
      queryClient.setQueryData(queryKeys.audits.detail(data.pkIdAudit), data);
      // Invalidate the withDetails query so it refetches with fresh joined data
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.withDetails(data.pkIdAudit) });
    },
  });
}
