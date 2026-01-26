import { cn } from '@/utils/cn';
import type { AuditField } from '@/types';

interface NumberFieldProps {
  field: AuditField;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function NumberField({ field, value, onChange, disabled }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? null : parseFloat(val));
        }}
        disabled={disabled}
        placeholder={field.placeholder}
        step="any"
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white',
          'placeholder:text-gray-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          // Hide number spinners
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
      />
    </div>
  );
}
