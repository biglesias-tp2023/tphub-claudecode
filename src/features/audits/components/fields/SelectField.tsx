import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';
import type { AuditField } from '@/types';

interface SelectFieldProps {
  field: AuditField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({ field, value, onChange, disabled }: SelectFieldProps) {
  const options = field.options || [];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white appearance-none cursor-pointer',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'pr-9'
          )}
        >
          <option value="">Selecciona una opción</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
