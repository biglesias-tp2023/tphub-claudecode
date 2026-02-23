import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { HeatmapCell } from '../hooks/useReputationData';

interface ErrorHeatmapProps {
  data: HeatmapCell[];
  className?: string;
}

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 10); // 10h to 23h

function getHeatStyle(count: number, maxCount: number): { bg: string; text: string } {
  if (count === 0) return { bg: '#f9fafb', text: 'transparent' };
  const t = Math.min(count / (maxCount || 1), 1);
  // Interpolate red-50 (#fef2f2) → red-600 (#dc2626)
  const r = Math.round(254 + (220 - 254) * t);
  const g = Math.round(242 + (38 - 242) * t);
  const b = Math.round(242 + (38 - 242) * t);
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    text: t > 0.55 ? '#ffffff' : '#374151',
  };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  day: string;
  hour: number;
  count: number;
}

export function ErrorHeatmap({ data, className }: ErrorHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, day: '', hour: 0, count: 0,
  });

  // Create a lookup map for quick access
  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((cell) => {
      map.set(`${cell.day}-${cell.hour}`, cell.count);
    });
    return map;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(...data.map((c) => c.count), 1),
    [data]
  );

  const getCount = (day: number, hour: number) =>
    cellMap.get(`${day}-${hour}`) || 0;

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, day: string, hour: number, count: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        day,
        hour,
        count,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          Mapa de Calor - Resenas Negativas
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>Menos</span>
          <div
            className="w-24 h-3 rounded"
            style={{
              background: 'linear-gradient(to right, #fef2f2, #dc2626)',
            }}
          />
          <span>Mas</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="w-10" />
              {DAYS.map((day, i) => (
                <th
                  key={day}
                  className={cn(
                    'text-center text-[11px] font-medium pb-1.5',
                    i >= 5 ? 'text-primary-600' : 'text-gray-500'
                  )}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="text-right text-[11px] text-gray-400 pr-2 tabular-nums">
                  {hour}h
                </td>
                {DAYS.map((dayLabel, dayIndex) => {
                  const count = getCount(dayIndex, hour);
                  const style = getHeatStyle(count, maxCount);
                  return (
                    <td
                      key={`${dayIndex}-${hour}`}
                      className="h-8 min-w-[60px] text-center text-[11px] tabular-nums border border-gray-100 cursor-default"
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                      }}
                      onMouseEnter={(e) =>
                        handleMouseEnter(e, dayLabel, hour, count)
                      }
                      onMouseLeave={handleMouseLeave}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="font-medium">{tooltip.day} {tooltip.hour}:00</span>
          <span className="mx-1.5 text-gray-400">·</span>
          <span>
            {tooltip.count > 0
              ? `${tooltip.count} resena${tooltip.count > 1 ? 's' : ''} negativa${tooltip.count > 1 ? 's' : ''}`
              : 'Sin resenas negativas'}
          </span>
        </div>
      )}
    </div>
  );
}
