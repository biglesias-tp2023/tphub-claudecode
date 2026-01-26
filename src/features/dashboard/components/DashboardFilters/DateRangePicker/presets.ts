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
import { es } from 'date-fns/locale';
import type { DatePreset, DatePresetId } from './types';
import type { DateRange } from '@/types';

// Helper to get today's date at start of day
const today = () => startOfDay(new Date());

export const DATE_PRESETS: DatePreset[] = [
  {
    id: 'this_week',
    label: 'Esta semana',
    getRange: (): DateRange => ({
      start: startOfWeek(today(), { locale: es, weekStartsOn: 1 }),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'this_month',
    label: 'Este mes',
    getRange: (): DateRange => ({
      start: startOfMonth(today()),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'last_week',
    label: 'La semana pasada',
    getRange: (): DateRange => {
      const lastWeekStart = startOfWeek(subWeeks(today(), 1), { locale: es, weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(today(), 1), { locale: es, weekStartsOn: 1 });
      return { start: lastWeekStart, end: endOfDay(lastWeekEnd) };
    },
  },
  {
    id: 'last_month',
    label: 'El mes pasado',
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
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'last_30_days',
    label: 'Los últimos 30 días',
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'last_12_weeks',
    label: 'Últimas 12 semanas',
    getRange: (): DateRange => ({
      start: startOfWeek(subWeeks(today(), 11), { locale: es, weekStartsOn: 1 }),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'last_12_months',
    label: 'Últimos 12 meses',
    getRange: (): DateRange => ({
      start: startOfMonth(subMonths(today(), 11)),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: 'custom',
    label: 'Personalizar',
    getRange: (): DateRange => ({
      start: startOfDay(subDays(today(), 29)),
      end: endOfDay(new Date()),
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
