/**
 * Profiles data operations
 */

import { supabase, handleQueryError } from './shared';
import { mapDbProfileToProfile } from './mappers';
import type { Profile, UserRole, DbProfile } from '@/types';

/**
 * Fetch the current user's profile
 */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar el perfil');
  }
  return mapDbProfileToProfile(data as DbProfile);
}

/**
 * Fetch all profiles (admin only - RLS enforced)
 */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');

  if (error) handleQueryError(error, 'No se pudieron cargar los perfiles');
  return (data as DbProfile[]).map(mapDbProfileToProfile);
}

/**
 * Update a user's profile (admin can update any, users can update their own)
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<{
    fullName: string;
    avatarUrl: string;
    role: UserRole;
    assignedCompanyIds: string[];
  }>
): Promise<Profile> {
  const dbUpdates: Partial<DbProfile> = {};

  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.assignedCompanyIds !== undefined) {
    dbUpdates.assigned_company_ids = updates.assignedCompanyIds;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al actualizar el perfil');
  return mapDbProfileToProfile(data as DbProfile);
}

/**
 * Delete a user's profile (admin/superadmin only, owner cannot be deleted)
 *
 * Note: This only deletes the profile record, not the auth.users entry.
 * The user won't be able to access TPHub but their Supabase auth account remains.
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    // Check for owner protection trigger
    if (error.message?.includes('Cannot delete owner')) {
      throw new Error('No se puede eliminar la cuenta del Owner');
    }
    handleQueryError(error, 'Error al eliminar el perfil');
  }
}
