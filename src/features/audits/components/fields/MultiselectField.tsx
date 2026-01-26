import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import type { AuditField } from '@/types';

interface MultiselectFieldProps {
  field: AuditField;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function MultiselectField({ field, value = [], onChange, disabled }: MultiselectFieldProps) {
  const options = field.options || [];

  const toggleOption = (option: string) => {
    if (disabled) return;

    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                isSelected
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center border transition-colors',
                  isSelected
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-300'
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} seleccionado{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
