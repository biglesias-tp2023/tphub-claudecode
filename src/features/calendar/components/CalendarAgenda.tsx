/**
 * Calendar Agenda View
 *
 * List view showing upcoming campaigns + events sorted by date, grouped by day.
 * Also shows revenue per day.
 */

import { useMemo } from 'react';
import { Calendar, Flag, Trophy, Tv, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { DailyRevenueIndicator } from './DailyRevenueIndicator';
import type { PromotionalCampaign, CalendarEvent, EventCategory } from '@/types';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';

interface CalendarAgendaProps {
  year: number;
  month: number;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  revenueByDate?: Map<string, DailyChannelRevenue>;
  onCampaignClick?: (campaign: PromotionalCampaign) => void;
}

const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; color: string; bgColor: string }> = {
  holiday: { icon: Flag, color: 'text-red-600', bgColor: 'bg-red-100' },
  sports: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  entertainment: { icon: Tv, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  commercial: { icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

const WEEKDAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DayGroup {
  dateStr: string;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  revenue?: DailyChannelRevenue;
}

export function CalendarAgenda({
  year,
  month,
  campaigns,
  events,
  revenueByDate = new Map(),
  onCampaignClick,
}: CalendarAgendaProps) {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Group items by date
  const dayGroups = useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate();
    const groups: DayGroup[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(dateStr + 'T00:00:00');

      const dayCampaigns = campaigns.filter(c =>
        c.startDate <= dateStr && c.endDate >= dateStr
      );
      const dayEvents = events.filter(e => {
        if (e.endDate) return e.eventDate <= dateStr && e.endDate >= dateStr;
        return e.eventDate === dateStr;
      });

      if (dayCampaigns.length > 0 || dayEvents.length > 0) {
        groups.push({
          dateStr,
          date,
          isToday: dateStr === todayStr,
          isPast: dateStr < todayStr,
          campaigns: dayCampaigns,
          events: dayEvents,
          revenue: revenueByDate.get(dateStr),
        });
      }
    }

    return groups;
  }, [year, month, campaigns, events, todayStr, revenueByDate]);

  if (dayGroups.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No hay campañas ni eventos en {MONTH_NAMES[month - 1]} {year}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {dayGroups.map((group) => (
          <div
            key={group.dateStr}
            className={cn(
              'flex gap-4 px-4 py-3',
              group.isToday && 'bg-primary-50/30',
              group.isPast && 'opacity-70',
            )}
          >
            {/* Date column */}
            <div className="w-16 shrink-0 text-center">
              <div className="text-xs font-medium text-gray-500 uppercase">
                {WEEKDAY_NAMES_FULL[group.date.getDay()].slice(0, 3)}
              </div>
              <div className={cn(
                'text-2xl font-bold mt-0.5',
                group.isToday ? 'text-primary-600' : group.isPast ? 'text-gray-400' : 'text-gray-900'
              )}>
                {group.date.getDate()}
              </div>
              {/* Revenue */}
              {group.revenue && group.revenue.total > 0 && (
                <div className="mt-1">
                  <DailyRevenueIndicator revenue={group.revenue} isPast={group.isPast} />
                </div>
              )}
            </div>

            {/* Items column */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {/* Events */}
              {group.events.map(event => {
                const config = EVENT_CATEGORY_CONFIG[event.category];
                const Icon = config.icon;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                      config.bgColor, config.color
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate font-medium">{event.name}</span>
                  </div>
                );
              })}

              {/* Campaigns */}
              {group.campaigns.map(campaign => {
                const platform = PLATFORMS[campaign.platform];
                const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);
                const displayText = campaign.name || typeConfig?.label || campaign.campaignType;
                const isActive = campaign.status === 'active';

                return (
                  <button
                    key={campaign.id}
                    onClick={() => onCampaignClick?.(campaign)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      'hover:opacity-80'
                    )}
                    style={{
                      backgroundColor: group.isPast ? '#f3f4f6' : platform.color + '15',
                      borderLeft: `3px solid ${group.isPast ? '#9ca3af' : platform.color}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: group.isPast ? '#9ca3af' : platform.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{displayText}</span>
                      <span className="text-xs text-gray-500">
                        {platform.name}
                        {campaign.config.startTime && ` · ${campaign.config.startTime}`}
                      </span>
                    </div>
                    {isActive && !group.isPast && (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
