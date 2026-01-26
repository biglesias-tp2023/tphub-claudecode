import { useMemo } from 'react';
import { Cloud, Flag, Trophy, Tv, ShoppingBag, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/utils/cn';
import { CampaignEvent, CampaignEventCompact } from './CampaignEvent';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast, EventCategory } from '@/types';

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weather?: WeatherForecast;
  onCampaignClick?: (campaign: PromotionalCampaign) => void;
  onDayClick?: (date: Date, campaigns: PromotionalCampaign[], events: CalendarEvent[]) => void;
}

// Helper to get Lucide icon by name
function getIcon(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || Cloud;
}

// Event category icons and colors
const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; color: string; bgColor: string }> = {
  holiday: { icon: Flag, color: 'text-red-600', bgColor: 'bg-red-100' },
  sports: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  entertainment: { icon: Tv, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  commercial: { icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

const MAX_VISIBLE_CAMPAIGNS = 2;

export function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  campaigns,
  events,
  weather,
  onCampaignClick,
  onDayClick,
}: CalendarDayProps) {
  const dayNumber = date.getDate();
  const visibleCampaigns = campaigns.slice(0, MAX_VISIBLE_CAMPAIGNS);
  const hiddenCount = campaigns.length - MAX_VISIBLE_CAMPAIGNS;

  // Check if this day is in the past
  const isPast = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  }, [date]);

  // Check if campaigns span multiple days
  const getCampaignDayInfo = (campaign: PromotionalCampaign) => {
    const dateStr = date.toISOString().split('T')[0];
    const isStart = campaign.startDate === dateStr;
    const isEnd = campaign.endDate === dateStr;
    const isMultiDay = campaign.startDate !== campaign.endDate;
    return { isStart, isEnd, isMultiDay };
  };

  // Group events by category for display
  const hasHoliday = events.some(e => e.category === 'holiday');

  return (
    <div
      className={cn(
        'min-h-[100px] p-1.5 border-b border-r border-gray-200',
        'transition-colors cursor-pointer relative',
        // Past days - grayed out
        isPast && 'bg-gray-100',
        // Not current month and not past
        !isCurrentMonth && !isPast && 'bg-gray-50',
        // Current month, not past - normal
        isCurrentMonth && !isPast && 'bg-white hover:bg-gray-50',
        // Past days hover
        isPast && 'hover:bg-gray-200/60',
        // Holiday highlight (subtle)
        hasHoliday && !isPast && 'bg-red-50/30',
      )}
      onClick={() => onDayClick?.(date, campaigns, events)}
    >
      {/* Day header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'w-7 h-7 flex items-center justify-center text-sm font-medium rounded-full',
              // Past days text
              isPast && 'text-gray-400',
              // Not current month
              !isCurrentMonth && !isPast && 'text-gray-400',
              // Today
              isToday && 'bg-gray-900 text-white',
              // Current month, not past, not today
              isCurrentMonth && !isPast && !isToday && 'text-gray-900',
            )}
          >
            {dayNumber}
          </span>

          {/* Event category icons */}
          {events.length > 0 && (
            <div className="flex items-center gap-0.5">
              {/* Show unique category icons */}
              {Array.from(new Set(events.map(e => e.category))).map(category => {
                const config = EVENT_CATEGORY_CONFIG[category];
                const Icon = config.icon;
                const categoryEvents = events.filter(e => e.category === category);
                return (
                  <div
                    key={category}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center',
                      config.bgColor,
                      isPast && 'opacity-50'
                    )}
                    title={categoryEvents.map(e => e.name).join(', ')}
                  >
                    <Icon className={cn('w-3 h-3', config.color)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weather icon in top-right corner */}
        {weather && (() => {
          const WeatherIcon = getIcon(weather.icon);
          const isHistorical = weather.isHistorical === true;
          return (
            <div
              className={cn(
                'flex items-center gap-0.5',
                isPast && 'opacity-60'
              )}
              title={`${weather.description} - ${Math.round(weather.temperatureMax)}°/${Math.round(weather.temperatureMin)}°${isHistorical ? ' (dato real)' : ' (pronóstico)'}`}
            >
              <div className="relative">
                <WeatherIcon className={cn(
                  'w-4 h-4',
                  weather.icon === 'Sun' && 'text-amber-500',
                  weather.icon === 'CloudSun' && 'text-amber-400',
                  weather.icon === 'Cloud' && 'text-gray-400',
                  weather.icon === 'CloudRain' && 'text-blue-500',
                  weather.icon === 'CloudDrizzle' && 'text-blue-400',
                  weather.icon === 'CloudSnow' && 'text-blue-300',
                  weather.icon === 'CloudLightning' && 'text-purple-500',
                  weather.icon === 'CloudRainWind' && 'text-blue-600',
                  weather.icon === 'CloudFog' && 'text-gray-400',
                  isPast && 'opacity-60',
                )} />
                {/* Small dot to indicate historical (real) data */}
                {isHistorical && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                )}
              </div>
              <span className={cn(
                'text-xs',
                isPast ? 'text-gray-400' : 'text-gray-500'
              )}>
                {Math.round(weather.temperatureMax)}°
              </span>
            </div>
          );
        })()}
      </div>

      {/* Holiday/Event name (if holiday, show prominently) */}
      {hasHoliday && (
        <div
          className={cn(
            'text-xs font-medium truncate mb-1 px-1.5 py-0.5 rounded',
            'bg-red-100 text-red-700',
            isPast && 'opacity-60'
          )}
          title={events.find(e => e.category === 'holiday')?.name}
        >
          {events.find(e => e.category === 'holiday')?.name}
        </div>
      )}

      {/* Campaigns */}
      <div className="space-y-0.5">
        {visibleCampaigns.map(campaign => {
          const { isStart, isEnd, isMultiDay } = getCampaignDayInfo(campaign);
          return (
            <CampaignEvent
              key={campaign.id}
              campaign={campaign}
              isStart={isStart}
              isEnd={isEnd}
              isMultiDay={isMultiDay}
              isPast={isPast}
              onClick={() => onCampaignClick?.(campaign)}
            />
          );
        })}

        {/* Show count of hidden campaigns */}
        {hiddenCount > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5">
            <span className={cn(
              'text-xs',
              isPast ? 'text-gray-400' : 'text-gray-500'
            )}>
              +{hiddenCount} más
            </span>
            <div className="flex gap-0.5">
              {campaigns.slice(MAX_VISIBLE_CAMPAIGNS, MAX_VISIBLE_CAMPAIGNS + 3).map(campaign => (
                <CampaignEventCompact
                  key={campaign.id}
                  campaign={campaign}
                  isPast={isPast}
                  onClick={() => onCampaignClick?.(campaign)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
