import { useState, useCallback, useMemo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { AdsWeeklyHeatmapRow } from '@/services/crp-portal';

// ============================================
// CONSTANTS
// ============================================

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface AdsHourlyChartProps {
  data: AdsWeeklyHeatmapRow[];
  isLoading: boolean;
}

interface TooltipData {
  row: AdsWeeklyHeatmapRow;
  x: number;
  y: number;
}

// ============================================
// HELPERS
// ============================================

/** Build a Map keyed by "dayOfWeek-hourOfDay" for fast lookup */
function buildLookup(data: AdsWeeklyHeatmapRow[]): Map<string, AdsWeeklyHeatmapRow> {
  const map = new Map<string, AdsWeeklyHeatmapRow>();
  for (const row of data) {
    map.set(`${row.dayOfWeek}-${row.hourOfDay}`, row);
  }
  return map;
}

/** Determine the hour range that actually has data */
function getHourRange(data: AdsWeeklyHeatmapRow[]): { start: number; end: number } {
  if (data.length === 0) return { start: 7, end: 23 };

  let minH = 23;
  let maxH = 0;
  for (const row of data) {
    if (row.adSpent > 0) {
      if (row.hourOfDay < minH) minH = row.hourOfDay;
      if (row.hourOfDay > maxH) maxH = row.hourOfDay;
    }
  }

  // Clamp to reasonable range, at least 7-23
  return { start: Math.min(minH, 7), end: Math.max(maxH, 23) };
}

// ============================================
// COMPONENT
// ============================================

export function AdsHourlyChart({ data, isLoading }: AdsHourlyChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const lookup = useMemo(() => buildLookup(data), [data]);
  const hourRange = useMemo(() => getHourRange(data), [data]);
  const hours = useMemo(
    () => Array.from({ length: hourRange.end - hourRange.start + 1 }, (_, i) => i + hourRange.start),
    [hourRange]
  );

  const maxAdSpent = useMemo(() => {
    let max = 0;
    for (const row of data) {
      if (row.adSpent > max) max = row.adSpent;
    }
    return max;
  }, [data]);

  const colorScale = useMemo(
    () =>
      scaleSequential()
        .domain([0, maxAdSpent || 1])
        .interpolator(interpolateRgb('#e8f4fa', '#095789')),
    [maxAdSpent]
  );

  const handleMouseMove = useCallback(
    (row: AdsWeeklyHeatmapRow, e: React.MouseEvent) => {
      setTooltip({ row, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (isLoading) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = data.length > 0 && maxAdSpent > 0;

  if (!hasData) {
    return (
      <div className="h-[180px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-xs text-gray-400">Sin datos de ADS por horas</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center justify-end mb-2">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>Menos</span>
          <div
            className="w-16 h-2.5 rounded"
            style={{ background: 'linear-gradient(to right, #e8f4fa, #095789)' }}
          />
          <span>Más</span>
        </div>
      </div>

      {/* Heatmap table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-9 pb-1" />
              {hours.map((h) => (
                <th
                  key={h}
                  className="text-[10px] font-medium text-gray-400 pb-1 text-center"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((dayLabel, dayIdx) => {
              const dayOfWeek = dayIdx + 1; // 1=Mon .. 7=Sun
              return (
                <tr key={dayOfWeek}>
                  <td className="text-[10px] font-medium text-gray-500 text-right pr-1.5 py-0 whitespace-nowrap">
                    {dayLabel}
                  </td>
                  {hours.map((h) => {
                    const key = `${dayOfWeek}-${h}`;
                    const cell = lookup.get(key);
                    const spent = cell?.adSpent ?? 0;
                    const bgColor = spent > 0 ? (colorScale(spent) as string) : '#ffffff';
                    const normalized = maxAdSpent > 0 ? spent / maxAdSpent : 0;
                    const textColor = normalized > 0.55 ? '#ffffff' : '#6b7280';

                    return (
                      <td
                        key={h}
                        className="p-0 border border-gray-100"
                        onMouseMove={(e) => {
                          if (cell && spent > 0) handleMouseMove(cell, e);
                          else setTooltip(null);
                        }}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className="flex items-center justify-center h-6 min-w-[28px] text-[9px] tabular-nums transition-colors cursor-default"
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          {spent > 0 ? formatCurrency(spent, { compact: true }) : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-medium mb-1">
            {DAY_LABELS[tooltip.row.dayOfWeek - 1]} {tooltip.row.hourOfDay}:00
          </p>
          <div className="space-y-0.5">
            <p>Inversión: {formatCurrency(tooltip.row.adSpent)}</p>
            <p>Impressions: {formatNumber(tooltip.row.impressions)}</p>
            <p>Clicks: {formatNumber(tooltip.row.clicks)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
