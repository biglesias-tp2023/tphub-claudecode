import { cn } from '@/utils/cn';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { BrandSelector } from './BrandSelector';
import { EstablishmentSelector } from './EstablishmentSelector';
import { ChannelSelector } from './ChannelSelector';
import { DateRangePicker } from './DateRangePicker';
import type { DatePreset, DateRange } from '@/types';

interface DashboardFiltersProps {
  className?: string;
  /** Channels to exclude from the selector (e.g., ['justeat'] if no data) */
  excludeChannels?: ('glovo' | 'ubereats' | 'justeat')[];
}

export function DashboardFilters({ className, excludeChannels }: DashboardFiltersProps) {
  const { dateRange, datePreset, setDateRangeWithPreset } = useDashboardFiltersStore();

  const handleDateChange = (range: DateRange, presetId: DatePreset) => {
    setDateRangeWithPreset(range, presetId);
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
        <EstablishmentSelector />
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-gray-200 hidden lg:block" />

      {/* Independent filters (right) */}
      <div className="flex flex-wrap items-center gap-4 lg:ml-auto">
        <ChannelSelector excludeChannels={excludeChannels} />
        <DateRangePicker
          value={dateRange}
          presetId={datePreset}
          onChange={handleDateChange}
        />
      </div>
    </div>
  );
}
