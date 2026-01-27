import { useState, useEffect } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import type { DateRange } from '@/types';
import 'react-day-picker/style.css';

// Type for react-day-picker v9's internal range format
type DayPickerRange = { from: Date | undefined; to?: Date | undefined };

interface CustomCalendarProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onCancel: () => void;
  onApply: () => void;
}

export function CustomCalendar({ value, onChange, onCancel, onApply }: CustomCalendarProps) {
  const [month, setMonth] = useState(value?.start || new Date());
  const [numberOfMonths, setNumberOfMonths] = useState(2);

  // Internal range state for react-day-picker
  const [range, setRange] = useState<DayPickerRange | undefined>(
    value ? { from: value.start, to: value.end } : undefined
  );

  // Get default class names from react-day-picker v9
  const defaultClassNames = getDefaultClassNames();

  // Check available width and adjust number of months
  useEffect(() => {
    const checkWidth = () => {
      setNumberOfMonths(window.innerWidth > 768 ? 2 : 1);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Sync internal state with external value when value changes from outside
  useEffect(() => {
    if (value) {
      setRange({ from: value.start, to: value.end });
    }
  }, [value]);

  // Handle range selection from DayPicker
  const handleRangeSelect = (newRange: DayPickerRange | undefined) => {
    setRange(newRange);

    if (newRange?.from) {
      onChange({
        start: newRange.from,
        end: newRange.to || newRange.from,
      });
    }
  };

  const formatDateDisplay = (date: Date | undefined) => {
    return date ? format(date, "dd MMM yy", { locale: es }) : '-- --- --';
  };

  // Determine if we're selecting start or end
  const isSelectingEnd = range?.from && !range?.to;

  return (
    <div className="p-3 border-t border-gray-200">
      {/* Selected range display */}
      <div className="flex items-center justify-center gap-2 mb-2 text-xs">
        <span className={cn(
          "px-2 py-1 rounded font-medium",
          !isSelectingEnd ? "bg-primary-100 text-primary-700" : "bg-gray-100"
        )}>
          {formatDateDisplay(range?.from)}
        </span>
        <span className="text-gray-400">—</span>
        <span className={cn(
          "px-2 py-1 rounded font-medium",
          isSelectingEnd ? "bg-primary-100 text-primary-700" : "bg-gray-100"
        )}>
          {formatDateDisplay(range?.to)}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-gray-500 text-center mb-2">
        {isSelectingEnd ? 'Ahora selecciona fecha de fin' : 'Selecciona fecha de inicio'}
      </p>

      {/* Calendar - react-day-picker v9 with custom styles */}
      <style>{`
        .rdp-custom {
          --rdp-accent-color: #095789;
          --rdp-accent-background-color: #e8f4fa;
          --rdp-range_start-color: white;
          --rdp-range_start-background: #095789;
          --rdp-range_end-color: white;
          --rdp-range_end-background: #095789;
          --rdp-range_middle-color: #095789;
          --rdp-range_middle-background-color: #e8f4fa;
          --rdp-selected-color: white;
          --rdp-selected-background: #095789;
          --rdp-day-height: 32px;
          --rdp-day-width: 32px;
          font-size: 13px;
        }
        .rdp-custom .rdp-day {
          border-radius: 0;
        }
        .rdp-custom .rdp-range_start .rdp-day_button {
          background-color: #095789;
          color: white;
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
        }
        .rdp-custom .rdp-range_end .rdp-day_button {
          background-color: #095789;
          color: white;
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
        }
        .rdp-custom .rdp-range_middle {
          background-color: #e8f4fa;
        }
        .rdp-custom .rdp-range_middle .rdp-day_button {
          color: #095789;
        }
        .rdp-custom .rdp-today .rdp-day_button {
          font-weight: 600;
          border: 2px solid #fbbf24;
        }
        .rdp-custom .rdp-day_button:hover:not(.rdp-selected) {
          background-color: #f3f4f6;
        }
        .rdp-custom .rdp-selected .rdp-day_button {
          background-color: #095789;
          color: white;
        }
        .rdp-custom .rdp-outside .rdp-day_button {
          color: #9ca3af;
          opacity: 0.5;
        }
        .rdp-custom .rdp-nav button {
          color: #6b7280;
        }
        .rdp-custom .rdp-nav button:hover {
          background-color: #f3f4f6;
        }
        .rdp-custom .rdp-caption_label {
          font-weight: 600;
          font-size: 13px;
        }
        .rdp-custom .rdp-weekday {
          font-size: 11px;
          color: #6b7280;
        }
      `}</style>

      <div className="flex justify-center overflow-x-auto">
        <DayPicker
          className="rdp-custom"
          mode="range"
          selected={range}
          onSelect={handleRangeSelect}
          month={month}
          onMonthChange={setMonth}
          locale={es}
          weekStartsOn={1}
          numberOfMonths={numberOfMonths}
          showOutsideDays
          classNames={{
            ...defaultClassNames,
            months: `${defaultClassNames.months} flex gap-4`,
            month: `${defaultClassNames.month}`,
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!range?.from || !range?.to}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded transition-colors',
            range?.from && range?.to
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
