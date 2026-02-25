/**
 * Alert Preferences Service
 *
 * CRUD operations for per-company alert configurations.
 * Consultants can enable/disable alert categories, set custom thresholds,
 * and choose notification channels (Slack/Email) for each company.
 *
 * If no preference exists for a consultant+company pair, defaults apply:
 * all categories ON, Slack ON, Email OFF, global thresholds.
 *
 * @module services/alertPreferences
 */

import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface AlertPreference {
  id: string;
  consultantId: string;
  companyId: string;
  ordersEnabled: boolean;
  reviewsEnabled: boolean;
  adsEnabled: boolean;
  promosEnabled: boolean;
  slackEnabled: boolean;
  emailEnabled: boolean;
  ordersThreshold: number | null;
  reviewsThreshold: number | null;
  adsRoasThreshold: number | null;
  promosThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbAlertPreference {
  id: string;
  consultant_id: string;
  company_id: string;
  orders_enabled: boolean;
  reviews_enabled: boolean;
  ads_enabled: boolean;
  promos_enabled: boolean;
  slack_enabled: boolean;
  email_enabled: boolean;
  orders_threshold: number | null;
  reviews_threshold: number | null;
  ads_roas_threshold: number | null;
  promos_threshold: number | null;
  created_at: string;
  updated_at: string;
}

export interface AlertPreferenceInput {
  consultantId: string;
  companyId: string;
  ordersEnabled?: boolean;
  reviewsEnabled?: boolean;
  adsEnabled?: boolean;
  promosEnabled?: boolean;
  slackEnabled?: boolean;
  emailEnabled?: boolean;
  ordersThreshold?: number | null;
  reviewsThreshold?: number | null;
  adsRoasThreshold?: number | null;
  promosThreshold?: number | null;
}

// ============================================
// DEFAULTS
// ============================================

export const ALERT_DEFAULTS = {
  ordersEnabled: true,
  reviewsEnabled: true,
  adsEnabled: true,
  promosEnabled: true,
  slackEnabled: true,
  emailEnabled: false,
  ordersThreshold: -20,
  reviewsThreshold: 3.5,
  adsRoasThreshold: 3.0,
  promosThreshold: 15,
} as const;

// ============================================
// MAPPER
// ============================================

function mapDbAlertPreference(db: DbAlertPreference): AlertPreference {
  return {
    id: db.id,
    consultantId: db.consultant_id,
    companyId: db.company_id,
    ordersEnabled: db.orders_enabled,
    reviewsEnabled: db.reviews_enabled,
    adsEnabled: db.ads_enabled,
    promosEnabled: db.promos_enabled,
    slackEnabled: db.slack_enabled,
    emailEnabled: db.email_enabled,
    ordersThreshold: db.orders_threshold,
    reviewsThreshold: db.reviews_threshold,
    adsRoasThreshold: db.ads_roas_threshold,
    promosThreshold: db.promos_threshold,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// FETCH
// ============================================

/**
 * Fetch all alert preferences for a consultant
 */
export async function fetchAlertPreferences(
  consultantId: string
): Promise<AlertPreference[]> {
  const { data, error } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error fetching alert preferences: ${error.message}`);
  return (data as DbAlertPreference[]).map(mapDbAlertPreference);
}

/**
 * Fetch alert preferences for a specific company (admin view)
 */
export async function fetchAlertPreferencesByCompany(
  companyId: string
): Promise<AlertPreference[]> {
  const { data, error } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error fetching alert preferences by company: ${error.message}`);
  return (data as DbAlertPreference[]).map(mapDbAlertPreference);
}

// ============================================
// UPSERT
// ============================================

/**
 * Create or update an alert preference (upsert on consultant_id + company_id)
 */
export async function upsertAlertPreference(
  input: AlertPreferenceInput
): Promise<AlertPreference> {
  const dbInput = {
    consultant_id: input.consultantId,
    company_id: input.companyId,
    orders_enabled: input.ordersEnabled ?? true,
    reviews_enabled: input.reviewsEnabled ?? true,
    ads_enabled: input.adsEnabled ?? true,
    promos_enabled: input.promosEnabled ?? true,
    slack_enabled: input.slackEnabled ?? true,
    email_enabled: input.emailEnabled ?? false,
    orders_threshold: input.ordersThreshold ?? null,
    reviews_threshold: input.reviewsThreshold ?? null,
    ads_roas_threshold: input.adsRoasThreshold ?? null,
    promos_threshold: input.promosThreshold ?? null,
  };

  const { data, error } = await supabase
    .from('alert_preferences')
    .upsert(dbInput, { onConflict: 'consultant_id,company_id' })
    .select()
    .single();

  if (error) throw new Error(`Error upserting alert preference: ${error.message}`);
  return mapDbAlertPreference(data as DbAlertPreference);
}

/**
 * Batch upsert alert preferences
 */
export async function bulkUpsertAlertPreferences(
  inputs: AlertPreferenceInput[]
): Promise<AlertPreference[]> {
  const dbInputs = inputs.map((input) => ({
    consultant_id: input.consultantId,
    company_id: input.companyId,
    orders_enabled: input.ordersEnabled ?? true,
    reviews_enabled: input.reviewsEnabled ?? true,
    ads_enabled: input.adsEnabled ?? true,
    promos_enabled: input.promosEnabled ?? true,
    slack_enabled: input.slackEnabled ?? true,
    email_enabled: input.emailEnabled ?? false,
    orders_threshold: input.ordersThreshold ?? null,
    reviews_threshold: input.reviewsThreshold ?? null,
    ads_roas_threshold: input.adsRoasThreshold ?? null,
    promos_threshold: input.promosThreshold ?? null,
  }));

  const { data, error } = await supabase
    .from('alert_preferences')
    .upsert(dbInputs, { onConflict: 'consultant_id,company_id' })
    .select();

  if (error) throw new Error(`Error bulk upserting alert preferences: ${error.message}`);
  return (data as DbAlertPreference[]).map(mapDbAlertPreference);
}

// ============================================
// DELETE
// ============================================

/**
 * Delete an alert preference (revert to defaults)
 */
export async function deleteAlertPreference(id: string): Promise<void> {
  const { error } = await supabase
    .from('alert_preferences')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting alert preference: ${error.message}`);
}
