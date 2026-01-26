import { cn } from '@/utils/cn';
import type { AuditField } from '@/types';

interface TextFieldProps {
  field: AuditField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextField({ field, value, onChange, disabled }: TextFieldProps) {
  const isLongText = field.placeholder && field.placeholder.length > 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {isLongText ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          rows={3}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white',
            'placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'resize-y min-h-[80px]'
          )}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white',
            'placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed'
          )}
        />
      )}
    </div>
  );
}
