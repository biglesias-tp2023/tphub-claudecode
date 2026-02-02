/**
 * Calendar Week View
 *
 * Displays a 7-day horizontal view similar to Google Calendar's week view,
 * optimized for marketing campaigns with multi-day spanning blocks.
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import { Flag, Trophy, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { CampaignPopover } from './CampaignPopover';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast, EventCategory } from '@/types';

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

interface CampaignLayoutRow {
  campaign: PromotionalCampaign;
  startCol: number; // 0-6 (Monday-Sunday)
  endCol: number;   // 0-6 (Monday-Sunday)
  row: number;      // Row index for stacking
}

// ============================================
// CONSTANTS
// ============================================

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; color: string; bgColor: string }> = {
  holiday: { icon: Flag, color: 'text-red-600', bgColor: 'bg-red-100' },
  sports: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  entertainment: { icon: Flag, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  commercial: { icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

// ============================================
// HELPERS
// ============================================

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter(event => {
    if (event.endDate) {
      return event.eventDate <= dateStr && event.endDate >= dateStr;
    }
    return event.eventDate === dateStr;
  });
}

function getCampaignsForWeek(
  campaigns: PromotionalCampaign[],
  weekStart: string,
  weekEnd: string
): PromotionalCampaign[] {
  return campaigns.filter(campaign => {
    return campaign.startDate <= weekEnd && campaign.endDate >= weekStart;
  });
}

/**
 * Compute layout rows for campaigns to handle overlapping
 * Uses a greedy algorithm to assign rows without collisions
 */
function computeCampaignLayout(
  campaigns: PromotionalCampaign[],
  weekDays: WeekDay[]
): CampaignLayoutRow[] {
  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  // Map date string to column index
  const dateToCol = new Map<string, number>();
  weekDays.forEach((day, i) => dateToCol.set(day.dateStr, i));

  // Sort campaigns by start date, then by duration (longer first)
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    // Longer campaigns first for better stacking
    const durationA = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime());
    const durationB = (new Date(b.endDate).getTime() - new Date(b.startDate).getTime());
    return durationB - durationA;
  });

  const layout: CampaignLayoutRow[] = [];
  const rowOccupancy: boolean[][] = []; // rowOccupancy[row][col] = true if occupied

  for (const campaign of sortedCampaigns) {
    // Calculate start and end columns (clamped to week boundaries)
    const startCol = Math.max(0, dateToCol.get(campaign.startDate) ?? (campaign.startDate < weekStart ? 0 : 7));
    const endCol = Math.min(6, dateToCol.get(campaign.endDate) ?? (campaign.endDate > weekEnd ? 6 : -1));

    if (startCol > 6 || endCol < 0 || startCol > endCol) continue;

    // Find the first available row
    let assignedRow = 0;
    while (true) {
      if (!rowOccupancy[assignedRow]) {
        rowOccupancy[assignedRow] = new Array(7).fill(false);
      }

      let canFit = true;
      for (let col = startCol; col <= endCol; col++) {
        if (rowOccupancy[assignedRow][col]) {
          canFit = false;
          break;
        }
      }

      if (canFit) {
        // Mark columns as occupied
        for (let col = startCol; col <= endCol; col++) {
          rowOccupancy[assignedRow][col] = true;
        }
        break;
      }
      assignedRow++;
    }

    layout.push({
      campaign,
      startCol,
      endCol,
      row: assignedRow,
    });
  }

  return layout;
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
  // weatherForecasts prop available for future use
  weatherForecasts: _weatherForecasts = [],
  onDayClick,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onCreateCampaign,
  isClientMode = false,
}: CalendarWeekProps) {
  // Weather forecasts available for future use
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

  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  // Get campaigns for this week
  const weekCampaigns = useMemo(
    () => getCampaignsForWeek(campaigns, weekStart, weekEnd),
    [campaigns, weekStart, weekEnd]
  );

  // Compute campaign layout (row assignments for stacking)
  const campaignLayout = useMemo(
    () => computeCampaignLayout(weekCampaigns, weekDays),
    [weekCampaigns, weekDays]
  );

  const maxRows = useMemo(
    () => Math.max(1, ...campaignLayout.map(l => l.row + 1)),
    [campaignLayout]
  );

  // Handle campaign block click
  const handleCampaignClick = useCallback((campaign: PromotionalCampaign, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setSelectedCampaign(campaign);
    setPopoverAnchor({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
  }, []);

  const handleClosePopover = useCallback(() => {
    setSelectedCampaign(null);
    setPopoverAnchor(null);
  }, []);

  // Handle day click
  const handleDayClick = useCallback((dayIndex: number) => {
    if (isClientMode) return;
    const dayData = weekDays[dayIndex];
    const dayCampaigns = weekCampaigns.filter(c =>
      c.startDate <= dayData.dateStr && c.endDate >= dayData.dateStr
    );
    onDayClick?.(dayData.date, dayCampaigns, dayData.events);
  }, [weekDays, weekCampaigns, onDayClick, isClientMode]);

  // Handle drag selection for date range
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

  // Calculate progress for active campaigns
  const getProgress = useCallback((campaign: PromotionalCampaign): number => {
    if (campaign.status !== 'active') return 0;
    const today = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    end.setHours(23, 59, 59, 999);

    if (today < start) return 0;
    if (today > end) return 100;

    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Week header with days */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              'px-2 py-3 text-center border-l first:border-l-0 border-gray-200',
              day.isToday && 'bg-primary-50'
            )}
          >
            <div className="text-xs font-medium text-gray-500 uppercase">
              {day.dayName}
            </div>
            <div
              className={cn(
                'mt-1 text-lg font-semibold',
                day.isToday
                  ? 'text-primary-600'
                  : day.isPast
                  ? 'text-gray-400'
                  : 'text-gray-900'
              )}
            >
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Events lane (context events) */}
      <div className="grid grid-cols-7 border-b border-gray-100 min-h-[32px]">
        {weekDays.map((day) => (
          <div
            key={`events-${day.dateStr}`}
            className={cn(
              'px-1 py-1 border-l first:border-l-0 border-gray-100 overflow-hidden',
              day.isToday && 'bg-primary-50/30'
            )}
          >
            <div className="flex flex-wrap gap-0.5">
              {day.events.slice(0, 2).map((event) => {
                const config = EVENT_CATEGORY_CONFIG[event.category];
                const Icon = config.icon;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate',
                      config.bgColor, config.color
                    )}
                    title={event.name}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{event.name}</span>
                  </div>
                );
              })}
              {day.events.length > 2 && (
                <span className="text-xs text-gray-500 px-1">+{day.events.length - 2}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign lanes */}
      <div
        ref={gridRef}
        className="flex-1 relative overflow-y-auto"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Day columns background + click targets */}
        <div className="absolute inset-0 grid grid-cols-7">
          {weekDays.map((day, i) => {
            const isInDragRange = dragStart !== null && dragEnd !== null &&
              i >= Math.min(dragStart, dragEnd) && i <= Math.max(dragStart, dragEnd);

            return (
              <div
                key={`col-${day.dateStr}`}
                className={cn(
                  'border-l first:border-l-0 border-gray-100 transition-colors cursor-pointer',
                  day.isToday && 'bg-primary-50/20',
                  day.isPast && !day.isToday && 'bg-gray-50/50',
                  isInDragRange && 'bg-primary-100/50',
                  !isClientMode && 'hover:bg-gray-50'
                )}
                onClick={() => handleDayClick(i)}
                onMouseDown={(e) => handleMouseDown(i, e)}
                onMouseEnter={() => handleMouseEnter(i)}
              />
            );
          })}
        </div>

        {/* Campaign blocks */}
        <div
          className="relative"
          style={{ minHeight: `${Math.max(200, maxRows * 44 + 16)}px` }}
        >
          {campaignLayout.map((layoutItem) => {
            const { campaign, startCol, endCol, row } = layoutItem;
            const platform = PLATFORMS[campaign.platform];
            const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);
            const displayText = campaign.name || typeConfig?.label || campaign.campaignType;

            const isPast = campaign.endDate < formatLocalDate(new Date());
            const isActive = campaign.status === 'active' && !isPast;
            const isCancelled = campaign.status === 'cancelled';
            const progress = getProgress(campaign);

            // Calculate position (percentage-based for responsiveness)
            const left = `${(startCol / 7) * 100}%`;
            const width = `${((endCol - startCol + 1) / 7) * 100}%`;
            const top = `${row * 44 + 8}px`;

            // Is this the start or end of the campaign within the week?
            const isStartInWeek = campaign.startDate >= weekStart;
            const isEndInWeek = campaign.endDate <= weekEnd;

            return (
              <div
                key={campaign.id}
                className={cn(
                  'absolute h-9 px-1',
                )}
                style={{ left, width, top }}
              >
                <button
                  onClick={(e) => handleCampaignClick(campaign, e)}
                  className={cn(
                    'w-full h-full rounded-md text-left text-xs font-medium truncate transition-all relative overflow-hidden',
                    'flex items-center gap-1.5 px-2',
                    // Shape based on position
                    !isStartInWeek && 'rounded-l-none',
                    !isEndInWeek && 'rounded-r-none',
                    // Status styling
                    isPast && 'opacity-60',
                    isCancelled && 'opacity-50 line-through',
                    isActive && 'ring-2 ring-offset-1',
                  )}
                  style={{
                    backgroundColor: isPast || isCancelled ? '#e5e7eb' : platform.color + '20',
                    borderLeft: `3px solid ${isPast || isCancelled ? '#9ca3af' : platform.color}`,
                    color: isPast || isCancelled ? '#6b7280' : undefined,
                  }}
                >
                  {/* Progress overlay for active campaigns */}
                  {isActive && progress > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-black/10 pointer-events-none"
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  {/* Platform indicator */}
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isPast || isCancelled ? 'bg-gray-400' : ''
                    )}
                    style={{
                      backgroundColor: isPast || isCancelled ? undefined : platform.color,
                    }}
                  />

                  {/* Campaign name */}
                  <span className="truncate relative z-10">{displayText}</span>

                  {/* Status badge for active */}
                  {isActive && (
                    <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </button>
              </div>
            );
          })}
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
