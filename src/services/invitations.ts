/**
 * User Invitations Service
 *
 * Handles inviting external users (consultants) to TPHub.
 * Uses Magic Link for authentication - no service role key required.
 *
 * @module services/invitations
 */

import { supabase } from './supabase';
import type { UserRole } from '@/types';

// ============================================
// TYPES
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  assignedCompanyIds: string[];
  status: InvitationStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  invitationNote: string | null;
}

export interface DbUserInvitation {
  id: string;
  email: string;
  role: string;
  assigned_company_ids: string[];
  status: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  invitation_note: string | null;
}

export interface InvitationInput {
  email: string;
  role?: UserRole;
  assignedCompanyIds?: string[];
  invitationNote?: string;
}

export interface InvitationWithInviter extends UserInvitation {
  inviterName?: string;
  inviterEmail?: string;
}

// ============================================
// MAPPER
// ============================================

function mapDbInvitation(db: DbUserInvitation): UserInvitation {
  return {
    id: db.id,
    email: db.email,
    role: db.role as UserRole,
    assignedCompanyIds: db.assigned_company_ids || [],
    status: db.status as InvitationStatus,
    invitedBy: db.invited_by,
    invitedAt: db.invited_at,
    acceptedAt: db.accepted_at,
    expiresAt: db.expires_at,
    invitationNote: db.invitation_note,
  };
}

// ============================================
// FETCH INVITATIONS
// ============================================

export interface FetchInvitationsParams {
  status?: InvitationStatus;
  email?: string;
}

/**
 * Fetch invitations with optional filtering
 */
export async function fetchInvitations(
  params: FetchInvitationsParams = {}
): Promise<UserInvitation[]> {
  let query = supabase
    .from('user_invitations')
    .select('*')
    .order('invited_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.email) {
    query = query.ilike('email', `%${params.email}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error fetching invitations: ${error.message}`);
  return (data as DbUserInvitation[]).map(mapDbInvitation);
}

/**
 * Fetch invitations with inviter details
 */
export async function fetchInvitationsWithDetails(
  params: FetchInvitationsParams = {}
): Promise<InvitationWithInviter[]> {
  const invitations = await fetchInvitations(params);

  if (invitations.length === 0) return [];

  // Get unique inviter IDs
  const inviterIds = [...new Set(invitations.filter(i => i.invitedBy).map(i => i.invitedBy!))];

  // Fetch inviter profiles
  let inviterMap = new Map<string, { fullName: string | null; email: string }>();
  if (inviterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', inviterIds);

    if (profiles) {
      inviterMap = new Map(
        profiles.map((p: { id: string; full_name: string | null; email: string }) => [
          p.id,
          { fullName: p.full_name, email: p.email },
        ])
      );
    }
  }

  return invitations.map(invitation => {
    const inviter = invitation.invitedBy ? inviterMap.get(invitation.invitedBy) : undefined;
    return {
      ...invitation,
      inviterName: inviter?.fullName || undefined,
      inviterEmail: inviter?.email,
    };
  });
}

/**
 * Fetch a single invitation by ID
 */
export async function fetchInvitationById(id: string): Promise<UserInvitation | null> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching invitation: ${error.message}`);
  }

  return mapDbInvitation(data as DbUserInvitation);
}

/**
 * Check if an email has a pending invitation
 */
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (error) throw new Error(`Error checking invitation: ${error.message}`);
  return data.length > 0;
}

// ============================================
// CREATE INVITATION
// ============================================

// Allowed email domain for invitations
const ALLOWED_EMAIL_DOMAIN = '@thinkpaladar.com';

/**
 * Create an invitation and send Magic Link email
 *
 * Flow:
 * 1. Validate email domain (backend validation - security critical)
 * 2. Save invitation with pre-configured role and companies
 * 3. Send Magic Link via Supabase Auth
 * 4. When user clicks link, profile is created
 * 5. Trigger applies role/companies from invitation
 */
export async function createInvitation(input: InvitationInput): Promise<UserInvitation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be authenticated to create invitations');

  const email = input.email.toLowerCase().trim();

  // Security: Validate email domain (server-side validation)
  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Solo se permiten invitaciones a emails del dominio ${ALLOWED_EMAIL_DOMAIN}`);
  }

  // Check for existing pending invitation
  const hasPending = await hasPendingInvitation(email);
  if (hasPending) {
    throw new Error('Ya existe una invitación pendiente para este email');
  }

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingProfile) {
    throw new Error('Este usuario ya tiene una cuenta en TPHub');
  }

  // Create invitation record
  const dbInput = {
    email,
    role: input.role || 'consultant',
    assigned_company_ids: input.assignedCompanyIds || [],
    invited_by: user.id,
    invitation_note: input.invitationNote || null,
  };

  const { data, error } = await supabase
    .from('user_invitations')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw new Error(`Error creating invitation: ${error.message}`);

  // Send Magic Link
  const redirectUrl = `${window.location.origin}/auth/callback`;
  const { error: authError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        invitation_id: data.id,
      },
    },
  });

  if (authError) {
    // Rollback: delete the invitation if email fails
    await supabase.from('user_invitations').delete().eq('id', data.id);
    throw new Error(`Error sending invitation email: ${authError.message}`);
  }

  return mapDbInvitation(data as DbUserInvitation);
}

// ============================================
// UPDATE INVITATION
// ============================================

/**
 * Update invitation details
 */
export async function updateInvitation(
  id: string,
  updates: Partial<Pick<InvitationInput, 'role' | 'assignedCompanyIds' | 'invitationNote'>>
): Promise<UserInvitation> {
  const dbUpdates: Partial<DbUserInvitation> = {};

  if (updates.role !== undefined) {
    dbUpdates.role = updates.role;
  }
  if (updates.assignedCompanyIds !== undefined) {
    dbUpdates.assigned_company_ids = updates.assignedCompanyIds;
  }
  if (updates.invitationNote !== undefined) {
    dbUpdates.invitation_note = updates.invitationNote;
  }

  const { data, error } = await supabase
    .from('user_invitations')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating invitation: ${error.message}`);
  return mapDbInvitation(data as DbUserInvitation);
}

// ============================================
// CANCEL INVITATION
// ============================================

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(id: string): Promise<UserInvitation> {
  const { data, error } = await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw new Error(`Error cancelling invitation: ${error.message}`);
  return mapDbInvitation(data as DbUserInvitation);
}

// ============================================
// RESEND INVITATION
// ============================================

/**
 * Resend invitation email (extends expiry)
 */
export async function resendInvitation(id: string): Promise<UserInvitation> {
  // Fetch current invitation
  const invitation = await fetchInvitationById(id);
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status !== 'pending') {
    throw new Error('Solo se pueden reenviar invitaciones pendientes');
  }

  // Extend expiry (24 hours for security)
  const newExpiry = new Date();
  newExpiry.setHours(newExpiry.getHours() + 24);

  const { data, error } = await supabase
    .from('user_invitations')
    .update({
      expires_at: newExpiry.toISOString(),
      invited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating invitation: ${error.message}`);

  // Resend Magic Link
  const redirectUrl = `${window.location.origin}/auth/callback`;
  const { error: authError } = await supabase.auth.signInWithOtp({
    email: invitation.email,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        invitation_id: id,
      },
    },
  });

  if (authError) throw new Error(`Error resending invitation: ${authError.message}`);

  return mapDbInvitation(data as DbUserInvitation);
}

// ============================================
// DELETE INVITATION
// ============================================

/**
 * Delete an invitation (only for cancelled/expired)
 */
export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_invitations')
    .delete()
    .eq('id', id)
    .in('status', ['cancelled', 'expired']);

  if (error) throw new Error(`Error deleting invitation: ${error.message}`);
}

// ============================================
// STATISTICS
// ============================================

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
}

/**
 * Get invitation statistics
 */
export async function getInvitationStats(): Promise<InvitationStats> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('status');

  if (error) throw new Error(`Error fetching stats: ${error.message}`);

  const stats: InvitationStats = {
    total: data.length,
    pending: 0,
    accepted: 0,
    expired: 0,
    cancelled: 0,
  };

  for (const row of data) {
    const status = row.status as InvitationStatus;
    if (status in stats) {
      stats[status]++;
    }
  }

  return stats;
}
