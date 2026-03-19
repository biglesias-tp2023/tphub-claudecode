/**
 * Calendar Share Links Service
 *
 * Manages share links for calendar views, allowing consultants
 * to share read-only calendar views with clients.
 *
 * @module services/calendarShareLinks
 */

import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface CalendarShareLink {
  id: string;
  token: string;
  createdBy: string | null;
  config: CalendarShareConfig;
  isActive: boolean;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarShareConfig {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  platformFilters?: string[];
  categoryFilters?: string[];
  region?: string;
}

interface DbCalendarShareLink {
  id: string;
  token: string;
  created_by: string | null;
  config: CalendarShareConfig;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// HELPERS
// ============================================

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

function mapDbToShareLink(db: DbCalendarShareLink): CalendarShareLink {
  return {
    id: db.id,
    token: db.token,
    createdBy: db.created_by,
    config: db.config,
    isActive: db.is_active,
    expiresAt: db.expires_at,
    viewCount: db.view_count,
    lastViewedAt: db.last_viewed_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// CRUD
// ============================================

export async function createCalendarShareLink(
  config: CalendarShareConfig
): Promise<CalendarShareLink> {
  const { data: { user } } = await supabase.auth.getUser();
  const token = generateToken();

  const { data, error } = await supabase
    .from('calendar_share_links')
    .insert({
      token,
      created_by: user?.id ?? null,
      config,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating calendar share link: ${error.message}`);
  return mapDbToShareLink(data as DbCalendarShareLink);
}

export async function fetchCalendarShareLinkByToken(
  token: string
): Promise<CalendarShareLink | null> {
  const { data, error } = await supabase
    .from('calendar_share_links')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching calendar share link: ${error.message}`);
  }

  return mapDbToShareLink(data as DbCalendarShareLink);
}

export async function fetchCalendarShareLinks(): Promise<CalendarShareLink[]> {
  const { data, error } = await supabase
    .from('calendar_share_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching calendar share links: ${error.message}`);
  return (data as DbCalendarShareLink[]).map(mapDbToShareLink);
}

export async function updateCalendarShareLink(
  id: string,
  updates: { isActive?: boolean; expiresAt?: string | null; config?: CalendarShareConfig }
): Promise<CalendarShareLink> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
  if (updates.config !== undefined) dbUpdates.config = updates.config;

  const { data, error } = await supabase
    .from('calendar_share_links')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating calendar share link: ${error.message}`);
  return mapDbToShareLink(data as DbCalendarShareLink);
}

export async function deleteCalendarShareLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_share_links')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting calendar share link: ${error.message}`);
}

export async function regenerateCalendarShareLinkToken(id: string): Promise<CalendarShareLink> {
  const token = generateToken();

  const { data, error } = await supabase
    .from('calendar_share_links')
    .update({ token })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error regenerating token: ${error.message}`);
  return mapDbToShareLink(data as DbCalendarShareLink);
}

export async function recordCalendarShareLinkAccess(token: string): Promise<void> {
  // Increment view count — best effort, non-critical
  try {
    await supabase
      .from('calendar_share_links')
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq('token', token);
  } catch {
    // Ignore errors for access tracking
  }
}

export function getCalendarShareLinkUrl(token: string): string {
  return `${window.location.origin}/shared/calendar/${token}`;
}

export function isCalendarShareLinkValid(link: CalendarShareLink): boolean {
  if (!link.isActive) return false;
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return false;
  return true;
}
