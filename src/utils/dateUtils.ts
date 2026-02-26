/**
 * Shared date/ID utilities used across controlling, customers, heatmap, and dashboard hooks.
 */

import type { DateRange } from '@/types';

/**
 * Ensures a date value is a proper Date object.
 * Handles both Date objects and ISO strings (from Zustand hydration).
 */
export function ensureDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Format a Date to YYYY-MM-DD string.
 * Uses local date to avoid timezone issues.
 */
export function formatDate(date: Date | string): string {
  const d = ensureDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the previous period date range for comparison.
 *
 * For a current period of Feb 2-8 (7 days inclusive):
 * - Previous should be Jan 26 - Feb 1 (7 days inclusive)
 * - previousEnd = day before current start = Feb 1
 * - previousStart = previousEnd - duration = Jan 26
 */
export function getPreviousPeriodRange(dateRange: DateRange): { start: Date; end: Date } {
  const start = ensureDate(dateRange.start);
  const end = ensureDate(dateRange.end);

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const durationMs = endDay.getTime() - startDay.getTime();

  const previousEnd = new Date(startDay.getTime() - 86400000);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { start: previousStart, end: previousEnd };
}

/**
 * Convert string IDs to numbers, filtering out invalid values.
 * CRP Portal uses numeric IDs from Athena.
 */
export function parseNumericIds(ids: string[]): number[] {
  return ids
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && id > 0);
}

export interface WeekRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string; // Short label like "03/02"
}

/**
 * Calculate N complete week ranges (Mon-Sun) going backwards from the
 * most recent completed week. Labels are DD/MM of each Monday.
 */
export function getLastNWeeks(n: number): WeekRange[] {
  const today = new Date();
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;

  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: WeekRange[] = [];

  for (let i = 1; i <= n; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const dd = String(weekStart.getDate()).padStart(2, '0');
    const mm = String(weekStart.getMonth() + 1).padStart(2, '0');

    weeks.unshift({
      start: formatDate(weekStart),
      end: formatDate(weekEnd),
      label: `${dd}/${mm}`,
    });
  }

  return weeks;
}
