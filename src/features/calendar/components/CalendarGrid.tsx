/**
 * Calendar Grid (Month View)
 *
 * Google Calendar-style month view with campaign bars spanning columns,
 * daily revenue indicators, objectives bars, and drag-to-create support.
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import { MonthWeekRow } from './MonthWeekRow';
import { QuickCreatePopover } from './QuickCreatePopover';
import { CampaignPopover } from './CampaignPopover';
import { getMonthGridDates, splitIntoWeeks, WEEKDAY_NAMES } from '../utils/dateHelpers';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast } from '@/types';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';
import type { CalendarObjectiveItem } from '../hooks/useCalendarObjectives';

/** Get ISO week number for a date string (YYYY-MM-DD) */
function getISOWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface CalendarGridProps {
  year: number;
  month: number;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
  revenueByDate?: Map<string, DailyChannelRevenue>;
  objectives?: CalendarObjectiveItem[];
  onDayClick?: (date: Date, campaigns: PromotionalCampaign[], events: CalendarEvent[]) => void;
  onEditCampaign?: (campaign: PromotionalCampaign) => void;
  onDeleteCampaign?: (campaign: PromotionalCampaign) => void;
  onDuplicateCampaign?: (campaign: PromotionalCampaign) => void;
  onCreateCampaignWithDates?: (startDate: string, endDate: string) => void;
  isClientMode?: boolean;
  restaurantId?: string;
}

export function CalendarGrid({
  year,
  month,
  campaigns,
  events,
  weatherForecasts = [],
  revenueByDate = new Map(),
  objectives = [],
  onDayClick,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onCreateCampaignWithDates,
  isClientMode = false,
  restaurantId,
}: CalendarGridProps) {
  // Drag state
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const [dragEndDate, setDragEndDate] = useState<string | null>(null);

  // Quick create popover state
  const [quickCreate, setQuickCreate] = useState<{
    startDate: string;
    endDate: string;
    anchor: { x: number; y: number };
  } | null>(null);

  // Campaign popover state
  const [selectedCampaign, setSelectedCampaign] = useState<PromotionalCampaign | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Generate grid dates and split into weeks
  const gridDates = useMemo(() => getMonthGridDates(year, month), [year, month]);
  const weeks = useMemo(() => splitIntoWeeks(gridDates), [gridDates]);

  // Pre-compute event and weather maps
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const dateStr of gridDates) {
      const matching = events.filter(event => {
        if (event.endDate) {
          return event.eventDate <= dateStr && event.endDate >= dateStr;
        }
        return event.eventDate === dateStr;
      });
      if (matching.length > 0) map.set(dateStr, matching);
    }
    return map;
  }, [events, gridDates]);

  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherForecast>();
    for (const w of weatherForecasts) {
      map.set(w.date, w);
    }
    return map;
  }, [weatherForecasts]);

  // Drag-to-create handlers
  const handleDayMouseDown = useCallback((dateStr: string, e: React.MouseEvent) => {
    if (isClientMode) return;
    e.preventDefault();
    setDragStartDate(dateStr);
    setDragEndDate(dateStr);
    setQuickCreate(null);
    setSelectedCampaign(null);
  }, [isClientMode]);

  const handleDayMouseEnter = useCallback((dateStr: string) => {
    if (dragStartDate !== null) {
      setDragEndDate(dateStr);
    }
  }, [dragStartDate]);

  const handleMouseUp = useCallback(() => {
    if (dragStartDate !== null && dragEndDate !== null && !isClientMode) {
      const start = dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
      const end = dragStartDate > dragEndDate ? dragStartDate : dragEndDate;

      if (start !== end) {
        // Multi-day drag: show quick create popover
        const gridEl = gridRef.current;
        if (gridEl) {
          const rect = gridEl.getBoundingClientRect();
          setQuickCreate({
            startDate: start,
            endDate: end,
            anchor: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 3,
            },
          });
        }
      }
    }
    setDragStartDate(null);
    setDragEndDate(null);
  }, [dragStartDate, dragEndDate, isClientMode]);

  // Day click handler
  const handleDayClick = useCallback((dateStr: string) => {
    if (dragStartDate !== null) return; // Don't trigger click during drag
    const date = new Date(dateStr + 'T00:00:00');
    const dayCampaigns = campaigns.filter(c => c.startDate <= dateStr && c.endDate >= dateStr);
    const dayEvents = eventsByDate.get(dateStr) ?? [];
    onDayClick?.(date, dayCampaigns, dayEvents);
  }, [dragStartDate, campaigns, eventsByDate, onDayClick]);

  // Campaign click handler
  const handleCampaignClick = useCallback((campaign: PromotionalCampaign, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  const handleCloseQuickCreate = useCallback(() => {
    setQuickCreate(null);
  }, []);

  const handleMoreOptions = useCallback((startDate: string, endDate: string) => {
    onCreateCampaignWithDates?.(startDate, endDate);
  }, [onCreateCampaignWithDates]);

  return (
    <div
      ref={gridRef}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Weekday headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-8 shrink-0" />
        <div className="grid grid-cols-7 flex-1">
          {WEEKDAY_NAMES.map(day => (
            <div
              key={day}
              className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Week rows */}
      <div className="flex-1">
        {weeks.map((weekDates) => (
          <MonthWeekRow
            key={weekDates[0]}
            weekDates={weekDates}
            weekNumber={getISOWeekNumber(weekDates[0])}
            year={year}
            month={month}
            campaigns={campaigns}
            eventsByDate={eventsByDate}
            weatherByDate={weatherByDate}
            revenueByDate={revenueByDate}
            objectives={objectives}
            todayStr={todayStr}
            dragStartDate={dragStartDate}
            dragEndDate={dragEndDate}
            onDayMouseDown={handleDayMouseDown}
            onDayMouseEnter={handleDayMouseEnter}
            onDayClick={handleDayClick}
            onCampaignClick={handleCampaignClick}
            isClientMode={isClientMode}
          />
        ))}
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

      {/* Quick create popover */}
      {quickCreate && !isClientMode && (
        <QuickCreatePopover
          startDate={quickCreate.startDate}
          endDate={quickCreate.endDate}
          anchor={quickCreate.anchor}
          onClose={handleCloseQuickCreate}
          onMoreOptions={handleMoreOptions}
          restaurantId={restaurantId}
        />
      )}
    </div>
  );
}
