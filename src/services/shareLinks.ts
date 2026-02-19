/**
 * Share Links Service
 *
 * Handles CRUD operations for objective share links.
 * Allows consultants to share objectives with clients via public URLs.
 *
 * Features:
 * - Generate unique share tokens
 * - Set expiration dates
 * - Track view counts
 * - Enable/disable sharing
 */

import { supabase } from './supabase';
import type { ObjectiveShareLink } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const MOCK_MODE = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
const STORAGE_KEY = 'tphub_share_links';

// ============================================
// TYPES
// ============================================

export interface CreateShareLinkParams {
  objectiveId: string;
  expiresAt?: string | null;
  allowedEmails?: string[];
}

export interface UpdateShareLinkParams {
  isActive?: boolean;
  expiresAt?: string | null;
  allowedEmails?: string[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Generate a URL-safe random token
 */
function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Get share links from localStorage (mock mode)
 */
function getMockShareLinks(): ObjectiveShareLink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save share links to localStorage (mock mode)
 */
function saveMockShareLinks(links: ObjectiveShareLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// ============================================
// FETCH OPERATIONS
// ============================================

/**
 * Fetch share link by objective ID
 */
export async function fetchShareLinkByObjectiveId(
  objectiveId: string
): Promise<ObjectiveShareLink | null> {
  if (MOCK_MODE) {
    const links = getMockShareLinks();
    return links.find((l) => l.objectiveId === objectiveId) || null;
  }

  const { data, error } = await supabase
    .from('objective_share_links')
    .select('*')
    .eq('objective_id', objectiveId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return mapDbShareLink(data);
}

/**
 * Fetch share link by token (for public access)
 */
export async function fetchShareLinkByToken(
  token: string
): Promise<ObjectiveShareLink | null> {
  if (MOCK_MODE) {
    const links = getMockShareLinks();
    const link = links.find((l) => l.token === token) || null;
    if (link && !isShareLinkValid(link).valid) return null;
    return link;
  }

  const { data, error } = await supabase
    .from('objective_share_links')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Check expiration client-side (Supabase doesn't support nullable gt easily)
  const link = mapDbShareLink(data);
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return null;
  }

  return link;
}

/**
 * Fetch all share links for a list of objectives
 */
export async function fetchShareLinksByObjectiveIds(
  objectiveIds: string[]
): Promise<ObjectiveShareLink[]> {
  if (objectiveIds.length === 0) return [];

  if (MOCK_MODE) {
    const links = getMockShareLinks();
    return links.filter((l) => objectiveIds.includes(l.objectiveId));
  }

  const { data, error } = await supabase
    .from('objective_share_links')
    .select('*')
    .in('objective_id', objectiveIds);

  if (error) throw error;

  return (data || []).map(mapDbShareLink);
}

// ============================================
// CREATE / UPDATE / DELETE
// ============================================

/**
 * Create a new share link for an objective
 */
export async function createShareLink(
  params: CreateShareLinkParams
): Promise<ObjectiveShareLink> {
  const token = generateToken();
  const now = new Date().toISOString();

  if (MOCK_MODE) {
    const links = getMockShareLinks();

    // Check if link already exists
    const existing = links.find((l) => l.objectiveId === params.objectiveId);
    if (existing) {
      throw new Error('Share link already exists for this objective');
    }

    const newLink: ObjectiveShareLink = {
      id: crypto.randomUUID(),
      objectiveId: params.objectiveId,
      token,
      isActive: true,
      expiresAt: params.expiresAt || null,
      viewCount: 0,
      allowedEmails: params.allowedEmails || [],
      createdAt: now,
      lastAccessedAt: null,
    };

    links.push(newLink);
    saveMockShareLinks(links);
    return newLink;
  }

  const { data, error } = await supabase
    .from('objective_share_links')
    .insert({
      objective_id: params.objectiveId,
      token,
      is_active: true,
      expires_at: params.expiresAt || null,
      allowed_emails: params.allowedEmails || [],
      view_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return mapDbShareLink(data);
}

/**
 * Update an existing share link
 */
export async function updateShareLink(
  id: string,
  params: UpdateShareLinkParams
): Promise<ObjectiveShareLink> {
  if (MOCK_MODE) {
    const links = getMockShareLinks();
    const index = links.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Share link not found');

    const updated = { ...links[index] };
    if (params.isActive !== undefined) updated.isActive = params.isActive;
    if (params.expiresAt !== undefined) updated.expiresAt = params.expiresAt;
    if (params.allowedEmails !== undefined) updated.allowedEmails = params.allowedEmails;

    links[index] = updated;
    saveMockShareLinks(links);
    return updated;
  }

  const updateData: Record<string, unknown> = {};
  if (params.isActive !== undefined) updateData.is_active = params.isActive;
  if (params.expiresAt !== undefined) updateData.expires_at = params.expiresAt;
  if (params.allowedEmails !== undefined) updateData.allowed_emails = params.allowedEmails;

  const { data, error } = await supabase
    .from('objective_share_links')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return mapDbShareLink(data);
}

/**
 * Delete a share link
 */
export async function deleteShareLink(id: string): Promise<void> {
  if (MOCK_MODE) {
    const links = getMockShareLinks();
    const filtered = links.filter((l) => l.id !== id);
    saveMockShareLinks(filtered);
    return;
  }

  const { error } = await supabase
    .from('objective_share_links')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Regenerate token for a share link
 */
export async function regenerateShareLinkToken(
  id: string
): Promise<ObjectiveShareLink> {
  const newToken = generateToken();

  if (MOCK_MODE) {
    const links = getMockShareLinks();
    const index = links.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Share link not found');

    links[index] = { ...links[index], token: newToken };
    saveMockShareLinks(links);
    return links[index];
  }

  const { data, error } = await supabase
    .from('objective_share_links')
    .update({ token: newToken })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return mapDbShareLink(data);
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Increment view count when link is accessed
 */
export async function recordShareLinkAccess(token: string): Promise<void> {
  const now = new Date().toISOString();

  if (MOCK_MODE) {
    const links = getMockShareLinks();
    const index = links.findIndex((l) => l.token === token);
    if (index !== -1) {
      links[index] = {
        ...links[index],
        viewCount: links[index].viewCount + 1,
        lastAccessedAt: now,
      };
      saveMockShareLinks(links);
    }
    return;
  }

  // Use RPC or increment directly
  const { error } = await supabase.rpc('increment_share_link_view', {
    link_token: token,
  });

  if (error) {
    // Fallback to manual update if RPC doesn't exist
    if (import.meta.env.DEV) {
      console.warn('RPC not available, using manual update:', error);
    }
    await supabase
      .from('objective_share_links')
      .update({ last_accessed_at: now })
      .eq('token', token);
  }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if a share link is valid for access
 */
export function isShareLinkValid(link: ObjectiveShareLink): {
  valid: boolean;
  reason?: string;
} {
  if (!link.isActive) {
    return { valid: false, reason: 'Link is disabled' };
  }

  if (link.expiresAt) {
    const expiryDate = new Date(link.expiresAt);
    if (expiryDate < new Date()) {
      return { valid: false, reason: 'Link has expired' };
    }
  }

  return { valid: true };
}

/**
 * Check if email is allowed to access the link
 */
export function isEmailAllowed(link: ObjectiveShareLink, email: string): boolean {
  // If no email restrictions, allow all
  if (!link.allowedEmails || link.allowedEmails.length === 0) {
    return true;
  }

  // Check if email is in allowed list
  return link.allowedEmails.some(
    (allowed) => allowed.toLowerCase() === email.toLowerCase()
  );
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Generate the public URL for a share link
 */
export function getShareLinkUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${token}`;
}

// ============================================
// MAPPERS
// ============================================

interface DbShareLink {
  id: string;
  objective_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  allowed_emails: string[] | null;
  created_at: string;
  last_accessed_at: string | null;
}

function mapDbShareLink(db: DbShareLink): ObjectiveShareLink {
  return {
    id: db.id,
    objectiveId: db.objective_id,
    token: db.token,
    isActive: db.is_active,
    expiresAt: db.expires_at,
    viewCount: db.view_count,
    allowedEmails: db.allowed_emails || [],
    createdAt: db.created_at,
    lastAccessedAt: db.last_accessed_at,
  };
}
