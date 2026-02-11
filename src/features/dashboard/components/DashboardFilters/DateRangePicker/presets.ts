import { getDateRangeFromPreset, getPresetLabel as getPresetLabelFromFormatters } from '@/utils/formatters';
import type { DatePresetConfig, DatePresetId } from './types';
import type { DateRange } from '@/types';

// All presets configuration for the UI
export const DATE_PRESETS: DatePresetConfig[] = [
  { id: 'this_week', label: 'Esta semana', getRange: () => getDateRangeFromPreset('this_week') },
  { id: 'this_month', label: 'Este mes', getRange: () => getDateRangeFromPreset('this_month') },
  { id: 'last_week', label: 'La semana pasada', getRange: () => getDateRangeFromPreset('last_week') },
  { id: 'last_month', label: 'El mes pasado', getRange: () => getDateRangeFromPreset('last_month') },
  { id: 'last_7_days', label: 'Los últimos 7 días', getRange: () => getDateRangeFromPreset('last_7_days') },
  { id: 'last_30_days', label: 'Los últimos 30 días', getRange: () => getDateRangeFromPreset('last_30_days') },
  { id: 'last_12_weeks', label: 'Últimas 12 semanas', getRange: () => getDateRangeFromPreset('last_12_weeks') },
  { id: 'last_12_months', label: 'Últimos 12 meses', getRange: () => getDateRangeFromPreset('last_12_months') },
  { id: 'custom', label: 'Personalizar', getRange: () => getDateRangeFromPreset('custom') },
];

export function getPresetById(id: DatePresetId): DatePresetConfig | undefined {
  return DATE_PRESETS.find((p) => p.id === id);
}

export function getPresetLabel(id: DatePresetId): string {
  return getPresetLabelFromFormatters(id);
}

export function getRangeFromPreset(id: DatePresetId): DateRange {
  return getDateRangeFromPreset(id);
}
