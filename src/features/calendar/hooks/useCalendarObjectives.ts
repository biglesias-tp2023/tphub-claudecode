/**
 * Calendar Objectives Hook
 *
 * Fetches strategic objectives that fall within the visible calendar month range.
 * Returns them as date-ranged items for bar rendering.
 *
 * @module features/calendar/hooks/useCalendarObjectives
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';
import { fetchStrategicObjectives } from '@/services/data/strategic-objectives';
import type { StrategicObjective } from '@/types';

interface UseCalendarObjectivesParams {
  companyIds: string[];
  brandIds?: string[];
  addressIds?: string[];
  year: number;
  month: number;
}

export interface CalendarObjectiveItem {
  objective: StrategicObjective;
  startDate: string; // YYYY-MM-DD (created_at or start of visible range)
  endDate: string;   // YYYY-MM-DD (evaluation_date)
}

/**
 * Fetches strategic objectives visible in the calendar month.
 * An objective is visible if its evaluation_date falls within the visible 42-day range,
 * or if its created_at → evaluation_date range overlaps the visible range.
 */
export function useCalendarObjectives({
  companyIds,
  brandIds,
  addressIds,
  year,
  month,
}: UseCalendarObjectivesParams) {
  // Calculate visible range
  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    let dayOfWeek = firstDay.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(year, month - 1, 1 - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 41);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return { startDate: fmt(start), endDate: fmt(end) };
  }, [year, month]);

  const query = useQuery({
    queryKey: queryKeys.calendarObjectives(companyIds, year, month),
    queryFn: () => fetchStrategicObjectives({
      companyIds,
      brandIds,
      addressIds,
    }),
    enabled: companyIds.length > 0,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });

  // Filter and map to CalendarObjectiveItem
  const items = useMemo((): CalendarObjectiveItem[] => {
    if (!query.data) return [];

    return query.data
      .filter(obj => {
        if (!obj.evaluationDate) return false;
        const evalDate = obj.evaluationDate;
        const createdDate = obj.createdAt?.split('T')[0] ?? evalDate;
        // Overlaps with visible range
        return createdDate <= endDate && evalDate >= startDate;
      })
      .map(obj => ({
        objective: obj,
        startDate: obj.createdAt?.split('T')[0] ?? obj.evaluationDate!,
        endDate: obj.evaluationDate!,
      }));
  }, [query.data, startDate, endDate]);

  return {
    ...query,
    items,
  };
}
