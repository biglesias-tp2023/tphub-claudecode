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
 * Fetches daily advertising timeseries using the get_ads_daily_timeseries RPC.
 *
 * Returns an array of daily rows with impressions, clicks, orders, ad spend, and ad revenue.
 */
export async function fetchAdsTimeseries(
  params: AdsTimeseriesParams
): Promise<AdsTimeseriesRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_ads_daily_timeseries', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    console.error('Error fetching ads timeseries:', error);
    throw error;
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
 * Fetches hourly ADS distribution using the get_ads_hourly_distribution RPC.
 *
 * Returns 24 rows (hours 0-23) with aggregated ad spend, impressions, clicks, orders, and revenue.
 */
export async function fetchAdsHourlyDistribution(
  params: AdsHourlyDistributionParams
): Promise<AdsHourlyDistributionRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_ads_hourly_distribution', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    console.error('Error fetching ads hourly distribution:', error);
    throw error;
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
 * Fetches weekly ADS heatmap using the get_ads_weekly_heatmap RPC.
 *
 * Returns rows grouped by (day_of_week, hour_of_day) with aggregated metrics.
 */
export async function fetchAdsWeeklyHeatmap(
  params: AdsHourlyDistributionParams
): Promise<AdsWeeklyHeatmapRow[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_ads_weekly_heatmap', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    console.error('Error fetching ads weekly heatmap:', error);
    throw error;
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
