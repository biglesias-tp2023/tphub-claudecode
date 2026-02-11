import type { DateRange, DatePreset as DatePresetType } from '@/types';

// Re-export DatePreset from @/types for backwards compatibility
export type DatePresetId = DatePresetType;

export interface DatePresetConfig {
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
