import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DateRange, DatePreset } from '@/types';

// ============================================
// CURRENCY
// ============================================

/**
 * Formats a number as currency.
 *
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (default: 'EUR')
 * @param locale - BCP 47 locale string (default: 'es-ES')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "1.234,56 €"
 * formatCurrency(1234.56, 'USD', 'en-US') // "$1,234.56"
 */
export function formatCurrency(
  amount: number,
  currency = 'EUR',
  locale = 'es-ES'
): string {
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
  const today = endOfDay(now);

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: today };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case '7d':
      return { start: startOfDay(subDays(now, 6)), end: today };
    case '30d':
      return { start: startOfDay(subDays(now, 29)), end: today };
    case '90d':
      return { start: startOfDay(subDays(now, 89)), end: today };
    case 'year':
      return { start: startOfDay(subDays(now, 364)), end: today };
    case 'custom':
    default:
      return { start: startOfDay(subDays(now, 29)), end: today };
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
      const yesterday = subDays(now, 1);
      return {
        current: formatShortDate(now),
        comparison: formatShortDate(yesterday),
      };
    }
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      const dayBefore = subDays(now, 2);
      return {
        current: formatShortDate(yesterday),
        comparison: formatShortDate(dayBefore),
      };
    }
    case '7d': {
      const currentStart = subDays(now, 6);
      const compStart = subDays(now, 13);
      const compEnd = subDays(now, 7);
      return {
        current: formatDateRange(currentStart, now),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case '30d': {
      const currentStart = subDays(now, 29);
      const compStart = subDays(now, 59);
      const compEnd = subDays(now, 30);
      return {
        current: formatDateRange(currentStart, now),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case '90d': {
      const currentStart = subDays(now, 89);
      const compStart = subDays(now, 179);
      const compEnd = subDays(now, 90);
      return {
        current: formatDateRange(currentStart, now),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
    case 'year': {
      const lastYear = now.getFullYear() - 1;
      return {
        current: String(now.getFullYear()),
        comparison: String(lastYear),
      };
    }
    case 'custom':
    default: {
      const currentStart = subDays(now, 29);
      const compStart = subDays(now, 59);
      const compEnd = subDays(now, 30);
      return {
        current: formatDateRange(currentStart, now),
        comparison: formatDateRange(compStart, compEnd),
      };
    }
  }
}
