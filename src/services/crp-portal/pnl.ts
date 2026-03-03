/**
 * CRP Portal P&L Service
 *
 * Fetches order data aggregated by configurable period (week/month/quarter)
 * with portal-level breakdown for the Finance P&L dashboard.
 *
 * @module services/crp-portal/pnl
 */

import { supabase } from '../supabase';
import type { ChannelId } from '@/types';
import { PORTAL_IDS } from './types';
import { handleCrpError } from './errors';
import { chunkedArray } from './utils';

/** Max companies per RPC call to avoid PostgreSQL statement timeouts */
const RPC_BATCH_SIZE = 10;

// ============================================
// TYPES
// ============================================

export type PnLGranularity = 'week' | 'month' | 'quarter';

export interface PnLPeriodsParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  channelIds?: ChannelId[];
  startDate: string;
  endDate: string;
  granularity: PnLGranularity;
}

export interface PnLPeriodRow {
  periodStart: string;
  portalId: string;
  revenue: number;
  promos: number;
  refunds: number;
  orderCount: number;
}

// ============================================
// HELPERS
// ============================================

const CHANNELS_WITH_DATA: ChannelId[] = ['glovo', 'ubereats'];

function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO, PORTAL_IDS.GLOVO_NEW];
    case 'ubereats':
      return [PORTAL_IDS.UBEREATS];
    case 'justeat':
      return [];
    default:
      return [];
  }
}

function shouldApplyChannelFilter(channelIds: ChannelId[]): boolean {
  return !CHANNELS_WITH_DATA.every((ch) => channelIds.includes(ch));
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Single-batch P&L periods fetch.
 */
async function fetchPnLPeriodsSingle(
  params: PnLPeriodsParams
): Promise<PnLPeriodRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate, granularity } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_pnl_periods', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
    p_granularity: granularity,
  });

  if (error) {
    handleCrpError('fetchPnLPeriods', error);
  }

  // Apply client-side portal filter if needed
  const rows = ((data || []) as Array<{
    period_start: string;
    portal_id: string;
    revenue: number;
    promos: number;
    refunds: number;
    order_count: number;
  }>).map((row) => ({
    periodStart: row.period_start,
    portalId: String(row.portal_id),
    revenue: Number(row.revenue) || 0,
    promos: Number(row.promos) || 0,
    refunds: Number(row.refunds) || 0,
    orderCount: Number(row.order_count) || 0,
  }));

  if (portalIdsToFilter && portalIdsToFilter.length > 0) {
    return rows.filter((r) => portalIdsToFilter!.includes(r.portalId));
  }

  return rows;
}

/**
 * Fetches P&L period data using the get_pnl_periods RPC.
 * Batches by companyIds to avoid statement timeouts with many companies.
 */
export async function fetchPnLPeriods(
  params: PnLPeriodsParams
): Promise<PnLPeriodRow[]> {
  const { companyIds } = params;
  if (!companyIds || companyIds.length <= RPC_BATCH_SIZE) {
    return fetchPnLPeriodsSingle(params);
  }

  const chunks = chunkedArray(companyIds, RPC_BATCH_SIZE);
  const batchResults: PnLPeriodRow[][] = [];
  for (const chunk of chunks) {
    batchResults.push(await fetchPnLPeriodsSingle({ ...params, companyIds: chunk }));
  }

  // Merge by (periodStart, portalId): sum additive fields
  const byKey = new Map<string, PnLPeriodRow>();
  for (const rows of batchResults) {
    for (const row of rows) {
      const key = `${row.periodStart}|${row.portalId}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.revenue += row.revenue;
        existing.promos += row.promos;
        existing.refunds += row.refunds;
        existing.orderCount += row.orderCount;
      } else {
        byKey.set(key, { ...row });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}
