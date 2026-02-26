/**
 * CRP Portal Reviews Service
 *
 * Provides data access for review data from the crp_portal__ft_review table.
 * Used by the Reputation dashboard to display real review/rating data.
 *
 * ## SOLID Principles Applied
 *
 * - **Single Responsibility**: This module only handles review data operations
 * - **Open/Closed**: New channel mappings can be added without modifying existing code
 * - **Dependency Inversion**: Depends on types/interfaces, not concrete implementations
 *
 * @module services/crp-portal/reviews
 */

import { supabase } from '../supabase';
import { PORTAL_IDS } from './types';
import type { ChannelId } from '@/types';
import { handleCrpError } from './errors';

// ============================================
// TYPES
// ============================================

export interface FetchReviewsParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  channelIds?: ChannelId[];
  startDate: string;
  endDate: string;
}

export interface ChannelReviewAggregation {
  channel: ChannelId;
  totalReviews: number;
  avgRating: number;
  positiveReviews: number;
  negativeReviews: number;
  positivePercent: number;
  negativePercent: number;
  avgDeliveryTime?: number;
  ratingDistribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
}

export interface ReviewsAggregation {
  totalReviews: number;
  avgRating: number;
  totalPositive: number;
  totalNegative: number;
  positivePercent: number;
  negativePercent: number;
  avgDeliveryTime?: number;
  ratingDistribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
  byChannel: {
    glovo: ChannelReviewAggregation | null;
    ubereats: ChannelReviewAggregation | null;
    justeat: ChannelReviewAggregation | null;
  };
}

export interface ReviewsHeatmapCell {
  dayOfWeek: number;
  hourOfDay: number;
  count: number;
}

export interface RawReview {
  pk_id_review: string;
  fk_id_order: string;
  pfk_id_company: string;
  pfk_id_store: string;
  pfk_id_store_address: string;
  pfk_id_portal: string;
  ts_creation_time: string;
  val_rating: number;
  txt_comment: string | null;
  delivery_time_minutes: number | null;
  amt_refunds: number | null;
  amt_total_price: number | null;
}

export interface ReviewsChanges {
  totalReviewsChange: number;
  avgRatingChange: number;
  positiveChange: number;
  negativeChange: number;
}

// ============================================
// HELPERS
// ============================================

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

const CHANNELS_WITH_DATA: ChannelId[] = ['glovo', 'ubereats'];

function shouldApplyChannelFilter(channelIds: ChannelId[]): boolean {
  const hasAllChannelsWithData = CHANNELS_WITH_DATA.every((ch) => channelIds.includes(ch));
  return !hasAllChannelsWithData;
}

function createEmptyChannelAggregation(channel: ChannelId): ChannelReviewAggregation {
  return {
    channel,
    totalReviews: 0,
    avgRating: 0,
    positiveReviews: 0,
    negativeReviews: 0,
    positivePercent: 0,
    negativePercent: 0,
    ratingDistribution: { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 },
  };
}

export function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO || portalId === PORTAL_IDS.GLOVO_NEW) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  return null;
}

// ============================================
// RPC RESPONSE TYPES
// ============================================

interface ReviewsAggregationRPCRow {
  channel: string;
  total_reviews: number;
  avg_rating: number;
  positive_reviews: number;
  negative_reviews: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
  avg_delivery_time_minutes: number | null;
}

interface ReviewsHeatmapRPCRow {
  day_of_week: number;
  hour_of_day: number;
  review_count: number;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Fetches aggregated review metrics using the RPC function.
 */
export async function fetchCrpReviewsAggregated(
  params: FetchReviewsParams
): Promise<ReviewsAggregation> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_reviews_aggregation', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    handleCrpError('fetchCrpReviewsAggregated', error);
  }

  const rows = (data || []) as ReviewsAggregationRPCRow[];

  const result: ReviewsAggregation = {
    totalReviews: 0,
    avgRating: 0,
    totalPositive: 0,
    totalNegative: 0,
    positivePercent: 0,
    negativePercent: 0,
    ratingDistribution: { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 },
    byChannel: {
      glovo: null,
      ubereats: null,
      justeat: null,
    },
  };

  let totalWeightedRating = 0;
  let totalDeliveryTimeSum = 0;
  let totalDeliveryTimeCount = 0;

  for (const row of rows) {
    const total = Number(row.total_reviews) || 0;
    const avg = Number(row.avg_rating) || 0;
    const positive = Number(row.positive_reviews) || 0;
    const negative = Number(row.negative_reviews) || 0;
    const r1 = Number(row.rating_1) || 0;
    const r2 = Number(row.rating_2) || 0;
    const r3 = Number(row.rating_3) || 0;
    const r4 = Number(row.rating_4) || 0;
    const r5 = Number(row.rating_5) || 0;
    const avgDelivery = row.avg_delivery_time_minutes != null ? Number(row.avg_delivery_time_minutes) : null;

    result.totalReviews += total;
    result.totalPositive += positive;
    result.totalNegative += negative;
    result.ratingDistribution.rating1 += r1;
    result.ratingDistribution.rating2 += r2;
    result.ratingDistribution.rating3 += r3;
    result.ratingDistribution.rating4 += r4;
    result.ratingDistribution.rating5 += r5;
    totalWeightedRating += avg * total;

    if (avgDelivery != null && avgDelivery > 0) {
      totalDeliveryTimeSum += avgDelivery * total;
      totalDeliveryTimeCount += total;
    }

    const channelKey = row.channel as ChannelId;
    if (channelKey === 'glovo' || channelKey === 'ubereats') {
      const channelAgg = createEmptyChannelAggregation(channelKey);
      channelAgg.totalReviews = total;
      channelAgg.avgRating = avg;
      channelAgg.positiveReviews = positive;
      channelAgg.negativeReviews = negative;
      channelAgg.positivePercent = total > 0 ? (positive / total) * 100 : 0;
      channelAgg.negativePercent = total > 0 ? (negative / total) * 100 : 0;
      channelAgg.ratingDistribution = { rating1: r1, rating2: r2, rating3: r3, rating4: r4, rating5: r5 };
      if (avgDelivery != null && avgDelivery > 0) {
        channelAgg.avgDeliveryTime = Math.round(avgDelivery * 10) / 10;
      }
      result.byChannel[channelKey] = channelAgg;
    }
  }

  // Calculate global derived metrics
  result.avgRating = result.totalReviews > 0 ? totalWeightedRating / result.totalReviews : 0;
  result.positivePercent = result.totalReviews > 0 ? (result.totalPositive / result.totalReviews) * 100 : 0;
  result.negativePercent = result.totalReviews > 0 ? (result.totalNegative / result.totalReviews) * 100 : 0;
  if (totalDeliveryTimeCount > 0) {
    result.avgDeliveryTime = Math.round((totalDeliveryTimeSum / totalDeliveryTimeCount) * 10) / 10;
  }

  return result;
}

/**
 * Fetches heatmap data for negative reviews (rating <= 2).
 */
export async function fetchCrpReviewsHeatmap(
  params: FetchReviewsParams
): Promise<ReviewsHeatmapCell[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_reviews_heatmap', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
  });

  if (error) {
    handleCrpError('fetchCrpReviewsHeatmap', error);
  }

  const rows = (data || []) as ReviewsHeatmapRPCRow[];

  return rows.map((row) => ({
    dayOfWeek: Number(row.day_of_week),
    hourOfDay: Number(row.hour_of_day),
    count: Number(row.review_count),
  }));
}

/**
 * Fetches aggregated review data for two periods and calculates changes.
 */
export async function fetchCrpReviewsComparison(
  currentParams: FetchReviewsParams,
  previousParams: FetchReviewsParams
): Promise<{
  current: ReviewsAggregation;
  previous: ReviewsAggregation;
  changes: ReviewsChanges;
}> {
  const [current, previous] = await Promise.all([
    fetchCrpReviewsAggregated(currentParams),
    fetchCrpReviewsAggregated(previousParams),
  ]);

  const calcChange = (curr: number, prev: number): number =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return {
    current,
    previous,
    changes: {
      totalReviewsChange: calcChange(current.totalReviews, previous.totalReviews),
      avgRatingChange: calcChange(current.avgRating, previous.avgRating),
      positiveChange: calcChange(current.totalPositive, previous.totalPositive),
      negativeChange: calcChange(current.totalNegative, previous.totalNegative),
    },
  };
}

// ============================================
// REVIEW TAGS
// ============================================

/**
 * Normalizes tag labels from different platforms:
 * - Glovo: SCREAMING_SNAKE_CASE → "Missing or mistaken items"
 * - UberEats: Already Title Case → passes through
 */
function normalizeTagLabel(tag: string): string {
  if (tag === tag.toUpperCase() && tag.includes('_')) {
    // SCREAMING_SNAKE_CASE → sentence case
    return tag
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  return tag;
}

/**
 * Fetches review tags from crp_portal_ftreview_tag for a batch of review IDs.
 * Returns a Map of reviewId → normalized tag labels.
 */
export async function fetchReviewTags(
  reviewIds: string[]
): Promise<Map<string, string[]>> {
  const tagMap = new Map<string, string[]>();
  if (reviewIds.length === 0) return tagMap;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < reviewIds.length; i += CHUNK_SIZE) {
    const chunk = reviewIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('crp_portal__ft_review_tag')
      .select('pk_id_review, pk_des_tag')
      .in('pk_id_review', chunk);

    if (error) {
      handleCrpError('fetchReviewTags', error);
    }

    for (const row of data || []) {
      const reviewId = row.pk_id_review as string;
      const tag = normalizeTagLabel(row.pk_des_tag as string);
      const existing = tagMap.get(reviewId);
      if (existing) {
        existing.push(tag);
      } else {
        tagMap.set(reviewId, [tag]);
      }
    }
  }

  return tagMap;
}

export async function fetchCrpReviewsRaw(
  params: FetchReviewsParams,
  limit = 200
): Promise<RawReview[]> {
  const { companyIds, brandIds, addressIds, channelIds, startDate, endDate } = params;

  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0 && shouldApplyChannelFilter(channelIds)) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  const { data, error } = await supabase.rpc('get_reviews_raw', {
    p_company_ids: companyIds && companyIds.length > 0 ? companyIds : null,
    p_brand_ids: brandIds && brandIds.length > 0 ? brandIds : null,
    p_address_ids: addressIds && addressIds.length > 0 ? addressIds : null,
    p_channel_portal_ids: portalIdsToFilter && portalIdsToFilter.length > 0 ? portalIdsToFilter : null,
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`,
    p_limit: limit,
  });

  if (error) {
    handleCrpError('fetchCrpReviewsRaw', error);
  }

  return (data || []) as RawReview[];
}
