/**
 * Month Day Cell
 *
 * Simplified day cell for the month view. Only renders day-level content:
 * day number, weather, revenue, event indicators.
 * Campaign bars are NOT rendered here — they're at the MonthWeekRow level
 * for proper multi-day spanning across columns.
 */

import { memo, useMemo } from 'react';
import { Cloud, Flag, Trophy, Tv, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveIcon } from '@/utils/iconResolver';
import type { CalendarEvent, WeatherForecast, EventCategory } from '@/types';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';

function formatCompactRevenue(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return Math.round(amount).toString();
}

interface MonthDayCellProps {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  events: CalendarEvent[];
  weather?: WeatherForecast;
  revenue?: DailyChannelRevenue;
  overflowCount?: number; // "+N más" for campaigns that don't fit
  isDragTarget?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; color: string; bgColor: string }> = {
  holiday: { icon: Flag, color: 'text-red-600', bgColor: 'bg-red-100' },
  sports: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  entertainment: { icon: Tv, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  commercial: { icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

function arePropsEqual(prev: MonthDayCellProps, next: MonthDayCellProps): boolean {
  return (
    prev.dateStr === next.dateStr &&
    prev.isCurrentMonth === next.isCurrentMonth &&
    prev.isToday === next.isToday &&
    prev.isPast === next.isPast &&
    prev.events === next.events &&
    prev.weather === next.weather &&
    prev.revenue === next.revenue &&
    prev.overflowCount === next.overflowCount &&
    prev.isDragTarget === next.isDragTarget
  );
}

export const MonthDayCell = memo(function MonthDayCell({
  dayNumber,
  isCurrentMonth,
  isToday,
  isPast,
  events,
  weather,
  revenue,
  overflowCount = 0,
  isDragTarget = false,
  onMouseDown,
  onMouseEnter,
  onClick,
}: MonthDayCellProps) {
  const hasHoliday = events.some(e => e.category === 'holiday');

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(events.map(e => e.category)));
  }, [events]);

  return (
    <div
      className={cn(
        'relative min-h-[100px] p-1 border-b border-r border-gray-200',
        'transition-colors cursor-pointer',
        isPast && 'bg-gray-50/80',
        !isCurrentMonth && !isPast && 'bg-gray-50/50',
        isCurrentMonth && !isPast && 'bg-white hover:bg-gray-50/50',
        isPast && 'hover:bg-gray-100/60',
        hasHoliday && !isPast && 'bg-red-50/20',
        isDragTarget && 'bg-primary-100/50',
      )}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Day header */}
      <div className="flex items-start justify-between mb-0.5">
        <div className="flex items-center gap-0.5">
          <span
            className={cn(
              'w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full',
              isPast && 'text-gray-400',
              !isCurrentMonth && !isPast && 'text-gray-400',
              isToday && 'bg-primary-600 text-white',
              isCurrentMonth && !isPast && !isToday && 'text-gray-900',
            )}
          >
            {dayNumber}
          </span>

          {/* Event category icons */}
          {uniqueCategories.length > 0 && (
            <div className="flex items-center gap-0.5">
              {uniqueCategories.map(category => {
                const config = EVENT_CATEGORY_CONFIG[category];
                const Icon = config.icon;
                const categoryEvents = events.filter(e => e.category === category);
                return (
                  <div
                    key={category}
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center',
                      config.bgColor,
                      isPast && 'opacity-50'
                    )}
                    title={categoryEvents.map(e => e.name).join(', ')}
                  >
                    <Icon className={cn('w-2.5 h-2.5', config.color)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weather */}
        {weather && (() => {
          const WeatherIcon = resolveIcon(weather.icon, Cloud);
          return (
            <div
              className={cn('flex items-center gap-0.5', isPast && 'opacity-50')}
              title={`${weather.description} - ${Math.round(weather.temperatureMax)}°/${Math.round(weather.temperatureMin)}°`}
            >
              <WeatherIcon className={cn(
                'w-3.5 h-3.5',
                weather.icon === 'Sun' && 'text-amber-500',
                weather.icon === 'CloudSun' && 'text-amber-400',
                weather.icon === 'Cloud' && 'text-gray-400',
                weather.icon === 'CloudRain' && 'text-blue-500',
                weather.icon === 'CloudSnow' && 'text-blue-300',
                weather.icon === 'CloudLightning' && 'text-purple-500',
              )} />
              <span className={cn('text-[10px]', isPast ? 'text-gray-400' : 'text-gray-500')}>
                {Math.round(weather.temperatureMax)}°
              </span>
            </div>
          );
        })()}
      </div>

      {/* Holiday name */}
      {hasHoliday && (
        <div
          className={cn(
            'text-[10px] font-medium truncate mb-0.5 px-1 py-0.5 rounded',
            'bg-red-100 text-red-700',
            isPast && 'opacity-50'
          )}
          title={events.find(e => e.category === 'holiday')?.name}
        >
          {events.find(e => e.category === 'holiday')?.name}
        </div>
      )}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div className={cn(
          'text-[10px] font-medium px-1',
          isPast ? 'text-gray-400' : 'text-primary-600'
        )}>
          +{overflowCount} más
        </div>
      )}

      {/* Revenue by channel (bottom of cell) */}
      {isCurrentMonth && (
        <div className="absolute bottom-1 left-1 right-1">
          <div className="flex items-center justify-between gap-0.5">
            {/* Glovo (left) */}
            <span className={cn('flex items-center gap-0.5 text-[9px] leading-none', isPast ? 'text-gray-500' : 'text-gray-300')}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isPast ? 'bg-amber-400' : 'bg-amber-300')} />
              {isPast
                ? <span>{revenue && revenue.glovo > 0 ? `${formatCompactRevenue(revenue.glovo)}€` : '0€'}</span>
                : <span>- €</span>
              }
            </span>
            {/* UberEats (right) */}
            <span className={cn('flex items-center gap-0.5 text-[9px] leading-none', isPast ? 'text-gray-500' : 'text-gray-300')}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isPast ? 'bg-green-600' : 'bg-green-300')} />
              {isPast
                ? <span>{revenue && revenue.ubereats > 0 ? `${formatCompactRevenue(revenue.ubereats)}€` : '0€'}</span>
                : <span>- €</span>
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}, arePropsEqual);
