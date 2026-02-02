import { endOfDay, startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DateRange, DatePreset } from '@/types';

// ============================================
// CURRENCY
// ============================================

interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  compact?: boolean;
}

/**
 * Formats a number as currency.
 *
 * @param amount - The numeric amount to format
 * @param options - Formatting options (currency, locale, compact)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "1.234,56 €"
 * formatCurrency(1234.56, { currency: 'USD', locale: 'en-US' }) // "$1,234.56"
 * formatCurrency(1234567, { compact: true }) // "1,2M €"
 */
export function formatCurrency(
  amount: number,
  options?: FormatCurrencyOptions
): string {
  const { currency = 'EUR', locale = 'es-ES', compact = false } = options || {};

  if (compact) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1).replace('.', ',')}M €`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1).replace('.', ',')}K €`;
    }
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================
// NUMBERS
// ============================================

/**
 * Formats a number with thousands separators.
 *
 * @param value - The number to format
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1.234.567"
 * formatNumber(1234.56, { minimumFractionDigits: 2 }) // "1.234,56"
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('es-ES', options).format(value);
}

/**
 * Formats a percentage value.
 *
 * @param value - The numeric value (decimal or percentage)
 * @param decimals - Number of decimal places (default: 1)
 * @param isDecimal - Whether value is decimal (0.12) or percentage (12) (default: true)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.1234) // "12,3%"
 * formatPercentage(0.1234, 2) // "12,34%"
 * formatPercentage(12.34, 1, false) // "12,3%" (already a percentage)
 */
export function formatPercentage(
  value: number,
  decimals = 1,
  isDecimal = true
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals).replace('.', ',')}%`;
}

// ============================================
// DATE RANGES
// ============================================

/**
 * Converts a date preset to an actual date range.
 *
 * @param preset - The date preset identifier
 * @returns DateRange object with start and end dates
 *
 * @example
 * getDateRangeFromPreset('7d') // { start: 7 days ago, end: today }
 * getDateRangeFromPreset('today') // { start: today 00:00, end: today 23:59 }
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayEnd = endOfDay(subDays(now, 1));

  switch (preset) {
    case 'today':
      return { start: todayStart, end: endOfDay(now) };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case '7d':
      // Last 7 COMPLETE days (not including today)
      // Example: if today is Jan 26, returns Jan 19-25
      return { start: startOfDay(subDays(todayStart, 7)), end: yesterdayEnd };
    case '30d':
      // Last 30 COMPLETE days (not including today)
      return { start: startOfDay(subDays(todayStart, 30)), end: yesterdayEnd };
    case '90d':
      // Last 90 COMPLETE days (not including today)
      return { start: startOfDay(subDays(todayStart, 90)), end: yesterdayEnd };
    case 'year':
      // Last 12 COMPLETE months (not including current month)
      const lastMonth = subMonths(todayStart, 1);
      const twelveMonthsAgo = subMonths(todayStart, 12);
      return { start: startOfMonth(twelveMonthsAgo), end: endOfDay(endOfMonth(lastMonth)) };
    case 'custom':
    default:
      // Default to last 30 complete days
      return { start: startOfDay(subDays(todayStart, 30)), end: yesterdayEnd };
  }
}

// ============================================
// LABELS
// ============================================

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  year: 'Último año',
  custom: 'Personalizado',
};

/**
 * Gets the display label for a date preset.
 *
 * @param preset - The date preset identifier
 * @returns Human-readable label in Spanish
 *
 * @example
 * getPresetLabel('7d') // "Últimos 7 días"
 * getPresetLabel('today') // "Hoy"
 */
export function getPresetLabel(preset: DatePreset): string {
  return PRESET_LABELS[preset];
}

/**
 * Gets the current analysis period and comparison period labels.
 *
 * @param preset - The date preset identifier
 * @returns Object with current period and comparison period labels
 *
 * @example
 * getPeriodLabels('7d') // { current: "15-21 Ene", comparison: "8-14 Ene" }
 */
export function getPeriodLabels(preset: DatePreset): { current: string; comparison: string } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterday = subDays(now, 1);
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const formatShortDate = (date: Date) => `${date.getDate()} ${monthNames[date.getMonth()]}`;
  const formatDateRange = (start: Date, end: Date) => {
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]}`;
    }
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };

  switch (preset) {
    case 'today': {
      return {
        current: formatShortDate(now),
        comparison: formatShortDate(yesterday),
      };
    }
    case 'yesterday': {
      const dayBefore = subDays(now, 2);
      return {
        current: formatShortDate(yesterday),
        comparison: formatShortDate(dayBefore),
      };
    }
    case '7d': {
      // Last 7 COMPLETE days (not including today)
      // Current: days -7 to -1 (yesterday)
      // Comparison: days -14 to -8
      const currentStart = subDays(todayStart, 7);
      const currentEnd = yesterday;
      const compStart = subDays(todayStart, 14);
      const compEnd = subDays(todayStart, 8);
      return {
        current: formatDateRange(currentStart, currentEnd),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case '30d': {
      // Last 30 COMPLETE days (not including today)
      const currentStart = subDays(todayStart, 30);
      const currentEnd = yesterday;
      const compStart = subDays(todayStart, 60);
      const compEnd = subDays(todayStart, 31);
      return {
        current: formatDateRange(currentStart, currentEnd),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case '90d': {
      // Last 90 COMPLETE days (not including today)
      const currentStart = subDays(todayStart, 90);
      const currentEnd = yesterday;
      const compStart = subDays(todayStart, 180);
      const compEnd = subDays(todayStart, 91);
      return {
        current: formatDateRange(currentStart, currentEnd),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case 'year': {
      // Last 12 COMPLETE months (not including current month)
      const lastMonth = subMonths(todayStart, 1);
      const twelveMonthsAgo = subMonths(todayStart, 12);
      const compEnd = subMonths(todayStart, 13);
      const compStart = subMonths(todayStart, 24);
      return {
        current: formatDateRange(startOfMonth(twelveMonthsAgo), endOfMonth(lastMonth)),
        comparison: formatDateRange(startOfMonth(compStart), endOfMonth(compEnd)),
      };
    }
    case 'custom':
    default: {
      // Default to last 30 complete days
      const currentStart = subDays(todayStart, 30);
      const currentEnd = yesterday;
      const compStart = subDays(todayStart, 60);
      const compEnd = subDays(todayStart, 31);
      return {
        current: formatDateRange(currentStart, currentEnd),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
  }
}

/**
 * Gets period labels using the actual date range values.
 * Use this instead of getPeriodLabels when you have the actual dateRange.
 *
 * @param dateRange - The actual date range object with start and end
 * @returns Object with current period and comparison period labels
 *
 * @example
 * getPeriodLabelsFromRange({ start: new Date('2026-01-19'), end: new Date('2026-01-25') })
 * // { current: "19-25 Ene", comparison: "12-18 Ene" }
 */
export function getPeriodLabelsFromRange(dateRange: DateRange): { current: string; comparison: string } {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const formatShortDate = (date: Date) => `${date.getDate()} ${monthNames[date.getMonth()]}`;
  const formatDateRangeLabel = (start: Date, end: Date) => {
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]}`;
    }
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };

  // Ensure dates are Date objects (handle string serialization from Zustand)
  const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start);
  const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end);

  // Calculate comparison period (same duration, immediately before)
  const durationMs = end.getTime() - start.getTime();
  const compEnd = new Date(start.getTime() - 86400000); // Day before start
  const compStart = new Date(compEnd.getTime() - durationMs);

  return {
    current: formatDateRangeLabel(start, end),
    comparison: formatDateRangeLabel(compStart, compEnd),
  };
}
