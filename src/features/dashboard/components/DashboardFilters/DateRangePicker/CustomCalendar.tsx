import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import type { DateRange } from '@/types';
import 'react-day-picker/style.css';

interface CustomCalendarProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onCancel: () => void;
  onApply: () => void;
}

export function CustomCalendar({ value, onChange, onCancel, onApply }: CustomCalendarProps) {
  const [month, setMonth] = useState(value?.start || new Date());

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      onChange({
        start: range.from,
        end: range.to || range.from,
      });
    }
  };

  const formatDateDisplay = (date: Date) => {
    return format(date, "dd MMM yy", { locale: es });
  };

  return (
    <div className="p-4 border-t border-gray-200">
      {/* Selected range display */}
      <div className="flex items-center justify-center gap-2 mb-4 text-sm">
        <span className="px-3 py-1.5 bg-gray-100 rounded-lg font-medium">
          {value?.start ? formatDateDisplay(value.start) : '-- --- --'}
        </span>
        <span className="text-gray-400">—</span>
        <span className="px-3 py-1.5 bg-gray-100 rounded-lg font-medium">
          {value?.end ? formatDateDisplay(value.end) : '-- --- --'}
        </span>
      </div>

      {/* Dual Calendar */}
      <div className="flex gap-4 justify-center">
        <DayPicker
          mode="range"
          selected={value ? { from: value.start, to: value.end } : undefined}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          locale={es}
          weekStartsOn={1}
          numberOfMonths={2}
          showOutsideDays
          classNames={{
            months: 'flex gap-4',
            month: 'space-y-2',
            caption: 'flex justify-center relative items-center h-10',
            caption_label: 'text-sm font-semibold text-gray-900',
            nav: 'flex items-center gap-1',
            nav_button: cn(
              'h-7 w-7 bg-transparent p-0 text-gray-500',
              'hover:bg-gray-100 rounded-lg transition-colors',
              'inline-flex items-center justify-center'
            ),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: 'text-gray-500 rounded-md w-9 font-normal text-xs',
            row: 'flex w-full mt-1',
            cell: cn(
              'relative p-0 text-center text-sm',
              'focus-within:relative focus-within:z-20',
              '[&:has([aria-selected])]:bg-primary-50',
              '[&:has([aria-selected].day-range-end)]:rounded-r-lg',
              '[&:has([aria-selected].day-range-start)]:rounded-l-lg',
              'first:[&:has([aria-selected])]:rounded-l-lg',
              'last:[&:has([aria-selected])]:rounded-r-lg'
            ),
            day: cn(
              'h-9 w-9 p-0 font-normal',
              'hover:bg-gray-100 rounded-lg transition-colors',
              'aria-selected:opacity-100'
            ),
            day_range_start: 'day-range-start bg-primary-500 text-white hover:bg-primary-600 rounded-l-lg',
            day_range_end: 'day-range-end bg-primary-500 text-white hover:bg-primary-600 rounded-r-lg',
            day_selected: 'bg-primary-500 text-white hover:bg-primary-600',
            day_today: 'bg-gray-100 text-gray-900 font-semibold',
            day_outside: 'text-gray-400 opacity-50',
            day_disabled: 'text-gray-400 opacity-50',
            day_range_middle: 'aria-selected:bg-primary-50 aria-selected:text-primary-900',
            day_hidden: 'invisible',
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!value?.start || !value?.end}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            value?.start && value?.end
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
