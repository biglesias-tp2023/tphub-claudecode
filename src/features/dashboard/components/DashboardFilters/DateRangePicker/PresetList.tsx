import * as RadioGroup from '@radix-ui/react-radio-group';
import { cn } from '@/utils/cn';
import { DATE_PRESETS } from './presets';
import type { DatePresetId } from './types';

interface PresetListProps {
  value: DatePresetId;
  onChange: (value: DatePresetId) => void;
}

export function PresetList({ value, onChange }: PresetListProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(val) => onChange(val as DatePresetId)}
      className="flex flex-col gap-0.5"
    >
      {DATE_PRESETS.map((preset) => (
        <RadioGroup.Item
          key={preset.id}
          value={preset.id}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
            'hover:bg-gray-50 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            value === preset.id && 'bg-primary-50'
          )}
        >
          <div
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
              'transition-colors',
              value === preset.id
                ? 'border-primary-500'
                : 'border-gray-300'
            )}
          >
            <RadioGroup.Indicator className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          </div>
          <span
            className={cn(
              'text-xs',
              value === preset.id ? 'text-gray-900 font-medium' : 'text-gray-600'
            )}
          >
            {preset.label}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
