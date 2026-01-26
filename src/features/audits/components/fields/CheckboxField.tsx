import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import type { AuditField } from '@/types';

interface CheckboxFieldProps {
  field: AuditField;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({ field, value, onChange, disabled }: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        value
          ? 'bg-primary-50 border-primary-300'
          : 'bg-white border-gray-200 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors',
          value
            ? 'bg-primary-500 border-primary-500'
            : 'bg-white border-gray-300'
        )}
      >
        {value && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span className="text-sm text-gray-700">{field.label}</span>
      {field.required && <span className="text-red-500 text-xs">*</span>}
    </label>
  );
}
