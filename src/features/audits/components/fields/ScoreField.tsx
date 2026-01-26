import { cn } from '@/utils/cn';
import { Star } from 'lucide-react';
import type { AuditField } from '@/types';

interface ScoreFieldProps {
  field: AuditField;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ScoreField({ field, value, onChange, disabled }: ScoreFieldProps) {
  const maxScore = field.maxScore || 5;
  const scoreLabels = field.scoreLabels || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {/* Score buttons */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => {
          const isSelected = value === score;
          const label = scoreLabels[score - 1];

          return (
            <button
              key={score}
              type="button"
              onClick={() => !disabled && onChange(score)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all',
                isSelected
                  ? 'bg-primary-50 border-primary-300 text-primary-700 ring-2 ring-primary-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={label}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isSelected ? 'fill-primary-500 text-primary-500' : 'text-gray-400'
                )}
              />
              <span className="font-medium">{score}</span>
            </button>
          );
        })}
      </div>

      {/* Score label if selected */}
      {value && scoreLabels[value - 1] && (
        <p className="text-xs text-gray-500 mt-1">
          {value}: {scoreLabels[value - 1]}
        </p>
      )}

      {/* All labels display for reference */}
      {scoreLabels.length > 0 && !value && (
        <div className="text-xs text-gray-400 space-y-0.5 mt-2">
          {scoreLabels.map((label, idx) => (
            <p key={idx}>
              <span className="font-medium">{idx + 1}</span>: {label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
