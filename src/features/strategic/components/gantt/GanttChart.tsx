import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { GanttRow, LABEL_COL_WIDTH } from './GanttRow';
import { useUpdateStrategicObjective } from '../../hooks';
import type { StrategicObjective, HealthStatus, Company, Brand } from '@/types';

// ============================================
// TYPES
// ============================================

interface GanttChartProps {
  objectives: StrategicObjective[];
  allCompanies: Company[];
  allBrands: Brand[];
  onObjectiveClick: (objective: StrategicObjective) => void;
  taskCountByObjectiveId: Record<string, { completed: number; total: number }>;
}

interface GroupData {
  id: string;
  name: string;
  objectives: StrategicObjective[];
}

// ============================================
// HELPERS
// ============================================

/** Get Monday of a given date's week */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Get Sunday of a given date's week */
function getSunday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Format week label for compact display */
function formatWeekLabel(monday: Date): string {
  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  const dStart = monday.getDate();
  const dEnd = sun.getDate();
  const mStart = monday.toLocaleDateString('es-ES', { month: 'short' });
  const mEnd = sun.toLocaleDateString('es-ES', { month: 'short' });
  const formattedMStart = mStart.charAt(0).toUpperCase() + mStart.slice(1);
  const formattedMEnd = mEnd.charAt(0).toUpperCase() + mEnd.slice(1);
  if (mStart === mEnd) {
    return `${dStart}-${dEnd} ${formattedMStart}`;
  }
  return `${dStart} ${formattedMStart}-${dEnd} ${formattedMEnd}`;
}

const HORIZON_FALLBACK_DAYS: Record<string, number> = {
  short: 90,
  medium: 270,
  long: 730,
};

/** Compute health status for Gantt rendering */
function computeHealthStatus(obj: StrategicObjective): HealthStatus {
  if (obj.status === 'completed') return 'completed';
  if (obj.status === 'cancelled') return 'off_track';
  if (obj.kpiCurrentValue == null || obj.kpiTargetValue == null) {
    if (!obj.evaluationDate) return 'on_track';
    const deadline = new Date(obj.evaluationDate).getTime();
    const now = Date.now();
    if (now > deadline) return 'off_track';
    const daysLeft = (deadline - now) / 86400000;
    return daysLeft < 14 ? 'at_risk' : 'on_track';
  }

  const current = obj.kpiCurrentValue;
  const target = obj.kpiTargetValue;
  const baseline = obj.baselineValue!;

  const range = target - baseline;
  if (range === 0) return current >= target ? 'completed' : 'on_track';
  const progress = ((current - baseline) / range) * 100;
  if (progress >= 100) return 'exceeded';

  if (!obj.evaluationDate) return progress > 0 ? 'on_track' : 'at_risk';
  const startTime = (obj.startDate ? new Date(obj.startDate) : new Date(obj.createdAt)).getTime();
  const deadline = new Date(obj.evaluationDate).getTime();
  const totalDuration = deadline - startTime;
  if (totalDuration <= 0) return progress >= 100 ? 'completed' : 'off_track';
  const elapsed = Date.now() - startTime;
  const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100);

  if (expectedProgress === 0) return 'on_track';
  const ratio = progress / expectedProgress;
  if (ratio >= 0.9) return 'on_track';
  if (ratio >= 0.7) return 'at_risk';
  return 'off_track';
}

/** Compute progress percentage */
function computeProgressPct(obj: StrategicObjective): number {
  if (obj.status === 'completed') return 100;
  if (obj.kpiCurrentValue == null || obj.kpiTargetValue == null) return 0;
  const baseline = obj.baselineValue ?? 0;
  const range = obj.kpiTargetValue - baseline;
  if (range === 0) return obj.kpiCurrentValue >= obj.kpiTargetValue ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((obj.kpiCurrentValue - baseline) / range) * 100)));
}

// ============================================
// COMPONENT
// ============================================

export function GanttChart({
  objectives,
  allCompanies,
  onObjectiveClick,
  taskCountByObjectiveId,
}: GanttChartProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const updateObjective = useUpdateStrategicObjective();

  // Measure container width for flexible week columns
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Compute bar dates for each objective
  const objectiveDates = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date; hasFallbackEnd: boolean }>();
    for (const obj of objectives) {
      const start = obj.startDate ? new Date(obj.startDate) : new Date(obj.createdAt);
      let end: Date;
      let hasFallbackEnd = false;
      if (obj.evaluationDate) {
        end = new Date(obj.evaluationDate);
      } else {
        const fallbackDays = HORIZON_FALLBACK_DAYS[obj.horizon] ?? 90;
        end = new Date(start.getTime() + fallbackDays * 86400000);
        hasFallbackEnd = true;
      }
      if (end < start) end = new Date(start.getTime() + 7 * 86400000);
      map.set(obj.id, { start, end, hasFallbackEnd });
    }
    return map;
  }, [objectives]);

  // Compute weeks window
  const { weeks, windowStart, totalDays } = useMemo(() => {
    if (objectives.length === 0) {
      const today = new Date();
      const start = getMonday(today);
      const ws: Date[] = [];
      for (let i = 0; i < 12; i++) {
        const w = new Date(start);
        w.setDate(w.getDate() + i * 7);
        ws.push(w);
      }
      return { weeks: ws, windowStart: start, totalDays: 12 * 7 };
    }

    let earliest = Infinity;
    let latest = -Infinity;
    for (const dates of objectiveDates.values()) {
      earliest = Math.min(earliest, dates.start.getTime());
      latest = Math.max(latest, dates.end.getTime());
    }

    const now = Date.now();
    earliest = Math.min(earliest, now);
    latest = Math.max(latest, now);

    const startMonday = getMonday(new Date(earliest));
    startMonday.setDate(startMonday.getDate() - 7);
    const endSunday = getSunday(new Date(latest));
    endSunday.setDate(endSunday.getDate() + 7);

    const ws: Date[] = [];
    const cursor = new Date(startMonday);
    while (cursor <= endSunday) {
      ws.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    while (ws.length < 12) {
      const last = ws[ws.length - 1];
      const next = new Date(last);
      next.setDate(next.getDate() + 7);
      ws.push(next);
    }

    const td = ws.length * 7;
    return { weeks: ws, windowStart: new Date(startMonday), totalDays: td };
  }, [objectives, objectiveDates]);

  // Group objectives by company
  const groups = useMemo((): GroupData[] => {
    const map = new Map<string, StrategicObjective[]>();
    for (const obj of objectives) {
      const key = obj.companyId || '__none__';
      const list = map.get(key) || [];
      list.push(obj);
      map.set(key, list);
    }

    return Array.from(map.entries())
      .map(([companyId, objs]) => {
        const company = allCompanies.find(c => c.id === companyId);
        return {
          id: companyId,
          name: company?.name || 'Sin compañía',
          objectives: objs,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [objectives, allCompanies]);

  // Flexible week width: fill available space
  const trackWidth = Math.max(containerWidth - LABEL_COL_WIDTH, weeks.length * 56);
  const weekColWidth = weeks.length > 0 ? trackWidth / weeks.length : 56;

  // "Today" marker position
  const todayPct = useMemo(() => {
    const now = Date.now();
    const startMs = windowStart.getTime();
    const totalMs = totalDays * 86400000;
    const pct = ((now - startMs) / totalMs) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [windowStart, totalDays]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleAllGroups = () => {
    setCollapsedGroups(prev => {
      const allCollapsed = groups.every(g => prev.has(g.id));
      if (allCollapsed) return new Set();
      return new Set(groups.map(g => g.id));
    });
  };

  // Handle drag date change from GanttRow
  const handleDateChange = useCallback((objectiveId: string, startDate: string, endDate: string) => {
    updateObjective.mutate({
      id: objectiveId,
      updates: { startDate, evaluationDate: endDate },
    });
  }, [updateObjective]);

  if (objectives.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        No hay objetivos para mostrar en el Gantt
      </div>
    );
  }

  // Determine month boundaries for header
  const monthHeaders = (() => {
    const headers: { label: string; startIdx: number; span: number }[] = [];
    let currentMonth = '';
    let startIdx = 0;
    let span = 0;

    for (let i = 0; i < weeks.length; i++) {
      const month = weeks[i].toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      const formatted = month.charAt(0).toUpperCase() + month.slice(1);
      if (formatted !== currentMonth) {
        if (currentMonth) headers.push({ label: currentMonth, startIdx, span });
        currentMonth = formatted;
        startIdx = i;
        span = 1;
      } else {
        span++;
      }
    }
    if (currentMonth) headers.push({ label: currentMonth, startIdx, span });
    return headers;
  })();

  return (
    <div ref={containerRef} className="overflow-x-auto border border-gray-100 rounded-lg">
      <div style={{ minWidth: LABEL_COL_WIDTH + trackWidth }}>
        {/* Header: Month row */}
        <div className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-gray-50 shrink-0 border-r border-gray-200"
            style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
          />
          <div className="flex" style={{ width: trackWidth }}>
            {monthHeaders.map((mh, i) => (
              <div
                key={i}
                className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 py-1.5 border-r border-gray-200 text-center truncate"
                style={{ width: mh.span * weekColWidth }}
              >
                {mh.label}
              </div>
            ))}
          </div>
        </div>

        {/* Header: Week row */}
        <div className="flex sticky top-[29px] z-20 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white shrink-0 px-3 flex items-center justify-between text-[10px] font-medium text-gray-400 uppercase tracking-wider border-r border-gray-200"
            style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
          >
            <span>Objetivo</span>
            <button
              onClick={toggleAllGroups}
              className="p-0.5 rounded hover:bg-gray-100 transition-colors"
              title="Expandir/Colapsar todo"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="flex relative" style={{ width: trackWidth }}>
            {weeks.map((w, i) => (
              <div
                key={i}
                className="text-[10px] text-gray-400 text-center py-1.5 border-r border-gray-100 truncate"
                style={{ width: weekColWidth }}
              >
                {formatWeekLabel(w)}
              </div>
            ))}
          </div>
        </div>

        {/* Body: groups + rows */}
        <div className="relative">
          {/* Today line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary-500 z-[5] pointer-events-none"
            style={{ left: LABEL_COL_WIDTH + (todayPct / 100) * trackWidth }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b shadow-sm">
              Hoy
            </div>
          </div>

          {groups.map(group => {
            const isCollapsed = collapsedGroups.has(group.id);
            let rowIndex = 0;
            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center w-full h-8 px-3 bg-gray-50/80 border-b border-gray-100 hover:bg-gray-100/80 transition-colors"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                  }
                  <span className="text-xs font-semibold text-gray-700">{group.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2">
                    ({group.objectives.length})
                  </span>
                </button>

                {/* Rows */}
                {!isCollapsed && group.objectives.map(obj => {
                  const dates = objectiveDates.get(obj.id)!;
                  const currentIndex = rowIndex++;
                  return (
                    <GanttRow
                      key={obj.id}
                      objective={obj}
                      weeks={weeks}
                      windowStart={windowStart}
                      totalDays={totalDays}
                      healthStatus={computeHealthStatus(obj)}
                      progressPct={computeProgressPct(obj)}
                      barStart={dates.start}
                      barEnd={dates.end}
                      hasFallbackEnd={dates.hasFallbackEnd}
                      onObjectiveClick={onObjectiveClick}
                      onDateChange={handleDateChange}
                      index={currentIndex}
                      taskCount={taskCountByObjectiveId[obj.id]}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
