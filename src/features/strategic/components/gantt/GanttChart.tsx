import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GanttRow, LABEL_COL_WIDTH, WEEK_COL_WIDTH } from './GanttRow';
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
  const mon = getMonday(d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return sun;
}

/** Format week label: "9-15 Mar" or "30 Mar-5 Abr" */
function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = monday.toLocaleDateString('es-ES', { month: 'short' });
  const endMonth = sunday.toLocaleDateString('es-ES', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)}`;
  }
  const fmtStart = startMonth.charAt(0).toUpperCase() + startMonth.slice(1);
  const fmtEnd = endMonth.charAt(0).toUpperCase() + endMonth.slice(1);
  return `${startDay} ${fmtStart}-${endDay} ${fmtEnd}`;
}

/** Horizon-based fallback duration in days */
const HORIZON_FALLBACK_DAYS: Record<string, number> = {
  short: 90,
  medium: 270,
  long: 730,
};

/** Compute a simple health status from objective data */
function computeHealthStatus(obj: StrategicObjective): HealthStatus {
  if (obj.status === 'completed') return 'completed';
  if (obj.status === 'cancelled') return 'off_track';

  const hasKpi = obj.kpiCurrentValue != null && obj.kpiTargetValue != null && obj.baselineValue != null;
  if (!hasKpi) {
    // Estimate from time elapsed
    if (!obj.evaluationDate) return 'on_track';
    const now = Date.now();
    const deadline = new Date(obj.evaluationDate).getTime();
    const remaining = deadline - now;
    if (remaining < 0) return 'off_track';
    if (remaining < 14 * 86400000) return 'at_risk';
    return 'on_track';
  }

  const current = obj.kpiCurrentValue!;
  const target = obj.kpiTargetValue!;
  const baseline = obj.baselineValue!;

  // Progress
  const range = target - baseline;
  if (range === 0) return current >= target ? 'completed' : 'on_track';
  const progress = ((current - baseline) / range) * 100;
  if (progress >= 100) return 'exceeded';

  // Expected progress from time
  if (!obj.evaluationDate) return progress > 0 ? 'on_track' : 'at_risk';
  const created = new Date(obj.createdAt).getTime();
  const deadline = new Date(obj.evaluationDate).getTime();
  const totalDuration = deadline - created;
  if (totalDuration <= 0) return progress >= 100 ? 'completed' : 'off_track';
  const elapsed = Date.now() - created;
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
}: GanttChartProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Compute bar dates for each objective
  const objectiveDates = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date; hasFallbackEnd: boolean }>();
    for (const obj of objectives) {
      const start = new Date(obj.createdAt);
      let end: Date;
      let hasFallbackEnd = false;
      if (obj.evaluationDate) {
        end = new Date(obj.evaluationDate);
      } else {
        const fallbackDays = HORIZON_FALLBACK_DAYS[obj.horizon] ?? 90;
        end = new Date(start.getTime() + fallbackDays * 86400000);
        hasFallbackEnd = true;
      }
      // Ensure end >= start
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

    // Also consider "today" to ensure it's visible
    const now = Date.now();
    earliest = Math.min(earliest, now);
    latest = Math.max(latest, now);

    // Snap to Monday/Sunday, add 1 week padding each side
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

    // Minimum 12 weeks
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

  if (objectives.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        No hay objetivos para mostrar en el Gantt
      </div>
    );
  }

  const trackWidth = weeks.length * WEEK_COL_WIDTH;

  // Determine month boundaries for header
  const monthHeaders = useMemo(() => {
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
  }, [weeks]);

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-lg">
      <div style={{ minWidth: LABEL_COL_WIDTH + trackWidth }}>
        {/* Header: Month row */}
        <div className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-gray-50 shrink-0 border-r border-gray-200"
            style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
          />
          <div className="flex" style={{ minWidth: trackWidth }}>
            {monthHeaders.map((mh, i) => (
              <div
                key={i}
                className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 py-1 border-r border-gray-200 text-center truncate"
                style={{ width: mh.span * WEEK_COL_WIDTH }}
              >
                {mh.label}
              </div>
            ))}
          </div>
        </div>

        {/* Header: Week row */}
        <div className="flex sticky top-[25px] z-20 bg-white border-b border-gray-200">
          <div
            className="sticky left-0 z-30 bg-white shrink-0 px-3 flex items-center text-[10px] font-medium text-gray-400 uppercase tracking-wider border-r border-gray-200"
            style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
          >
            Objetivo
          </div>
          <div className="flex relative" style={{ minWidth: trackWidth }}>
            {weeks.map((w, i) => (
              <div
                key={i}
                className="text-[9px] text-gray-400 text-center py-1.5 border-r border-gray-100 truncate"
                style={{ width: WEEK_COL_WIDTH }}
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
            className="absolute top-0 bottom-0 w-px bg-primary-400 z-[5] pointer-events-none"
            style={{ left: LABEL_COL_WIDTH + (todayPct / 100) * trackWidth }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[8px] font-bold px-1 rounded-b">
              Hoy
            </div>
          </div>

          {groups.map(group => {
            const isCollapsed = collapsedGroups.has(group.id);
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
