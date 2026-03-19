/**
 * Daily Revenue by Channel Service
 *
 * Fetches daily revenue breakdown per channel for the calendar view.
 *
 * @module services/crp-portal/dailyRevenue
 */

import { supabase } from '@/services/supabase';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface DailyRevenueParams {
  companyIds: number[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  brandIds?: string[];
  addressIds?: string[];
}

export interface DailyChannelRevenue {
  glovo: number;
  ubereats: number;
  justeat: number;
  total: number;
  orders: number;
}

// ============================================
// FETCH FUNCTION
// ============================================

/**
 * Fetch daily revenue broken down by channel.
 * Returns a Map keyed by date string (YYYY-MM-DD).
 */
export async function fetchDailyRevenueByChannel(
  params: DailyRevenueParams
): Promise<Map<string, DailyChannelRevenue>> {
  const { data, error } = await supabase.rpc('get_daily_revenue_by_channel', {
    p_company_ids: params.companyIds,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_brand_ids: params.brandIds ?? null,
    p_address_ids: params.addressIds ?? null,
  });

  if (error) {
    throw new Error(`Error fetching daily revenue: ${error.message}`);
  }

  const result = new Map<string, DailyChannelRevenue>();

  for (const row of (data ?? [])) {
    const dateKey = row.date_key as string;
    const channel = row.channel as ChannelId;
    const revenue = Number(row.total_revenue) || 0;
    const orders = Number(row.total_orders) || 0;

    if (!result.has(dateKey)) {
      result.set(dateKey, { glovo: 0, ubereats: 0, justeat: 0, total: 0, orders: 0 });
    }

    const entry = result.get(dateKey)!;
    if (channel === 'glovo' || channel === 'ubereats' || channel === 'justeat') {
      entry[channel] += revenue;
    }
    entry.total += revenue;
    entry.orders += orders;
  }

  return result;
}
