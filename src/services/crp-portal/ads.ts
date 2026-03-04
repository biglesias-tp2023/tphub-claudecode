/**
 * CRP Portal Ads Service
 *
 * Provides daily timeseries data from crp_portal__ft_advertising_hp
 * for the Marketing dashboard chart.
 *
 * @module services/crp-portal/ads
 */

import { supabase } from '../supabase';
import type { ChannelId } from '@/types';
import { PORTAL_IDS } from './types';
import { handleCrpError } from './errors';
import { chunkedArray } from './utils';
import { withRpcLimit } from './rpcLimiter';

/** Max companies per RPC call to avoid PostgreSQL statement timeouts */
const RPC_BATCH_SIZE = 5;

// ============================================
// TYPES
// ============================================

export interface AdsTimeseriesParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  channelIds?: ChannelId[];
  startDate: string;
  endDate: string;
}

export interface AdsTimeseriesRow {
  day: string;
  impressions: number;
  clicks: number;
  orders: number;
  adSpent: number;
  adRevenue: number;
}

export interface AdsHourlyDistributionParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  channelIds?: ChannelId[];
  startDate: string;
  endDate: string;
}

export interface AdsHourlyDistributionRow {
  hourOfDay: number;
  adSpent: number;
  impressions: number;
  clicks: number;
  orders: number;
  adRevenue: number;
}

export interface AdsWeeklyHeatmapRow {
  dayOfWeek: number;  // 1=Mon, 7=Sun (ISODOW)
  hourOfDay: number;  // 0-23
  adSpent: number;
  impressions: number;
  clicks: number;
  orders: number;
  adRevenue: number;
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
 * Single-batch ads timeseries fetch.
 */
async function fetchAdsTimeseriesSingle(
  params: AdsTimeseriesParams
): Promise<AdsTimeseriesRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await withRpcLimit(() =>
    supabase.rpc('get_ads_daily_timeseries', {
      p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
      p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
      p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
      p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
      p_start_date: `${startDate}T00:00:00`,
      p_end_date: `${endDate}T23:59:59`,
    })
  );

  if (error) {
    handleCrpError('fetchAdsTimeseries', error);
  }

  return ((data || []) as Array<{
    day: string;
    impressions: number;
    clicks: number;
    orders: number;
    ad_spent: number;
    ad_revenue: number;
  }>).map((row) => ({
    day: row.day,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    orders: Number(row.orders) || 0,
    adSpent: Number(row.ad_spent) || 0,
    adRevenue: Number(row.ad_revenue) || 0,
  }));
}

/**
 * Fetches daily advertising timeseries using the get_ads_daily_timeseries RPC.
 * Batches by companyIds to avoid statement timeouts with many companies.
 */
export async function fetchAdsTimeseries(
  params: AdsTimeseriesParams
): Promise<AdsTimeseriesRow[]> {
  const { companyIds } = params;
  if (!companyIds || companyIds.length <= RPC_BATCH_SIZE) {
    return fetchAdsTimeseriesSingle(params);
  }

  const chunks = chunkedArray(companyIds, RPC_BATCH_SIZE);
  const batchResults: AdsTimeseriesRow[][] = [];
  for (const chunk of chunks) {
    batchResults.push(await fetchAdsTimeseriesSingle({ ...params, companyIds: chunk }));
  }

  // Merge by day: sum additive fields
  const byDay = new Map<string, AdsTimeseriesRow>();
  for (const rows of batchResults) {
    for (const row of rows) {
      const existing = byDay.get(row.day);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.orders += row.orders;
        existing.adSpent += row.adSpent;
        existing.adRevenue += row.adRevenue;
      } else {
        byDay.set(row.day, { ...row });
      }
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Single-batch ads hourly distribution fetch.
 */
async function fetchAdsHourlyDistributionSingle(
  params: AdsHourlyDistributionParams
): Promise<AdsHourlyDistributionRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await withRpcLimit(() =>
    supabase.rpc('get_ads_hourly_distribution', {
      p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
      p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
      p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
      p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
      p_start_date: `${startDate}T00:00:00`,
      p_end_date: `${endDate}T23:59:59`,
    })
  );

  if (error) {
    handleCrpError('fetchAdsHourlyDistribution', error);
  }

  return ((data || []) as Array<{
    hour_of_day: number;
    ad_spent: number;
    impressions: number;
    clicks: number;
    orders: number;
    ad_revenue: number;
  }>).map((row) => ({
    hourOfDay: Number(row.hour_of_day),
    adSpent: Number(row.ad_spent) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    orders: Number(row.orders) || 0,
    adRevenue: Number(row.ad_revenue) || 0,
  }));
}

/**
 * Fetches hourly ADS distribution using the get_ads_hourly_distribution RPC.
 * Batches by companyIds to avoid statement timeouts with many companies.
 */
export async function fetchAdsHourlyDistribution(
  params: AdsHourlyDistributionParams
): Promise<AdsHourlyDistributionRow[]> {
  const { companyIds } = params;
  if (!companyIds || companyIds.length <= RPC_BATCH_SIZE) {
    return fetchAdsHourlyDistributionSingle(params);
  }

  const chunks = chunkedArray(companyIds, RPC_BATCH_SIZE);
  const batchResults: AdsHourlyDistributionRow[][] = [];
  for (const chunk of chunks) {
    batchResults.push(await fetchAdsHourlyDistributionSingle({ ...params, companyIds: chunk }));
  }

  // Merge by hourOfDay: sum additive fields
  const byHour = new Map<number, AdsHourlyDistributionRow>();
  for (const rows of batchResults) {
    for (const row of rows) {
      const existing = byHour.get(row.hourOfDay);
      if (existing) {
        existing.adSpent += row.adSpent;
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.orders += row.orders;
        existing.adRevenue += row.adRevenue;
      } else {
        byHour.set(row.hourOfDay, { ...row });
      }
    }
  }
  return [...byHour.values()].sort((a, b) => a.hourOfDay - b.hourOfDay);
}

/**
 * Single-batch ads weekly heatmap fetch.
 */
async function fetchAdsWeeklyHeatmapSingle(
  params: AdsHourlyDistributionParams
): Promise<AdsWeeklyHeatmapRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await withRpcLimit(() =>
    supabase.rpc('get_ads_weekly_heatmap', {
      p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
      p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
      p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
      p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
      p_start_date: `${startDate}T00:00:00`,
      p_end_date: `${endDate}T23:59:59`,
    })
  );

  if (error) {
    handleCrpError('fetchAdsWeeklyHeatmap', error);
  }

  return ((data || []) as Array<{
    day_of_week: number;
    hour_of_day: number;
    ad_spent: number;
    impressions: number;
    clicks: number;
    orders: number;
    ad_revenue: number;
  }>).map((row) => ({
    dayOfWeek: Number(row.day_of_week),
    hourOfDay: Number(row.hour_of_day),
    adSpent: Number(row.ad_spent) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    orders: Number(row.orders) || 0,
    adRevenue: Number(row.ad_revenue) || 0,
  }));
}

/**
 * Fetches weekly ADS heatmap using the get_ads_weekly_heatmap RPC.
 * Batches by companyIds to avoid statement timeouts with many companies.
 */
export async function fetchAdsWeeklyHeatmap(
  params: AdsHourlyDistributionParams
): Promise<AdsWeeklyHeatmapRow[]> {
  const { companyIds } = params;
  if (!companyIds || companyIds.length <= RPC_BATCH_SIZE) {
    return fetchAdsWeeklyHeatmapSingle(params);
  }

  const chunks = chunkedArray(companyIds, RPC_BATCH_SIZE);
  const batchResults: AdsWeeklyHeatmapRow[][] = [];
  for (const chunk of chunks) {
    batchResults.push(await fetchAdsWeeklyHeatmapSingle({ ...params, companyIds: chunk }));
  }

  // Merge by (dayOfWeek, hourOfDay): sum additive fields
  const byKey = new Map<string, AdsWeeklyHeatmapRow>();
  for (const rows of batchResults) {
    for (const row of rows) {
      const key = `${row.dayOfWeek}-${row.hourOfDay}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.adSpent += row.adSpent;
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.orders += row.orders;
        existing.adRevenue += row.adRevenue;
      } else {
        byKey.set(key, { ...row });
      }
    }
  }
  return [...byKey.values()];
}
