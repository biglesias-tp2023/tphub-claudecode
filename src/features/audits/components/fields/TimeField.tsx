import { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AuditField } from '@/types';

interface TimeFieldProps {
  field: AuditField;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimeField({ field, value, onChange, disabled }: TimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (hours: number, minutes: number): string => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleSelect = (hours: number, minutes: number) => {
    onChange(formatTime(hours, minutes));
    setIsOpen(false);
  };

  const clear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Generate time options (every 15 minutes)
  const timeOptions: { hours: number; minutes: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      timeOptions.push({
        hours: h,
        minutes: m,
        label: formatTime(h, m),
      });
    }
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
            'border border-gray-200 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            !value && 'text-gray-400'
          )}
        >
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="flex-1">
            {value || 'Seleccionar hora'}
          </span>
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-40 max-h-64 overflow-y-auto">
            {timeOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleSelect(option.hours, option.minutes)}
                className={cn(
                  'w-full px-3 py-2 text-sm text-left hover:bg-gray-50',
                  value === option.label && 'bg-primary-50 text-primary-600 font-medium'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
