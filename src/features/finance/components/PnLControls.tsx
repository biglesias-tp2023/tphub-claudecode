import { memo } from 'react';
import { cn } from '@/utils/cn';
import type {
  PnLGranularity,
  PnLDisplayFormat,
  PnLChannelTab,
} from '../types';
import {
  PNL_CHANNEL_TABS,
  PNL_GRANULARITY_OPTIONS,
  PNL_FORMAT_OPTIONS,
} from '../types';

interface PnLControlsProps {
  channelTab: PnLChannelTab;
  granularity: PnLGranularity;
  displayFormat: PnLDisplayFormat;
  foodCostPct: number;
  onChannelTabChange: (tab: PnLChannelTab) => void;
  onGranularityChange: (g: PnLGranularity) => void;
  onDisplayFormatChange: (f: PnLDisplayFormat) => void;
  onFoodCostChange: (pct: number) => void;
}

export const PnLControls = memo(function PnLControls({
  channelTab,
  granularity,
  displayFormat,
  foodCostPct,
  onChannelTabChange,
  onGranularityChange,
  onDisplayFormatChange,
  onFoodCostChange,
}: PnLControlsProps) {
  return (
    <div className="space-y-4">
      {/* Channel tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {PNL_CHANNEL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChannelTabChange(tab.id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              channelTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secondary controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Granularity selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Agrupación
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
            {PNL_GRANULARITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onGranularityChange(opt.id)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  granularity === opt.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Formato
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
            {PNL_FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onDisplayFormatChange(opt.id)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  displayFormat === opt.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Food cost input */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Food Cost
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={foodCostPct}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 100) {
                  onFoodCostChange(v);
                }
              }}
              className="w-16 px-2 py-1 text-xs text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </div>
      </div>
    </div>
  );
});
