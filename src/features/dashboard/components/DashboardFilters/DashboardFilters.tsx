import { cn } from '@/utils/cn';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { BrandSelector } from './BrandSelector';
import { AreaSelector } from './AreaSelector';
import { EstablishmentSelector } from './EstablishmentSelector';
import { ChannelSelector } from './ChannelSelector';
import { DateRangePicker } from './DateRangePicker';
import type { DatePresetId } from './DateRangePicker';
import type { DatePreset, DateRange } from '@/types';

// Map from UI DatePresetId to store DatePreset
function toStorePreset(presetId: DatePresetId): DatePreset {
  switch (presetId) {
    case 'last_7_days':
      return '7d';
    case 'last_30_days':
      return '30d';
    case 'last_12_weeks':
      return '90d';
    case 'last_12_months':
      return 'year';
    case 'this_week':
    case 'last_week':
      return '7d';
    case 'this_month':
    case 'last_month':
      return '30d';
    case 'custom':
      return 'custom';
    default:
      return '30d';
  }
}

// Map from store DatePreset to UI DatePresetId
function toUIPreset(preset: DatePreset): DatePresetId {
  switch (preset) {
    case 'today':
    case 'yesterday':
    case '7d':
      return 'last_7_days';
    case '30d':
      return 'last_30_days';
    case '90d':
      return 'last_12_weeks';
    case 'year':
      return 'last_12_months';
    case 'custom':
      return 'custom';
    default:
      return 'last_30_days';
  }
}

interface DashboardFiltersProps {
  className?: string;
  /** Channels to exclude from the selector (e.g., ['justeat'] if no data) */
  excludeChannels?: ('glovo' | 'ubereats' | 'justeat')[];
}

export function DashboardFilters({ className, excludeChannels }: DashboardFiltersProps) {
  const { dateRange, datePreset, setDatePreset, setDateRange } = useDashboardFiltersStore();

  const handleDateChange = (range: DateRange, presetId: DatePresetId) => {
    const storePreset = toStorePreset(presetId);
    if (presetId === 'custom') {
      setDateRange(range);
    } else {
      // Pass the actual range from the picker to ensure exact dates are used
      // The store will update both datePreset and dateRange
      setDatePreset(storePreset);
    }

    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[DashboardFilters] Date changed:', {
        presetId,
        storePreset,
        rangeStart: range.start.toISOString(),
        rangeEnd: range.end.toISOString(),
      });
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm',
        className
      )}
    >
      {/* Hierarchical filters (left) */}
      <div className="flex flex-wrap items-center gap-3">
        <BrandSelector />
        <AreaSelector />
        <EstablishmentSelector />
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-gray-200 hidden lg:block" />

      {/* Independent filters (right) */}
      <div className="flex flex-wrap items-center gap-4 lg:ml-auto">
        <ChannelSelector excludeChannels={excludeChannels} />
        <DateRangePicker
          value={dateRange}
          presetId={toUIPreset(datePreset)}
          onChange={handleDateChange}
        />
      </div>
    </div>
  );
}
