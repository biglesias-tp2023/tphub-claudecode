/**
 * useReputationData Hook
 *
 * Orchestrates real review data from CRP Portal for the Reputation dashboard.
 * Reads filters from Zustand stores, expands multi-portal IDs, and transforms
 * service-level data into component-ready types.
 *
 * @module features/reputation/hooks/useReputationData
 */

import { useMemo } from 'react';
import { useCompanyIds, useBrandIds, useChannelIds, useDateFilters, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from '@/features/controlling/hooks/idExpansion';
import { useReviewsAggregation, useReviewsHeatmap, useReviewsRaw, useOrderRefunds, useReviewTags, useRefundsSummary } from './useReviewsData';
import { portalIdToChannelId } from '@/services/crp-portal/reviews';
import type { ChannelId } from '@/types';
import type { ChannelReviewAggregation } from '@/services/crp-portal';

// ============================================
// TYPES
// ============================================

export interface ChannelRating {
  channel: ChannelId;
  name: string;
  color: string;
  rating: number; // percentage (0-100) for Glovo, star rating (1-5) for others
  ratingType: 'percent' | 'stars';
  totalReviews: number;
  positivePercent: number;
  negativePercent: number;
}

export interface ReputationSummary {
  totalReviews: number;
  totalReviewsChange: number;
  negativeReviews: number;
  negativeReviewsChange: number;
  totalRefunds: number;
  totalRefundsChange: number;
  refundRate: number;
  avgDeliveryTime?: number;
}

export interface HeatmapCell {
  day: number; // 0-6 (Lun-Dom)
  hour: number; // 10-23
  count: number;
}

export interface RatingDistributionItem {
  rating: number; // 1-5
  label: string;
  count: number;
  color: string;
}

export interface Review {
  id: string;
  orderId: string;
  channel: ChannelId;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  rating: number; // 1-5
  comment?: string | null;
  tags?: string[] | null;
  deliveryTime?: number | null; // minutes
  refundAmount?: number | null; // EUR from ft_order_head.amt_refunds
  orderAmount?: number | null; // EUR from ft_order_head.amt_total_price
}

export interface ReputationData {
  channelRatings: ChannelRating[];
  summary: ReputationSummary;
  heatmap: HeatmapCell[];
  ratingDistribution: RatingDistributionItem[];
  reviews: Review[];
  totalReviewsInPeriod: number;
}

// ============================================
// CONSTANTS
// ============================================

const CHANNEL_CONFIG: Record<ChannelId, { name: string; color: string }> = {
  glovo: { name: 'Glovo', color: '#FFC244' },
  ubereats: { name: 'Uber Eats', color: '#06C167' },
  justeat: { name: 'Just Eat', color: '#FF8000' },
};

const RATING_COLORS: Record<number, string> = {
  1: '#EF4444', // red-500
  2: '#FB923C', // orange-400
  3: '#FACC15', // yellow-400
  4: '#86EFAC', // green-300
  5: '#22C55E', // green-500
};

const RATING_LABELS: Record<number, string> = {
  1: '1 estrella',
  2: '2 estrellas',
  3: '3 estrellas',
  4: '4 estrellas',
  5: '5 estrellas',
};

// ============================================
// HELPERS
// ============================================

function buildChannelRating(
  channel: ChannelId,
  agg: ChannelReviewAggregation | null
): ChannelRating | null {
  if (!agg || agg.totalReviews === 0) return null;

  const config = CHANNEL_CONFIG[channel];

  if (channel === 'glovo') {
    // Glovo uses thumbs up/down → show as percentage of positive (rating >= 4)
    const positivePercent = agg.totalReviews > 0
      ? Math.round((agg.positiveReviews / agg.totalReviews) * 100)
      : 0;
    return {
      channel,
      name: config.name,
      color: config.color,
      rating: positivePercent,
      totalReviews: agg.totalReviews,
      positivePercent,
      negativePercent: 100 - positivePercent,
      ratingType: 'percent',
    };
  }

  // UberEats and others use star rating
  return {
    channel,
    name: config.name,
    color: config.color,
    rating: Math.round(agg.avgRating * 10) / 10,
    totalReviews: agg.totalReviews,
    positivePercent: Math.round(agg.positivePercent),
    negativePercent: Math.round(agg.negativePercent),
    ratingType: 'stars',
  };
}

// ============================================
// HOOK
// ============================================

export function useReputationData() {
  const companyIds = useCompanyIds();
  const brandIds = useBrandIds();
  const channelIds = useChannelIds();
  const { dateRange, datePreset } = useDateFilters();
  const { restaurantIds } = useDashboardFiltersStore();

  // Expand multi-portal IDs
  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();

  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  const reviewParams = useMemo(() => ({
    companyIds,
    brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
    addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
    channelIds: channelIds.length > 0 ? channelIds : undefined,
    dateRange,
    datePreset,
  }), [companyIds, expandedBrandIds, expandedRestaurantIds, channelIds, dateRange, datePreset]);

  // Fetch all data in parallel via React Query
  const aggQuery = useReviewsAggregation(reviewParams);
  const heatmapQuery = useReviewsHeatmap(reviewParams);
  const rawQuery = useReviewsRaw(reviewParams);
  const refundsSummaryQuery = useRefundsSummary(reviewParams);

  // Extract order IDs from raw reviews for per-review refund lookup
  const orderIds = useMemo(
    () => (rawQuery.data || []).map((r) => r.fk_id_order),
    [rawQuery.data]
  );
  const refundsQuery = useOrderRefunds(orderIds);

  // Extract review IDs for tags lookup
  const reviewIds = useMemo(
    () => (rawQuery.data || []).map((r) => r.pk_id_review),
    [rawQuery.data]
  );
  const tagsQuery = useReviewTags(reviewIds);

  const isLoading = aggQuery.isLoading || heatmapQuery.isLoading || rawQuery.isLoading;
  const error = aggQuery.error || heatmapQuery.error || rawQuery.error;

  // Transform data into component-ready format
  const data = useMemo<ReputationData | undefined>(() => {
    if (!aggQuery.data) return undefined;

    const { current, changes } = aggQuery.data;

    // Build channel ratings
    const channelRatings: ChannelRating[] = [];
    const glovoRating = buildChannelRating('glovo', current.byChannel.glovo);
    if (glovoRating) channelRatings.push(glovoRating);
    const ubereatsRating = buildChannelRating('ubereats', current.byChannel.ubereats);
    if (ubereatsRating) channelRatings.push(ubereatsRating);
    const justeatRating = buildChannelRating('justeat', current.byChannel.justeat);
    if (justeatRating) channelRatings.push(justeatRating);

    // Build summary (refund KPIs from orders aggregation)
    const refundData = refundsSummaryQuery.data;
    const summary: ReputationSummary = {
      totalReviews: current.totalReviews,
      totalReviewsChange: changes.totalReviewsChange,
      negativeReviews: current.totalNegative,
      negativeReviewsChange: changes.negativeChange,
      totalRefunds: refundData?.totalRefunds ?? 0,
      totalRefundsChange: refundData?.totalRefundsChange ?? 0,
      refundRate: refundData?.refundRate ?? 0,
    };

    // Build heatmap from RPC data
    const heatmap: HeatmapCell[] = (heatmapQuery.data || []).map((cell) => ({
      day: cell.dayOfWeek,
      hour: cell.hourOfDay,
      count: cell.count,
    }));

    // Build rating distribution
    const ratingDistribution: RatingDistributionItem[] = [5, 4, 3, 2, 1].map((rating) => {
      const key = `rating${rating}` as keyof typeof current.ratingDistribution;
      return {
        rating,
        label: RATING_LABELS[rating],
        count: current.ratingDistribution[key],
        color: RATING_COLORS[rating],
      };
    });

    // Build reviews from raw data, merging per-order refund amounts, order amounts, delivery times and tags
    const orderDetails = refundsQuery.data;
    const tagMap = tagsQuery.data;
    const reviews: Review[] = (rawQuery.data || []).map((raw) => {
      const channel = portalIdToChannelId(raw.pfk_id_portal) || 'glovo';
      const ts = new Date(raw.ts_creation_time);
      const refundAmount = orderDetails?.refunds.get(raw.fk_id_order) ?? null;
      const orderAmount = orderDetails?.amounts.get(raw.fk_id_order) ?? null;
      const deliveryTime = orderDetails?.deliveryTimes.get(raw.fk_id_order) ?? null;
      const tags = tagMap?.get(raw.pk_id_review) ?? null;
      return {
        id: raw.pk_id_review,
        orderId: raw.fk_id_order,
        channel,
        date: ts.toISOString().slice(0, 10),
        time: ts.toTimeString().slice(0, 5),
        rating: raw.val_rating,
        refundAmount,
        orderAmount,
        deliveryTime,
        tags,
      };
    });

    // Calculate average delivery time for the scorecard
    const deliveryTimes = reviews.map((r) => r.deliveryTime).filter((t): t is number => t != null);
    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
      : undefined;

    // Add avgDeliveryTime to summary
    summary.avgDeliveryTime = avgDeliveryTime;

    return {
      channelRatings,
      summary,
      heatmap,
      ratingDistribution,
      reviews,
      totalReviewsInPeriod: current.totalReviews,
    };
  }, [aggQuery.data, heatmapQuery.data, rawQuery.data, refundsQuery.data, refundsSummaryQuery.data, tagsQuery.data]);

  return {
    data,
    isLoading,
    error,
  };
}
