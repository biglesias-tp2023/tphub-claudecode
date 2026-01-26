import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CalendarEvent, WeatherForecast } from '@/types';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  upcomingEvents?: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  upcomingEvents = [],
}: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = startDate ? new Date(startDate) : new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Generate calendar days for current and next month
  const calendarMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 2; i++) {
      const monthDate = new Date(currentMonth.year, currentMonth.month + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      let dayOfWeek = firstDay.getDay();
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

      // Previous month days
      const prevMonthLastDay = new Date(year, month, 0);
      for (let j = dayOfWeek - 1; j >= 0; j--) {
        const d = new Date(year, month - 1, prevMonthLastDay.getDate() - j);
        days.push({
          date: d.toISOString().split('T')[0],
          day: d.getDate(),
          isCurrentMonth: false,
        });
      }

      // Current month days
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(year, month, day);
        days.push({
          date: d.toISOString().split('T')[0],
          day,
          isCurrentMonth: true,
        });
      }

      // Next month days
      const remaining = 42 - days.length;
      for (let day = 1; day <= remaining; day++) {
        const d = new Date(year, month + 1, day);
        days.push({
          date: d.toISOString().split('T')[0],
          day,
          isCurrentMonth: false,
        });
      }

      months.push({
        year,
        month,
        label: `${MONTHS[month]} ${year}`,
        days,
      });
    }
    return months;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (dateStr < todayStr) return; // Don't allow past dates

    if (selectionMode === 'start') {
      onStartDateChange(dateStr);
      onEndDateChange(dateStr);
      setSelectionMode('end');
    } else {
      if (dateStr < startDate) {
        // If clicked before start, make it the new start
        onStartDateChange(dateStr);
        onEndDateChange(startDate);
      } else {
        onEndDateChange(dateStr);
      }
      setSelectionMode('start');
    }
  };

  const isInRange = (dateStr: string) => {
    if (!startDate) return false;

    const effectiveEnd = selectionMode === 'end' && hoverDate && hoverDate > startDate
      ? hoverDate
      : endDate;

    return dateStr >= startDate && dateStr <= effectiveEnd;
  };

  const isRangeStart = (dateStr: string) => dateStr === startDate;
  const isRangeEnd = (dateStr: string) => {
    if (selectionMode === 'end' && hoverDate && hoverDate > startDate) {
      return dateStr === hoverDate;
    }
    return dateStr === endDate;
  };

  // Events in selected range
  const eventsInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    return upcomingEvents.filter(event =>
      event.eventDate >= startDate && event.eventDate <= endDate
    );
  }, [startDate, endDate, upcomingEvents]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Fechas de la campaña</h3>
        <p className="text-sm text-gray-500">
          Haz clic en una fecha para seleccionar el inicio, luego haz clic en otra para el fin.
        </p>
      </div>

      {/* Selected range display */}
      <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-lg">
        <div className="flex-1 text-center">
          <p className="text-xs text-primary-600 font-medium mb-1">Inicio</p>
          <p className="text-lg font-semibold text-primary-900">
            {startDate ? formatDateDisplay(startDate) : '—'}
          </p>
        </div>
        <div className="w-8 h-px bg-primary-300" />
        <div className="flex-1 text-center">
          <p className="text-xs text-primary-600 font-medium mb-1">Fin</p>
          <p className="text-lg font-semibold text-primary-900">
            {endDate ? formatDateDisplay(endDate) : '—'}
          </p>
        </div>
        <div className="w-8 h-px bg-primary-300" />
        <div className="flex-1 text-center">
          <p className="text-xs text-primary-600 font-medium mb-1">Duración</p>
          <p className="text-lg font-semibold text-primary-900">
            {startDate && endDate ? calculateDuration(startDate, endDate) : '—'}
          </p>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex gap-8">
          {calendarMonths.map(m => (
            <span key={`${m.year}-${m.month}`} className="text-sm font-medium text-gray-900">
              {m.label}
            </span>
          ))}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Two-month calendar grid */}
      <div className="grid grid-cols-2 gap-8">
        {calendarMonths.map(monthData => (
          <div key={`${monthData.year}-${monthData.month}`}>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {monthData.days.map((dayData, idx) => {
                const isPast = dayData.date < todayStr;
                const isToday = dayData.date === todayStr;
                const inRange = isInRange(dayData.date);
                const isStart = isRangeStart(dayData.date);
                const isEnd = isRangeEnd(dayData.date);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleDayClick(dayData.date)}
                    onMouseEnter={() => selectionMode === 'end' && setHoverDate(dayData.date)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      'relative h-10 text-sm transition-colors',
                      // Base styles
                      !dayData.isCurrentMonth && 'text-gray-300',
                      dayData.isCurrentMonth && !isPast && 'text-gray-900',
                      // Past days
                      isPast && 'text-gray-300 cursor-not-allowed',
                      // Today
                      isToday && !inRange && 'font-bold',
                      // Hover (not past, not in range)
                      !isPast && !inRange && 'hover:bg-gray-100 rounded-lg',
                      // In range
                      inRange && !isStart && !isEnd && 'bg-primary-100',
                      // Start date
                      isStart && 'bg-primary-600 text-white rounded-l-lg',
                      // End date
                      isEnd && !isStart && 'bg-primary-600 text-white rounded-r-lg',
                      // Single day (start = end)
                      isStart && isEnd && 'rounded-lg',
                    )}
                  >
                    {dayData.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick date suggestions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Selección rápida</h4>
        <div className="flex flex-wrap gap-2">
          {getQuickDateOptions().map(option => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onStartDateChange(option.startDate);
                onEndDateChange(option.endDate);
                setSelectionMode('start');
              }}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full transition-colors',
                startDate === option.startDate && endDate === option.endDate
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events in range warning */}
      {eventsInRange.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Eventos durante este período
          </h4>
          <div className="space-y-2">
            {eventsInRange.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm"
              >
                <span className="font-medium">{event.name}</span>
                <span className="text-gray-500">— {formatDateDisplay(event.eventDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays === 1) return '1 día';
  if (diffDays <= 7) return `${diffDays} días`;
  return `${diffDays} días`;
}

function getQuickDateOptions(): { label: string; startDate: string; endDate: string }[] {
  const today = new Date();

  const addDays = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const getNextWeekend = () => {
    const date = new Date(today);
    const dayOfWeek = date.getDay();
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek) || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    return date.toISOString().split('T')[0];
  };

  return [
    { label: 'Hoy', startDate: addDays(0), endDate: addDays(0) },
    { label: 'Mañana', startDate: addDays(1), endDate: addDays(1) },
    { label: 'Fin de semana', startDate: getNextWeekend(), endDate: addDays(Number(getNextWeekend().slice(-2)) - today.getDate() + 1) },
    { label: '7 días', startDate: addDays(0), endDate: addDays(6) },
    { label: '14 días', startDate: addDays(0), endDate: addDays(13) },
    { label: '30 días', startDate: addDays(0), endDate: addDays(29) },
  ];
}
