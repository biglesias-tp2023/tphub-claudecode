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
      className="flex flex-col gap-1"
    >
      {DATE_PRESETS.map((preset) => (
        <RadioGroup.Item
          key={preset.id}
          value={preset.id}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
            'hover:bg-gray-50 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            value === preset.id && 'bg-primary-50'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center',
              'transition-colors',
              value === preset.id
                ? 'border-primary-500'
                : 'border-gray-300'
            )}
          >
            <RadioGroup.Indicator className="w-2 h-2 rounded-full bg-primary-500" />
          </div>
          <span
            className={cn(
              'text-sm',
              value === preset.id ? 'text-gray-900 font-medium' : 'text-gray-700'
            )}
          >
            {preset.label}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
