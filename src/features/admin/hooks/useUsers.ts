import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchAllProfiles, updateProfile, deleteProfile } from '@/services/supabase-data';
import type { UserRole } from '@/types';

/**
 * Fetches all user profiles (admin only - RLS enforced)
 *
 * @returns React Query result with profiles array
 *
 * @example
 * const { data: users, isLoading } = useUsers();
 */
export function useUsers() {
  return useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: fetchAllProfiles,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Mutation to update a user's profile
 *
 * @returns React Query mutation for updating profiles
 *
 * @example
 * const { mutate: updateUser } = useUpdateProfile();
 * updateUser({ profileId: 'uuid', updates: { role: 'admin' } });
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      updates,
    }: {
      profileId: string;
      updates: Partial<{
        fullName: string;
        avatarUrl: string;
        role: UserRole;
        assignedCompanyIds: string[];
      }>;
    }) => updateProfile(profileId, updates),
    onSuccess: () => {
      // Invalidate and refetch profiles
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/**
 * Mutation to assign companies to a user
 *
 * @returns React Query mutation for assigning companies
 *
 * @example
 * const { mutate: assignCompanies } = useAssignCompanies();
 * assignCompanies({ profileId: 'uuid', companyIds: ['uuid1', 'uuid2'] });
 */
export function useAssignCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      companyIds,
    }: {
      profileId: string;
      companyIds: string[];
    }) => updateProfile(profileId, { assignedCompanyIds: companyIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/**
 * Mutation to update a user's role
 *
 * @returns React Query mutation for updating role
 *
 * @example
 * const { mutate: updateRole } = useUpdateRole();
 * updateRole({ profileId: 'uuid', role: 'admin' });
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      role,
    }: {
      profileId: string;
      role: UserRole;
    }) => updateProfile(profileId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/**
 * Mutation to delete a user's profile
 *
 * Note: Owner accounts cannot be deleted (protected by DB trigger).
 * Only users with higher role hierarchy can delete other users.
 *
 * @returns React Query mutation for deleting profiles
 *
 * @example
 * const { mutate: deleteUser } = useDeleteUser();
 * deleteUser('profile-uuid');
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => deleteProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
