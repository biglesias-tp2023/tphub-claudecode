import type { DateRange } from '@/types';

export type DatePresetId =
  | 'this_week'
  | 'this_month'
  | 'last_week'
  | 'last_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_12_weeks'
  | 'last_12_months'
  | 'custom';

export interface DatePreset {
  id: DatePresetId;
  label: string;
  getRange: () => DateRange;
}

export interface DateRangePickerState {
  presetId: DatePresetId;
  customRange: DateRange | null;
  isOpen: boolean;
  showCalendar: boolean;
}
