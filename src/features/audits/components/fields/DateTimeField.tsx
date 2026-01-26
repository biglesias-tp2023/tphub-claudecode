import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AuditField } from '@/types';

interface DateTimeFieldProps {
  field: AuditField;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DateTimeField({ field, value, onChange, disabled }: DateTimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
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

  const handleDateChange = (date: Date) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(newDate);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
    onChange(newDate.toISOString());
  };

  const formatDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clear = () => {
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const current = selectedDate || new Date();
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    // Adjust for Monday start (0 = Monday in our grid)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const changeMonth = (delta: number) => {
    const current = selectedDate || new Date();
    const newDate = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    setSelectedDate(newDate);
  };

  const currentMonth = (selectedDate || new Date()).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

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
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="flex-1">
            {value ? formatDisplay(new Date(value)) : 'Seleccionar fecha y hora'}
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
          <div className="absolute z-50 mt-1 p-4 bg-white border border-gray-200 rounded-xl shadow-lg w-80">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ←
              </button>
              <span className="text-sm font-medium capitalize">{currentMonth}</span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                →
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {generateCalendarDays().map((day, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={day === null}
                  onClick={() => {
                    if (day) {
                      const current = selectedDate || new Date();
                      handleDateChange(new Date(current.getFullYear(), current.getMonth(), day));
                    }
                  }}
                  className={cn(
                    'w-8 h-8 text-sm rounded-lg',
                    day === null && 'invisible',
                    day !== null && 'hover:bg-gray-100',
                    selectedDate?.getDate() === day && 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Time selection */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <Clock className="w-4 h-4 text-gray-400" />
              <select
                value={selectedDate?.getHours() ?? 12}
                onChange={(e) => handleTimeChange(parseInt(e.target.value), selectedDate?.getMinutes() ?? 0)}
                className="px-2 py-1 text-sm border border-gray-200 rounded bg-white"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={selectedDate?.getMinutes() ?? 0}
                onChange={(e) => handleTimeChange(selectedDate?.getHours() ?? 12, parseInt(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-200 rounded bg-white"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
