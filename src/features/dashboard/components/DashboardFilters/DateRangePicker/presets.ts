import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import type { DatePreset, DatePresetId } from './types';
import type { DateRange } from '@/types';

// Helper to get today's date at start of day
const today = () => startOfDay(new Date());

// Helper to get yesterday (last complete day)
const yesterday = () => subDays(today(), 1);

export const DATE_PRESETS: DatePreset[] = [
  {
    id: 'this_week',
    label: 'Esta semana',
    // From Monday of current week to today
    getRange: (): DateRange => ({
      start: startOfWeek(today(), { weekStartsOn: 1 }),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'this_month',
    label: 'Este mes',
    // From day 1 of current month to today
    getRange: (): DateRange => ({
      start: startOfMonth(today()),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'last_week',
    label: 'La semana pasada',
    // Complete previous week: Monday to Sunday
    getRange: (): DateRange => {
      const lastWeek = subWeeks(today(), 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfDay(endOfWeek(lastWeek, { weekStartsOn: 1 })),
      };
    },
  },
  {
    id: 'last_month',
    label: 'El mes pasado',
    // Complete previous month: day 1 to last day
    getRange: (): DateRange => {
      const lastMonth = subMonths(today(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfDay(endOfMonth(lastMonth)),
      };
    },
  },
  {
    id: 'last_7_days',
    label: 'Los últimos 7 días',
    // Last 7 COMPLETE days (not including today)
    // Example: if today is Jan 26, returns Jan 19-25
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 7)),
      end: endOfDay(yesterday()),
    }),
  },
  {
    id: 'last_30_days',
    label: 'Los últimos 30 días',
    // Last 30 COMPLETE days (not including today)
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 30)),
      end: endOfDay(yesterday()),
    }),
  },
  {
    id: 'last_12_weeks',
    label: 'Últimas 12 semanas',
    // Last 12 COMPLETE weeks (Mon-Sun), not including current week
    getRange: (): DateRange => {
      // Go back to the start of last week, then 11 more weeks
      const endOfLastWeek = endOfWeek(subWeeks(today(), 1), { weekStartsOn: 1 });
      const startOf12WeeksAgo = startOfWeek(subWeeks(today(), 12), { weekStartsOn: 1 });
      return {
        start: startOf12WeeksAgo,
        end: endOfDay(endOfLastWeek),
      };
    },
  },
  {
    id: 'last_12_months',
    label: 'Últimos 12 meses',
    // Last 12 COMPLETE months, not including current month
    getRange: (): DateRange => {
      const lastMonth = subMonths(today(), 1);
      const twelveMonthsAgo = subMonths(today(), 12);
      return {
        start: startOfMonth(twelveMonthsAgo),
        end: endOfDay(endOfMonth(lastMonth)),
      };
    },
  },
  {
    id: 'custom',
    label: 'Personalizar',
    // Default to last 30 complete days
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 30)),
      end: endOfDay(yesterday()),
    }),
  },
];

export function getPresetById(id: DatePresetId): DatePreset | undefined {
  return DATE_PRESETS.find((p) => p.id === id);
}

export function getPresetLabel(id: DatePresetId): string {
  return getPresetById(id)?.label || 'Personalizado';
}

export function getRangeFromPreset(id: DatePresetId): DateRange {
  const preset = getPresetById(id);
  return preset ? preset.getRange() : DATE_PRESETS[5].getRange(); // Default to last 30 days
}
