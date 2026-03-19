/**
 * Calendar Week View
 *
 * 7-day horizontal view with:
 * - Day header with day name, number, and weather
 * - All-day section: multi-day campaigns, objectives, holidays
 * - Hourly grid (09:00-23:00): campaigns with start time positioned vertically
 * - Current time indicator (red line)
 * - Daily revenue per channel
 * - Drag-to-create
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import { Flag, Trophy, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { computeCampaignLayout } from '../utils/campaignLayout';
import { formatLocalDate, getMondayOfWeek } from '../utils/dateHelpers';
import { DailyRevenueIndicator } from './DailyRevenueIndicator';
import { CampaignPopover } from './CampaignPopover';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast, EventCategory } from '@/types';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';
import type { CalendarObjectiveItem } from '../hooks/useCalendarObjectives';

// ============================================
// TYPES
// ============================================

interface CalendarWeekProps {
  year: number;
  month: number;
  day: number;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
  revenueByDate?: Map<string, DailyChannelRevenue>;
  objectives?: CalendarObjectiveItem[];
  onCampaignClick?: (campaign: PromotionalCampaign) => void;
  onDayClick?: (date: Date, campaigns: PromotionalCampaign[], events: CalendarEvent[]) => void;
  onEditCampaign?: (campaign: PromotionalCampaign) => void;
  onDeleteCampaign?: (campaign: PromotionalCampaign) => void;
  onDuplicateCampaign?: (campaign: PromotionalCampaign) => void;
  onCreateCampaign?: (startDate: string, endDate: string) => void;
  isClientMode?: boolean;
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  events: CalendarEvent[];
}

// ============================================
// CONSTANTS
// ============================================

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const START_HOUR = 9;
const END_HOUR = 23;
const HOUR_HEIGHT = 48; // px per hour

const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; color: string; bgColor: string }> = {
  holiday: { icon: Flag, color: 'text-red-600', bgColor: 'bg-red-100' },
  sports: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  entertainment: { icon: Flag, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  commercial: { icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

// ============================================
// HELPERS
// ============================================

function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter(event => {
    if (event.endDate) {
      return event.eventDate <= dateStr && event.endDate >= dateStr;
    }
    return event.eventDate === dateStr;
  });
}

// ============================================
// COMPONENT
// ============================================

export function CalendarWeek({
  year,
  month,
  day,
  campaigns,
  events,
  weatherForecasts: _weatherForecasts = [],
  revenueByDate = new Map(),
  objectives = [],
  onDayClick,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onCreateCampaign,
  isClientMode = false,
}: CalendarWeekProps) {
  void _weatherForecasts;
  const [selectedCampaign, setSelectedCampaign] = useState<PromotionalCampaign | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate week days
  const weekDays = useMemo(() => {
    const baseDate = new Date(year, month - 1, day);
    const monday = getMondayOfWeek(baseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatLocalDate(today);

    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = formatLocalDate(date);

      days.push({
        date,
        dateStr,
        dayName: WEEKDAY_NAMES[i],
        dayNumber: date.getDate(),
        isToday: dateStr === todayStr,
        isPast: date < today,
        events: getEventsForDate(events, dateStr),
      });
    }
    return days;
  }, [year, month, day, events]);

  const weekDateStrings = useMemo(() => weekDays.map(d => d.dateStr), [weekDays]);

  // Get campaigns for this week
  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  const weekCampaigns = useMemo(
    () => campaigns.filter(c => c.startDate <= weekEnd && c.endDate >= weekStart),
    [campaigns, weekStart, weekEnd]
  );

  // Split into all-day and timed campaigns
  const allDayCampaigns = useMemo(
    () => weekCampaigns.filter(c => !c.config.startTime),
    [weekCampaigns]
  );

  const timedCampaigns = useMemo(
    () => weekCampaigns.filter(c => c.config.startTime),
    [weekCampaigns]
  );

  // All-day campaign layout
  const allDayLayout = useMemo(
    () => computeCampaignLayout(allDayCampaigns, weekDateStrings),
    [allDayCampaigns, weekDateStrings]
  );

  const allDayMaxRows = useMemo(
    () => Math.max(1, ...allDayLayout.map(l => l.row + 1)),
    [allDayLayout]
  );

  // Objectives are available via props for future hourly grid rendering
  void objectives;

  // Current time position
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (currentHour < START_HOUR || currentHour >= END_HOUR) return null;
    return ((currentHour - START_HOUR) + currentMinute / 60) * HOUR_HEIGHT;
  }, []);

  const handleCampaignClick = useCallback((campaign: PromotionalCampaign, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setSelectedCampaign(campaign);
    setPopoverAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  }, []);

  const handleClosePopover = useCallback(() => {
    setSelectedCampaign(null);
    setPopoverAnchor(null);
  }, []);

  const handleDayClick = useCallback((dayIndex: number) => {
    if (isClientMode) return;
    const dayData = weekDays[dayIndex];
    const dayCampaigns = weekCampaigns.filter(c =>
      c.startDate <= dayData.dateStr && c.endDate >= dayData.dateStr
    );
    onDayClick?.(dayData.date, dayCampaigns, dayData.events);
  }, [weekDays, weekCampaigns, onDayClick, isClientMode]);

  const handleMouseDown = useCallback((dayIndex: number, e: React.MouseEvent) => {
    if (isClientMode) return;
    e.preventDefault();
    setDragStart(dayIndex);
    setDragEnd(dayIndex);
  }, [isClientMode]);

  const handleMouseEnter = useCallback((dayIndex: number) => {
    if (dragStart !== null) {
      setDragEnd(dayIndex);
    }
  }, [dragStart]);

  const handleMouseUp = useCallback(() => {
    if (dragStart !== null && dragEnd !== null && !isClientMode) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      if (start !== end && onCreateCampaign) {
        onCreateCampaign(weekDays[start].dateStr, weekDays[end].dateStr);
      }
    }
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, weekDays, onCreateCampaign, isClientMode]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Week header with days */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
        <div /> {/* Time gutter spacer */}
        {weekDays.map((dayData) => (
          <div
            key={dayData.dateStr}
            className={cn(
              'px-2 py-2 text-center border-l border-gray-200',
              dayData.isToday && 'bg-primary-50'
            )}
          >
            <div className="text-xs font-medium text-gray-500 uppercase">{dayData.dayName}</div>
            <div className={cn(
              'mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full text-lg font-semibold',
              dayData.isToday ? 'bg-primary-600 text-white' : dayData.isPast ? 'text-gray-400' : 'text-gray-900'
            )}>
              {dayData.dayNumber}
            </div>
            {/* Revenue */}
            {revenueByDate.has(dayData.dateStr) && (
              <div className="mt-1 flex justify-center">
                <DailyRevenueIndicator
                  revenue={revenueByDate.get(dayData.dateStr)!}
                  isPast={dayData.isPast}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* All-day section (expandable) */}
      <div className="border-b border-gray-200">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="px-1 py-1 text-[10px] text-gray-400 text-right">todo el día</div>
          <div className="col-span-7 relative" style={{ minHeight: `${allDayMaxRows * 24 + 8}px` }}>
            <div className="absolute inset-0 grid grid-cols-7">
              {weekDays.map((dayData) => (
                <div key={`allday-bg-${dayData.dateStr}`} className={cn(
                  'border-l border-gray-100',
                  dayData.isToday && 'bg-primary-50/20'
                )} />
              ))}
            </div>

            {/* All-day campaigns */}
            {allDayLayout.map((item) => {
              const { campaign, startCol, endCol, row } = item;
              const platform = PLATFORMS[campaign.platform];
              const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);
              const displayText = campaign.name || typeConfig?.label || campaign.campaignType;
              const isPast = campaign.endDate < formatLocalDate(new Date());
              const isStartInWeek = campaign.startDate >= weekStart;
              const isEndInWeek = campaign.endDate <= weekEnd;

              return (
                <button
                  key={campaign.id}
                  className={cn(
                    'absolute h-[20px] z-10 text-left text-[11px] font-medium truncate',
                    'flex items-center gap-1 px-1.5 rounded-sm',
                    !isStartInWeek && 'rounded-l-none',
                    !isEndInWeek && 'rounded-r-none',
                    isPast && 'opacity-50',
                  )}
                  style={{
                    left: `calc(${(startCol / 7) * 100}% + 2px)`,
                    width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`,
                    top: `${row * 24 + 4}px`,
                    backgroundColor: isPast ? '#e5e7eb' : platform.color + '25',
                    borderLeft: isStartInWeek ? `3px solid ${isPast ? '#9ca3af' : platform.color}` : undefined,
                  }}
                  onClick={(e) => handleCampaignClick(campaign, e)}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isPast ? '#9ca3af' : platform.color }} />
                  <span className="truncate">{displayText}</span>
                </button>
              );
            })}

            {/* Events in all-day */}
            {weekDays.map((dayData, i) => (
              dayData.events.slice(0, 2).map(event => {
                const config = EVENT_CATEGORY_CONFIG[event.category];
                const Icon = config.icon;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'absolute flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate',
                      config.bgColor, config.color
                    )}
                    style={{
                      left: `calc(${(i / 7) * 100}% + 2px)`,
                      width: `calc(${(1 / 7) * 100}% - 4px)`,
                      bottom: '2px',
                    }}
                    title={event.name}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{event.name}</span>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>

      {/* Hourly grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto relative"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative">
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div
                key={i}
                className="absolute w-full text-right pr-2 text-xs text-gray-400"
                style={{ top: `${i * HOUR_HEIGHT - 6}px` }}
              >
                {String(START_HOUR + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((dayData, i) => {
            const isInDragRange = dragStart !== null && dragEnd !== null &&
              i >= Math.min(dragStart, dragEnd) && i <= Math.max(dragStart, dragEnd);

            return (
              <div
                key={`col-${dayData.dateStr}`}
                className={cn(
                  'relative border-l border-gray-100',
                  dayData.isToday && 'bg-primary-50/10',
                  dayData.isPast && !dayData.isToday && 'bg-gray-50/30',
                  isInDragRange && 'bg-primary-100/50',
                  !isClientMode && 'cursor-pointer hover:bg-gray-50/50'
                )}
                onClick={() => handleDayClick(i)}
                onMouseDown={(e) => handleMouseDown(i, e)}
                onMouseEnter={() => handleMouseEnter(i)}
              >
                {/* Hour lines */}
                {Array.from({ length: END_HOUR - START_HOUR }, (_, h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: `${h * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Timed campaigns */}
                {timedCampaigns
                  .filter(c => c.startDate <= dayData.dateStr && c.endDate >= dayData.dateStr)
                  .map(campaign => {
                    const platform = PLATFORMS[campaign.platform];
                    const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);
                    const displayText = campaign.name || typeConfig?.label || campaign.campaignType;

                    // Parse start time
                    const [hours, minutes] = (campaign.config.startTime || '12:00').split(':').map(Number);
                    const duration = campaign.config.duration || 60;
                    const topOffset = ((hours - START_HOUR) + (minutes || 0) / 60) * HOUR_HEIGHT;
                    const height = (duration / 60) * HOUR_HEIGHT;

                    if (topOffset < 0 || topOffset >= (END_HOUR - START_HOUR) * HOUR_HEIGHT) return null;

                    return (
                      <button
                        key={campaign.id}
                        className={cn(
                          'absolute left-1 right-1 z-10 rounded-md text-left text-[11px] font-medium',
                          'px-2 py-1 overflow-hidden truncate transition-all',
                        )}
                        style={{
                          top: `${topOffset}px`,
                          height: `${Math.max(height, 24)}px`,
                          backgroundColor: platform.color + '30',
                          borderLeft: `3px solid ${platform.color}`,
                        }}
                        onClick={(e) => handleCampaignClick(campaign, e)}
                      >
                        <span className="truncate">{displayText}</span>
                        <div className="text-[9px] opacity-70">{campaign.config.startTime}</div>
                      </button>
                    );
                  })}
              </div>
            );
          })}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-[60px] right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {weekCampaigns.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400">
              {isClientMode
                ? 'No hay campañas esta semana'
                : 'Arrastra para crear una campaña o haz clic en un día'}
            </p>
          </div>
        )}
      </div>

      {/* Campaign popover */}
      {selectedCampaign && popoverAnchor && (
        <CampaignPopover
          campaign={selectedCampaign}
          anchor={popoverAnchor}
          onClose={handleClosePopover}
          onEdit={isClientMode ? undefined : onEditCampaign}
          onDelete={isClientMode ? undefined : onDeleteCampaign}
          onDuplicate={isClientMode ? undefined : onDuplicateCampaign}
          isClientMode={isClientMode}
        />
      )}
    </div>
  );
}
