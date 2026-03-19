/**
 * Calendar Date Helpers
 *
 * Consolidated date utilities for the calendar feature.
 *
 * @module features/calendar/utils/dateHelpers
 */

/**
 * Format a Date to YYYY-MM-DD using local timezone.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Get today's date at midnight (local timezone).
 */
export function getToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Generate 42 date strings for a month grid (6 weeks x 7 days).
 * Starts from the Monday of the first week that includes the 1st of the month.
 */
export function getMonthGridDates(year: number, month: number): string[] {
  const dateStrings: string[] = [];

  const firstDay = new Date(year, month - 1, 1);
  let dayOfWeek = firstDay.getDay();
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0

  // Start from the Monday before (or on) the 1st
  const startDate = new Date(year, month - 1, 1 - dayOfWeek);

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dateStrings.push(formatLocalDate(date));
  }

  return dateStrings;
}

/**
 * Split 42 grid dates into 6 weeks of 7 dates each.
 */
export function splitIntoWeeks(gridDates: string[]): string[][] {
  const weeks: string[][] = [];
  for (let i = 0; i < gridDates.length; i += 7) {
    weeks.push(gridDates.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Check if a date string falls within the given month.
 */
export function isInMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/**
 * Check if a date string is today.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === formatLocalDate(getToday());
}

/**
 * Check if a date string is in the past.
 */
export function isPast(dateStr: string): boolean {
  return dateStr < formatLocalDate(getToday());
}

export const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
