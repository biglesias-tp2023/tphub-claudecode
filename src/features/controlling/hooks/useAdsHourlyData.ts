/**
 * useAdsHourlyData Hook
 *
 * Fetches weekly ADS heatmap data (day_of_week × hour_of_day)
 * for the selected HierarchyRow in the Controlling detail panel.
 *
 * Uses the same 8-week range as the other detail panel charts.
 *
 * @module features/controlling/hooks/useAdsHourlyData
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdsWeeklyHeatmap } from '@/services/crp-portal';
import type { AdsWeeklyHeatmapRow } from '@/services/crp-portal';
import type { HierarchyRow } from './useControllingData';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function get8WeekRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;

  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const startDate = new Date(currentMonday);
  startDate.setDate(currentMonday.getDate() - 8 * 7);

  const endDate = new Date(currentMonday);
  endDate.setDate(currentMonday.getDate() - 1); // last Sunday

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

function parseRowFilters(row: HierarchyRow) {
  const companyIds: string[] = [];
  const brandIds: string[] = [];
  const addressIds: string[] = [];

  if (row.companyId) companyIds.push(row.companyId);

  switch (row.level) {
    case 'brand':
      if (row.brandId) brandIds.push(row.brandId);
      break;
    case 'address': {
      // ID format: address::{companyId}::{addressId}
      const parts = row.id.split('::');
      if (parts.length >= 3) addressIds.push(parts[2]);
      break;
    }
    case 'channel': {
      // ID format: channel::{companyId}::{addressId}::{portalId}
      const parts = row.id.split('::');
      if (parts.length >= 3) addressIds.push(parts[2]);
      break;
    }
  }

  return { companyIds, brandIds, addressIds };
}

export function useAdsHourlyData(row: HierarchyRow | null) {
  const range = useMemo(() => get8WeekRange(), []);
  const filters = useMemo(() => (row ? parseRowFilters(row) : null), [row]);

  return useQuery<AdsWeeklyHeatmapRow[]>({
    queryKey: ['ads-weekly-heatmap', row?.id, range.startDate, range.endDate],
    queryFn: async () => {
      if (!filters) return [];
      return fetchAdsWeeklyHeatmap({
        ...filters,
        startDate: range.startDate,
        endDate: range.endDate,
      });
    },
    enabled: !!row,
    staleTime: 5 * 60 * 1000,
  });
}
