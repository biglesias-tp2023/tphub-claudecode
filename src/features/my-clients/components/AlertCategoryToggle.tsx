import { cn } from '@/utils/cn';

interface AlertCategoryToggleProps {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  threshold: number | null;
  onThresholdChange: (value: number | null) => void;
  defaultThreshold: number;
  thresholdLabel: string;
  thresholdSuffix?: string;
}

export function AlertCategoryToggle({
  label,
  icon,
  enabled,
  onToggle,
  threshold,
  onThresholdChange,
  defaultThreshold,
  thresholdLabel,
  thresholdSuffix = '',
}: AlertCategoryToggleProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      {/* Toggle */}
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          enabled ? 'bg-primary-600' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>

      {/* Label */}
      <span className={cn(
        'flex items-center gap-2 text-sm min-w-[100px]',
        enabled ? 'text-gray-900' : 'text-gray-400'
      )}>
        {icon}
        {label}
      </span>

      {/* Threshold input */}
      {enabled && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">{thresholdLabel}:</span>
          <input
            type="number"
            value={threshold ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onThresholdChange(val === '' ? null : Number(val));
            }}
            placeholder={String(defaultThreshold)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
          {thresholdSuffix && (
            <span className="text-xs text-gray-400">{thresholdSuffix}</span>
          )}
          {threshold === null && (
            <span className="text-xs text-gray-400">(def: {defaultThreshold}{thresholdSuffix})</span>
          )}
        </div>
      )}
    </div>
  );
}
