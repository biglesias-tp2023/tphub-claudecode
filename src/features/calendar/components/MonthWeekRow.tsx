/**
 * Month Week Row
 *
 * Renders one week row in the month view (7 day cells + absolutely positioned
 * campaign bars spanning multiple columns like Google Calendar).
 * Also renders objective bars as dashed-border items.
 */

import { memo, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { computeCampaignLayout, type CampaignLayoutRow } from '../utils/campaignLayout';
import { MonthDayCell } from './MonthDayCell';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast } from '@/types';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';
import type { CalendarObjectiveItem } from '../hooks/useCalendarObjectives';

interface MonthWeekRowProps {
  weekDates: string[]; // 7 date strings (Mon-Sun)
  weekNumber?: number;
  year: number;
  month: number;
  campaigns: PromotionalCampaign[];
  eventsByDate: Map<string, CalendarEvent[]>;
  weatherByDate: Map<string, WeatherForecast>;
  revenueByDate: Map<string, DailyChannelRevenue>;
  objectives?: CalendarObjectiveItem[];
  todayStr: string;
  // Drag state
  dragStartDate: string | null;
  dragEndDate: string | null;
  onDayMouseDown?: (dateStr: string, e: React.MouseEvent) => void;
  onDayMouseEnter?: (dateStr: string) => void;
  onDayClick?: (dateStr: string) => void;
  onCampaignClick?: (campaign: PromotionalCampaign, e: React.MouseEvent) => void;
  isClientMode?: boolean;
}

const MAX_VISIBLE_ROWS = 3;

const CATEGORY_COLORS: Record<string, string> = {
  finanzas: '#22c55e',
  operaciones: '#3b82f6',
  clientes: '#f97316',
  marca: '#ec4899',
  reputacion: '#f59e0b',
  proveedores: '#6b7280',
  menu: '#6366f1',
};

function arePropsEqual(prev: MonthWeekRowProps, next: MonthWeekRowProps): boolean {
  return (
    prev.weekDates === next.weekDates &&
    prev.weekNumber === next.weekNumber &&
    prev.year === next.year &&
    prev.month === next.month &&
    prev.campaigns === next.campaigns &&
    prev.eventsByDate === next.eventsByDate &&
    prev.weatherByDate === next.weatherByDate &&
    prev.revenueByDate === next.revenueByDate &&
    prev.objectives === next.objectives &&
    prev.todayStr === next.todayStr &&
    prev.dragStartDate === next.dragStartDate &&
    prev.dragEndDate === next.dragEndDate &&
    prev.isClientMode === next.isClientMode
  );
}

export const MonthWeekRow = memo(function MonthWeekRow({
  weekDates,
  weekNumber,
  year,
  month,
  campaigns,
  eventsByDate,
  weatherByDate,
  revenueByDate,
  objectives = [],
  todayStr,
  dragStartDate,
  dragEndDate,
  onDayMouseDown,
  onDayMouseEnter,
  onDayClick,
  onCampaignClick,
}: MonthWeekRowProps) {
  // Compute campaign layout for this week
  const layout = useMemo(
    () => computeCampaignLayout(campaigns, weekDates),
    [campaigns, weekDates]
  );

  // Compute objective layout with row stacking (avoid overlaps)
  const objectiveLayout = useMemo(() => {
    if (objectives.length === 0) return [];

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const dateToCol = new Map<string, number>();
    weekDates.forEach((d, i) => dateToCol.set(d, i));

    const items = objectives
      .filter(item => item.startDate <= weekEnd && item.endDate >= weekStart)
      .map(item => {
        const startCol = Math.max(0, dateToCol.get(item.startDate) ?? (item.startDate < weekStart ? 0 : 7));
        const endCol = Math.min(6, dateToCol.get(item.endDate) ?? (item.endDate > weekEnd ? 6 : -1));
        return { item, startCol, endCol, row: 0 };
      })
      .filter(o => o.startCol <= 6 && o.endCol >= 0 && o.startCol <= o.endCol);

    // Assign rows: track which columns are occupied per row
    const rowOccupancy: boolean[][] = [];
    for (const obj of items) {
      let assignedRow = -1;
      for (let r = 0; r < rowOccupancy.length; r++) {
        let canFit = true;
        for (let c = obj.startCol; c <= obj.endCol; c++) {
          if (rowOccupancy[r][c]) { canFit = false; break; }
        }
        if (canFit) { assignedRow = r; break; }
      }
      if (assignedRow === -1) {
        assignedRow = rowOccupancy.length;
        rowOccupancy.push(new Array(7).fill(false));
      }
      obj.row = assignedRow;
      for (let c = obj.startCol; c <= obj.endCol; c++) {
        rowOccupancy[assignedRow][c] = true;
      }
    }

    return items;
  }, [objectives, weekDates]);

  const maxCampaignRows = useMemo(
    () => Math.max(0, ...layout.map(l => l.row + 1)),
    [layout]
  );

  // Per-column overflow counts
  const overflowByCol = useMemo(() => {
    const overflow = new Array(7).fill(0);
    for (const item of layout) {
      if (item.row >= MAX_VISIBLE_ROWS) {
        for (let col = item.startCol; col <= item.endCol; col++) {
          overflow[col]++;
        }
      }
    }
    return overflow;
  }, [layout]);

  const visibleLayout = layout.filter(l => l.row < MAX_VISIBLE_ROWS);

  // Height for campaign bars area
  const barAreaHeight = Math.min(maxCampaignRows, MAX_VISIBLE_ROWS) * 22;
  const maxObjectiveRows = objectiveLayout.length > 0
    ? Math.max(...objectiveLayout.map(o => o.row)) + 1
    : 0;
  const objectiveAreaHeight = maxObjectiveRows * 18;

  return (
    <div className="flex">
      {/* Week number */}
      {weekNumber !== undefined && (
        <div
          className="w-8 shrink-0 flex items-start justify-center pt-2 border-b border-r border-gray-100 bg-gray-50/50"
          title={`Semana ${weekNumber}`}
        >
          <span className="text-[10px] font-medium text-gray-400">S{weekNumber}</span>
        </div>
      )}
    <div className="relative grid grid-cols-7 flex-1" style={{ minHeight: `${100 + barAreaHeight + objectiveAreaHeight}px` }}>
      {/* Day cells (background) */}
      {weekDates.map((dateStr, colIdx) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayNumber = date.getDate();
        const isCurrentMonth = date.getFullYear() === year && date.getMonth() + 1 === month;
        const isTodayDate = dateStr === todayStr;
        const isPastDate = dateStr < todayStr;
        const events = eventsByDate.get(dateStr) ?? [];
        const weather = weatherByDate.get(dateStr);
        const revenue = revenueByDate.get(dateStr);

        const isInDragRange = dragStartDate !== null && dragEndDate !== null &&
          dateStr >= (dragStartDate < dragEndDate ? dragStartDate : dragEndDate) &&
          dateStr <= (dragStartDate > dragEndDate ? dragStartDate : dragEndDate);

        return (
          <MonthDayCell
            key={dateStr}
            dateStr={dateStr}
            dayNumber={dayNumber}
            isCurrentMonth={isCurrentMonth}
            isToday={isTodayDate}
            isPast={isPastDate}
            events={events}
            weather={weather}
            revenue={revenue}
            overflowCount={overflowByCol[colIdx]}
            isDragTarget={isInDragRange}
            onMouseDown={(e) => onDayMouseDown?.(dateStr, e)}
            onMouseEnter={() => onDayMouseEnter?.(dateStr)}
            onClick={() => onDayClick?.(dateStr)}
          />
        );
      })}

      {/* Campaign bars (absolutely positioned, spanning columns) */}
      {visibleLayout.map((layoutItem) => (
        <CampaignBar
          key={layoutItem.campaign.id}
          layoutItem={layoutItem}
          weekDates={weekDates}
          todayStr={todayStr}
          onClick={onCampaignClick}
        />
      ))}

      {/* Objective bars (dashed-border, distinct from campaigns) */}
      {objectiveLayout.map(({ item, startCol, endCol, row }) => (
        <ObjectiveBar
          key={item.objective.id}
          item={item}
          startCol={startCol}
          endCol={endCol}
          campaignRowOffset={Math.min(maxCampaignRows, MAX_VISIBLE_ROWS)}
          objectiveRow={row}
        />
      ))}
    </div>
    </div>
  );
}, arePropsEqual);

// ============================================
// CAMPAIGN BAR SUB-COMPONENT
// ============================================

interface CampaignBarProps {
  layoutItem: CampaignLayoutRow;
  weekDates: string[];
  todayStr: string;
  onClick?: (campaign: PromotionalCampaign, e: React.MouseEvent) => void;
}

const CampaignBar = memo(function CampaignBar({
  layoutItem,
  weekDates,
  todayStr,
  onClick,
}: CampaignBarProps) {
  const { campaign, startCol, endCol, row } = layoutItem;
  const platform = PLATFORMS[campaign.platform];
  const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);
  const displayText = campaign.name || typeConfig?.label || campaign.campaignType;

  const isPast = campaign.endDate < todayStr;
  const isActive = campaign.status === 'active' && !isPast;
  const isCancelled = campaign.status === 'cancelled';

  // Is this the actual start/end of the campaign (vs week boundary)?
  const isStartInWeek = campaign.startDate >= weekDates[0];
  const isEndInWeek = campaign.endDate <= weekDates[6];

  // Position: percentage-based
  const left = `calc(${(startCol / 7) * 100}% + 2px)`;
  const width = `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`;
  // Offset from top: after day header area (~28px) + row * bar height
  const top = `${28 + row * 22}px`;

  return (
    <button
      className={cn(
        'absolute h-[20px] z-10 text-left text-[11px] font-medium truncate',
        'flex items-center gap-1 px-1.5 transition-all',
        'rounded-sm',
        !isStartInWeek && 'rounded-l-none',
        !isEndInWeek && 'rounded-r-none',
        isPast && 'opacity-50',
        isCancelled && 'opacity-40 line-through',
        isActive && 'ring-1 ring-offset-0',
      )}
      style={{
        left,
        width,
        top,
        backgroundColor: isPast || isCancelled ? '#e5e7eb' : platform.color + '25',
        borderLeft: isStartInWeek ? `3px solid ${isPast || isCancelled ? '#9ca3af' : platform.color}` : undefined,
        color: isPast || isCancelled ? '#6b7280' : undefined,
      }}
      title={`${platform.name}: ${displayText}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(campaign, e);
      }}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full shrink-0', isPast || isCancelled ? 'bg-gray-400' : '')}
        style={{ backgroundColor: !isPast && !isCancelled ? platform.color : undefined }}
      />
      <span className="truncate">{displayText}</span>
      {isActive && (
        <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      )}
    </button>
  );
});

// ============================================
// OBJECTIVE BAR SUB-COMPONENT
// ============================================

interface ObjectiveBarProps {
  item: CalendarObjectiveItem;
  startCol: number;
  endCol: number;
  campaignRowOffset: number;
  objectiveRow: number;
}

const ObjectiveBar = memo(function ObjectiveBar({
  item,
  startCol,
  endCol,
  campaignRowOffset,
  objectiveRow,
}: ObjectiveBarProps) {
  const { objective } = item;
  const color = CATEGORY_COLORS[objective.category] ?? '#6b7280';

  const left = `calc(${(startCol / 7) * 100}% + 2px)`;
  const width = `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`;
  const top = `${28 + campaignRowOffset * 22 + objectiveRow * 18 + 2}px`;

  return (
    <div
      className="absolute h-[14px] z-10 flex items-center px-1.5 text-[9px] font-medium truncate rounded-sm opacity-70"
      style={{
        left,
        width,
        top,
        border: `1px dashed ${color}`,
        color,
        backgroundColor: color + '10',
      }}
      title={objective.title}
    >
      <span className="truncate">{objective.title}</span>
    </div>
  );
});
