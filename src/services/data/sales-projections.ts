/**
 * Sales Projections data operations
 *
 * Follows the same pattern as strategic-objectives.ts
 */

import { supabase, handleQueryError, isDevMode } from './shared';
import type {
  SalesProjectionData,
  SalesProjectionInput,
  DbSalesProjection,
  SalesProjectionConfig,
  ChannelMonthEntry,
  GridChannelMonthData,
} from '@/types';

// ============================================
// LOCAL STORAGE (dev mode fallback)
// ============================================

const LOCAL_STORAGE_KEY = 'tphub_sales_projections';

function getLocalProjections(): SalesProjectionData[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalProjections(projections: SalesProjectionData[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projections));
}

// ============================================
// HELPERS
// ============================================

function parseJsonb<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value as T;
}

// ============================================
// MAPPER
// ============================================

export function mapDbSalesProjection(db: DbSalesProjection): SalesProjectionData {
  return {
    id: db.id,
    companyId: db.company_id,
    brandId: db.brand_id,
    addressId: db.address_id,
    config: parseJsonb<SalesProjectionConfig>(db.config, {
      activeChannels: [],
      investmentMode: 'global',
      maxAdsPercent: 0,
      maxPromosPercent: 0,
      startDate: '',
      endDate: '',
    }),
    baselineRevenue: parseJsonb<ChannelMonthEntry>(db.baseline_revenue, { glovo: 0, ubereats: 0, justeat: 0 }),
    targetRevenue: parseJsonb<GridChannelMonthData>(db.target_revenue, {}),
    targetAds: parseJsonb<GridChannelMonthData>(db.target_ads, {}),
    targetPromos: parseJsonb<GridChannelMonthData>(db.target_promos, {}),
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================
// FETCH
// ============================================

interface FetchSalesProjectionParams {
  companyId: string;
  brandId?: string | null;
  addressId?: string | null;
}

/**
 * Fetch a single sales projection by scope.
 * Returns null if none exists for that scope.
 */
export async function fetchSalesProjection(
  params: FetchSalesProjectionParams
): Promise<SalesProjectionData | null> {
  const { companyId, brandId, addressId } = params;

  // Dev mode: local storage
  if (isDevMode) {
    const all = getLocalProjections();
    return all.find(
      (p) =>
        p.companyId === companyId &&
        (p.brandId ?? null) === (brandId ?? null) &&
        (p.addressId ?? null) === (addressId ?? null)
    ) ?? null;
  }

  let query = supabase
    .from('sales_projections')
    .select('*')
    .eq('company_id', companyId);

  if (brandId) {
    query = query.eq('brand_id', brandId);
  } else {
    query = query.is('brand_id', null);
  }

  if (addressId) {
    query = query.eq('address_id', addressId);
  } else {
    query = query.is('address_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) handleQueryError(error, 'No se pudo cargar la proyección de ventas');
  if (!data) return null;

  return mapDbSalesProjection(data as DbSalesProjection);
}

// ============================================
// UPSERT
// ============================================

/**
 * Create or update a sales projection for a given scope.
 * If one already exists, it updates it; otherwise inserts a new one.
 */
export async function upsertSalesProjection(
  input: SalesProjectionInput
): Promise<SalesProjectionData> {
  const { companyId, brandId, addressId, config, baselineRevenue, targetRevenue, targetAds, targetPromos } = input;

  // Dev mode: local storage
  if (isDevMode) {
    const all = getLocalProjections();
    const existingIdx = all.findIndex(
      (p) =>
        p.companyId === companyId &&
        (p.brandId ?? null) === (brandId ?? null) &&
        (p.addressId ?? null) === (addressId ?? null)
    );

    const now = new Date().toISOString();
    const projection: SalesProjectionData = {
      id: existingIdx >= 0 ? all[existingIdx].id : crypto.randomUUID(),
      companyId,
      brandId: brandId ?? null,
      addressId: addressId ?? null,
      config,
      baselineRevenue,
      targetRevenue,
      targetAds: targetAds ?? {},
      targetPromos: targetPromos ?? {},
      createdBy: existingIdx >= 0 ? all[existingIdx].createdBy : 'dev-user-001',
      updatedBy: 'dev-user-001',
      createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      all[existingIdx] = projection;
    } else {
      all.push(projection);
    }
    saveLocalProjections(all);
    return projection;
  }

  // Check if one already exists
  const existing = await fetchSalesProjection({ companyId, brandId, addressId });

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('sales_projections')
      .update({
        config: JSON.stringify(config),
        baseline_revenue: JSON.stringify(baselineRevenue),
        target_revenue: JSON.stringify(targetRevenue),
        target_ads: JSON.stringify(targetAds ?? {}),
        target_promos: JSON.stringify(targetPromos ?? {}),
        updated_by: userId,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) handleQueryError(error, 'Error al actualizar la proyección de ventas');
    return mapDbSalesProjection(data as DbSalesProjection);
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('sales_projections')
      .insert({
        company_id: companyId,
        brand_id: brandId ?? null,
        address_id: addressId ?? null,
        config: JSON.stringify(config),
        baseline_revenue: JSON.stringify(baselineRevenue),
        target_revenue: JSON.stringify(targetRevenue),
        target_ads: JSON.stringify(targetAds ?? {}),
        target_promos: JSON.stringify(targetPromos ?? {}),
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) handleQueryError(error, 'Error al crear la proyección de ventas');
    return mapDbSalesProjection(data as DbSalesProjection);
  }
}

// ============================================
// UPDATE (partial — for target changes)
// ============================================

interface SalesProjectionTargetUpdates {
  targetRevenue?: GridChannelMonthData;
  targetAds?: GridChannelMonthData;
  targetPromos?: GridChannelMonthData;
}

/**
 * Partial update for targets only (used when editing the grid).
 */
export async function updateSalesProjectionTargets(
  id: string,
  updates: SalesProjectionTargetUpdates
): Promise<SalesProjectionData> {
  // Dev mode: local storage
  if (isDevMode) {
    const all = getLocalProjections();
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Projection not found: ${id}`);

    const now = new Date().toISOString();
    if (updates.targetRevenue !== undefined) all[idx].targetRevenue = updates.targetRevenue;
    if (updates.targetAds !== undefined) all[idx].targetAds = updates.targetAds;
    if (updates.targetPromos !== undefined) all[idx].targetPromos = updates.targetPromos;
    all[idx].updatedAt = now;
    all[idx].updatedBy = 'dev-user-001';

    saveLocalProjections(all);
    return all[idx];
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };
  if (updates.targetRevenue !== undefined) dbUpdates.target_revenue = JSON.stringify(updates.targetRevenue);
  if (updates.targetAds !== undefined) dbUpdates.target_ads = JSON.stringify(updates.targetAds);
  if (updates.targetPromos !== undefined) dbUpdates.target_promos = JSON.stringify(updates.targetPromos);

  const { data, error } = await supabase
    .from('sales_projections')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al actualizar los objetivos');
  return mapDbSalesProjection(data as DbSalesProjection);
}

// ============================================
// DELETE
// ============================================

/**
 * Delete a sales projection by ID.
 */
export async function deleteSalesProjection(id: string): Promise<void> {
  // Dev mode: local storage
  if (isDevMode) {
    const all = getLocalProjections();
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Projection not found: ${id}`);
    all.splice(idx, 1);
    saveLocalProjections(all);
    return;
  }

  const { error } = await supabase
    .from('sales_projections')
    .delete()
    .eq('id', id);

  if (error) handleQueryError(error, 'Error al eliminar la proyección de ventas');
}
