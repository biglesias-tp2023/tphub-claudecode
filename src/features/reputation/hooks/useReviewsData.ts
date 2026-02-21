/**
 * useReviewsData Hooks
 *
 * React Query hooks for fetching review data from CRP Portal.
 * Three separate hooks following Single Responsibility principle:
 * - useReviewsAggregation: Aggregated metrics with period comparison
 * - useReviewsHeatmap: Negative reviews by day/hour
 * - useReviewsRaw: Raw review records for detail table
 *
 * @module features/reputation/hooks/useReviewsData
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchCrpReviewsComparison,
  fetchCrpReviewsHeatmap,
  fetchCrpReviewsRaw,
} from '@/services/crp-portal';
import type { ReviewsAggregation, ReviewsChanges, ReviewsHeatmapCell, RawReview } from '@/services/crp-portal';
import type { ChannelId, DateRange, DatePreset } from '@/types';
import { formatDate, getPreviousPeriodRange } from '@/features/controlling/hooks/dateUtils';

// ============================================
// TYPES
// ============================================

export interface UseReviewsParams {
  companyIds: string[];
  brandIds?: string[];
  addressIds?: string[];
  channelIds?: ChannelId[];
  dateRange: DateRange;
  datePreset: DatePreset;
}

export interface ReviewsAggregationResult {
  current: ReviewsAggregation;
  previous: ReviewsAggregation;
  changes: ReviewsChanges;
}

// ============================================
// HOOKS
// ============================================

export function useReviewsAggregation(params: UseReviewsParams) {
  const { companyIds, brandIds, addressIds, channelIds, dateRange, datePreset } = params;

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  const previousRange = getPreviousPeriodRange(dateRange);
  const previousStartDate = formatDate(previousRange.start);
  const previousEndDate = formatDate(previousRange.end);

  return useQuery<ReviewsAggregationResult>({
    queryKey: [
      'crp-reviews-agg',
      startDate,
      endDate,
      datePreset,
      [...companyIds].sort().join(','),
      [...(brandIds || [])].sort().join(','),
      [...(addressIds || [])].sort().join(','),
      [...(channelIds || [])].sort().join(','),
    ],
    queryFn: async () => {
      const baseParams = {
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: brandIds && brandIds.length > 0 ? brandIds : undefined,
        addressIds: addressIds && addressIds.length > 0 ? addressIds : undefined,
        channelIds: channelIds && channelIds.length > 0 ? channelIds : undefined,
      };

      return await fetchCrpReviewsComparison(
        { ...baseParams, startDate, endDate },
        { ...baseParams, startDate: previousStartDate, endDate: previousEndDate }
      );
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useReviewsHeatmap(params: UseReviewsParams) {
  const { companyIds, brandIds, addressIds, channelIds, dateRange } = params;

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  return useQuery<ReviewsHeatmapCell[]>({
    queryKey: [
      'crp-reviews-heatmap',
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      [...(brandIds || [])].sort().join(','),
      [...(addressIds || [])].sort().join(','),
      [...(channelIds || [])].sort().join(','),
    ],
    queryFn: async () => {
      return await fetchCrpReviewsHeatmap({
        companyIds: companyIds.length > 0 ? companyIds : undefined,
        brandIds: brandIds && brandIds.length > 0 ? brandIds : undefined,
        addressIds: addressIds && addressIds.length > 0 ? addressIds : undefined,
        channelIds: channelIds && channelIds.length > 0 ? channelIds : undefined,
        startDate,
        endDate,
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useReviewsRaw(params: UseReviewsParams, limit = 200) {
  const { companyIds, brandIds, addressIds, channelIds, dateRange } = params;

  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);

  return useQuery<RawReview[]>({
    queryKey: [
      'crp-reviews-raw',
      startDate,
      endDate,
      [...companyIds].sort().join(','),
      [...(brandIds || [])].sort().join(','),
      [...(addressIds || [])].sort().join(','),
      [...(channelIds || [])].sort().join(','),
      limit,
    ],
    queryFn: async () => {
      return await fetchCrpReviewsRaw(
        {
          companyIds: companyIds.length > 0 ? companyIds : undefined,
          brandIds: brandIds && brandIds.length > 0 ? brandIds : undefined,
          addressIds: addressIds && addressIds.length > 0 ? addressIds : undefined,
          channelIds: channelIds && channelIds.length > 0 ? channelIds : undefined,
          startDate,
          endDate,
        },
        limit
      );
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
