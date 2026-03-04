/**
 * CRP Portal P&L Service
 *
 * Fetches order data aggregated by configurable period (week/month/quarter)
 * with portal-level breakdown for the Finance P&L dashboard.
 *
 * Date ranges are batched into 1-month chunks to avoid PostgreSQL statement
 * timeouts, following the same pattern as useActualRevenueByMonth.
 *
 * @module services/crp-portal/pnl
 */

import { supabase } from '../supabase';
import { handleCrpError } from './errors';

// ============================================
// TYPES
// ============================================

export type PnLGranularity = 'week' | 'month' | 'quarter';

export interface PnLPeriodsParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  startDate: string;
  endDate: string;
  granularity: PnLGranularity;
}

export interface PnLPeriodRow {
  periodStart: string;
  /** Channel name returned by RPC: 'glovo' | 'ubereats' | 'other' */
  channel: string;
  revenue: number;
  promos: number;
  refunds: number;
  orderCount: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Split a date range into 1-month chunks to avoid statement timeouts.
 * Returns array of { start, end } date strings (YYYY-MM-DD).
 */
function splitIntoMonthChunks(startDate: string, endDate: string): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  const end = new Date(`${endDate}T23:59:59`);

  let cursor = new Date(`${startDate}T00:00:00`);

  while (cursor <= end) {
    const chunkStart = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

    // End of this chunk = last day of the month or endDate (whichever is earlier)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // last day of month
    const chunkEnd = monthEnd < end
      ? `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
      : endDate;

    chunks.push({ start: chunkStart, end: chunkEnd });

    // Move cursor to first day of next month
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return chunks;
}

/**
 * Merge rows by (periodStart, channel), summing additive fields.
 */
function mergeRows(allRows: PnLPeriodRow[]): PnLPeriodRow[] {
  const byKey = new Map<string, PnLPeriodRow>();
  for (const row of allRows) {
    const key = `${row.periodStart}|${row.channel}`;
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
  return [...byKey.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Single RPC call for a specific date range + company set.
 */
async function fetchPnLPeriodsSingle(
  params: Omit<PnLPeriodsParams, 'channelIds'>
): Promise<PnLPeriodRow[]> {
  const { companyIds, brandIds, addressIds, startDate, endDate, granularity } = params;

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

  // Map RPC results — portal_id contains channel names ('glovo', 'ubereats', 'other')
  return ((data || []) as Array<{
    period_start: string;
    portal_id: string;
    revenue: number;
    promos: number;
    refunds: number;
    order_count: number;
  }>).map((row) => ({
    periodStart: row.period_start,
    channel: String(row.portal_id),
    revenue: Number(row.revenue) || 0,
    promos: Number(row.promos) || 0,
    refunds: Number(row.refunds) || 0,
    orderCount: Number(row.order_count) || 0,
  }));
}

/**
 * Fetches P&L period data using the get_pnl_periods RPC.
 *
 * Batches by 1-month date chunks to avoid statement timeouts on large
 * datasets. Results are merged by (periodStart, channel) so weekly/quarterly
 * periods that span chunk boundaries are correctly aggregated.
 */
export async function fetchPnLPeriods(
  params: PnLPeriodsParams
): Promise<PnLPeriodRow[]> {
  const { startDate, endDate } = params;

  // Split into 1-month chunks
  const dateChunks = splitIntoMonthChunks(startDate, endDate);

  const allRows: PnLPeriodRow[] = [];

  // Sequential calls to avoid overwhelming the DB
  for (const chunk of dateChunks) {
    const chunkRows = await fetchPnLPeriodsSingle({
      ...params,
      startDate: chunk.start,
      endDate: chunk.end,
    });
    allRows.push(...chunkRows);
  }

  // Merge rows from different chunks (important for week/quarter that span months)
  return mergeRows(allRows);
}
