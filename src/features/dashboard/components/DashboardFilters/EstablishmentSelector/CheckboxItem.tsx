import { Check, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}

export function CheckboxItem({
  label,
  checked,
  indeterminate = false,
  onChange,
  className,
}: CheckboxItemProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-lg',
        'hover:bg-gray-50 transition-colors text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
          'transition-colors',
          checked || indeterminate
            ? 'bg-primary-500 border-primary-500'
            : 'border-gray-300 bg-white'
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        {indeterminate && !checked && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-sm',
          checked ? 'text-gray-900 font-medium' : 'text-gray-700'
        )}
      >
        {label}
      </span>
    </button>
  );
}
