/**
 * Calendar Daily Revenue Hook
 *
 * Fetches daily revenue per channel for the calendar visible range (42 days).
 *
 * @module features/calendar/hooks/useCalendarDailyRevenue
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchDailyRevenueByChannel } from '@/services/crp-portal/dailyRevenue';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';
import { parseNumericIds } from '@/utils/dateUtils';

interface UseCalendarDailyRevenueParams {
  companyIds: string[];
  brandIds?: string[];
  addressIds?: string[];
  year: number;
  month: number;
}

/**
 * Fetches daily revenue for the full 42-day visible range of a calendar month.
 * Returns a Map<dateStr, DailyChannelRevenue> for quick lookup per day cell.
 */
export function useCalendarDailyRevenue({
  companyIds,
  brandIds,
  addressIds,
  year,
  month,
}: UseCalendarDailyRevenueParams) {
  // Calculate visible range: start of first week to end of last week
  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    let dayOfWeek = firstDay.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0

    const start = new Date(year, month - 1, 1 - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 41); // 42 days total

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return { startDate: fmt(start), endDate: fmt(end) };
  }, [year, month]);

  const numericIds = useMemo(() => parseNumericIds(companyIds), [companyIds]);

  return useQuery({
    queryKey: queryKeys.calendarDailyRevenue(companyIds, year, month),
    queryFn: () => fetchDailyRevenueByChannel({
      companyIds: numericIds,
      startDate,
      endDate,
      brandIds: brandIds?.length ? brandIds : undefined,
      addressIds: addressIds?.length ? addressIds : undefined,
    }),
    enabled: numericIds.length > 0,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

export type { DailyChannelRevenue };
