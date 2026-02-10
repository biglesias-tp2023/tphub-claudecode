import {
  endOfDay,
  startOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from 'date-fns';
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

// Helper to get today's date at start of day
const today = () => startOfDay(new Date());

// Helper to get yesterday (last complete day)
const yesterday = () => subDays(today(), 1);

/**
 * Converts a date preset to an actual date range.
 *
 * @param preset - The date preset identifier
 * @returns DateRange object with start and end dates
 *
 * @example
 * getDateRangeFromPreset('last_7_days') // { start: 7 days ago, end: yesterday }
 * getDateRangeFromPreset('this_week') // { start: Monday of current week, end: today }
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  switch (preset) {
    case 'this_week':
      // From Monday of current week to today
      return {
        start: startOfWeek(today(), { weekStartsOn: 1 }),
        end: endOfDay(new Date()),
      };

    case 'this_month':
      // From day 1 of current month to today
      return {
        start: startOfMonth(today()),
        end: endOfDay(new Date()),
      };

    case 'last_week': {
      // Complete previous week: Monday to Sunday
      const lastWeek = subWeeks(today(), 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfDay(endOfWeek(lastWeek, { weekStartsOn: 1 })),
      };
    }

    case 'last_month': {
      // Complete previous month: day 1 to last day
      const lastMonth = subMonths(today(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfDay(endOfMonth(lastMonth)),
      };
    }

    case 'last_7_days':
      // Last 7 COMPLETE days (not including today)
      // Example: if today is Jan 26, returns Jan 19-25
      return {
        start: startOfDay(subDays(today(), 7)),
        end: endOfDay(yesterday()),
      };

    case 'last_30_days':
      // Last 30 COMPLETE days (not including today)
      return {
        start: startOfDay(subDays(today(), 30)),
        end: endOfDay(yesterday()),
      };

    case 'last_12_weeks': {
      // Last 12 COMPLETE weeks (Mon-Sun), not including current week
      const endOfLastWeek = endOfWeek(subWeeks(today(), 1), { weekStartsOn: 1 });
      const startOf12WeeksAgo = startOfWeek(subWeeks(today(), 12), { weekStartsOn: 1 });
      return {
        start: startOf12WeeksAgo,
        end: endOfDay(endOfLastWeek),
      };
    }

    case 'last_12_months': {
      // Last 12 COMPLETE months, not including current month
      const lastMonth = subMonths(today(), 1);
      const twelveMonthsAgo = subMonths(today(), 12);
      return {
        start: startOfMonth(twelveMonthsAgo),
        end: endOfDay(endOfMonth(lastMonth)),
      };
    }

    case 'custom':
    default:
      // Default to last 7 complete days
      return {
        start: startOfDay(subDays(today(), 7)),
        end: endOfDay(yesterday()),
      };
  }
}

// ============================================
// LABELS
// ============================================

const PRESET_LABELS: Record<DatePreset, string> = {
  this_week: 'Esta semana',
  this_month: 'Este mes',
  last_week: 'La semana pasada',
  last_month: 'El mes pasado',
  last_7_days: 'Los últimos 7 días',
  last_30_days: 'Los últimos 30 días',
  last_12_weeks: 'Últimas 12 semanas',
  last_12_months: 'Últimos 12 meses',
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
 * Uses getPeriodLabelsFromRange internally for consistency.
 *
 * @param preset - The date preset identifier
 * @returns Object with current period and comparison period labels
 *
 * @example
 * getPeriodLabels('last_7_days') // { current: "19-25 Ene", comparison: "12-18 Ene" }
 */
export function getPeriodLabels(preset: DatePreset): { current: string; comparison: string } {
  const range = getDateRangeFromPreset(preset);
  return getPeriodLabelsFromRange(range);
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

  // Calculate duration in full days (ignoring time component)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const durationMs = endDay.getTime() - startDay.getTime();

  // Previous period ends the day before current period starts
  const compEnd = new Date(startDay.getTime() - 86400000);
  const compStart = new Date(compEnd.getTime() - durationMs);

  return {
    current: formatDateRangeLabel(start, end),
    comparison: formatDateRangeLabel(compStart, compEnd),
  };
}
