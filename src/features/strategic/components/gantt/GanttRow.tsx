import { useRef, useState, useCallback } from 'react';
import { HealthBadge } from '../HealthBadge';
import { CATEGORY_GANTT_COLORS } from '../../config/objectiveConfig';
import { GanttTooltip } from './GanttTooltip';
import type { StrategicObjective, HealthStatus } from '@/types';

const LABEL_COL_WIDTH = 260;
const WEEK_COL_WIDTH = 56;

/** Darken a hex color by a given amount (0–1) */
function darkenHex(hex: string, amount = 0.3): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface GanttRowProps {
  objective: StrategicObjective;
  weeks: Date[];
  windowStart: Date;
  totalDays: number;
  healthStatus: HealthStatus;
  progressPct: number;
  barStart: Date;
  barEnd: Date;
  hasFallbackEnd: boolean;
  onObjectiveClick: (objective: StrategicObjective) => void;
  index: number;
  taskCount?: { completed: number; total: number };
}

export function GanttRow({
  objective,
  weeks,
  windowStart,
  totalDays,
  healthStatus,
  progressPct,
  barStart,
  barEnd,
  hasFallbackEnd,
  onObjectiveClick,
  index,
  taskCount,
}: GanttRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const colors = CATEGORY_GANTT_COLORS[objective.category] ?? CATEGORY_GANTT_COLORS.finanzas;

  // Compute bar position as % of total track
  const trackWidth = weeks.length * WEEK_COL_WIDTH;
  const windowStartMs = windowStart.getTime();
  const totalMs = totalDays * 86400000;

  const clampedStart = Math.max(barStart.getTime(), windowStartMs);
  const clampedEnd = Math.min(barEnd.getTime(), windowStartMs + totalMs);

  const leftPct = ((clampedStart - windowStartMs) / totalMs) * 100;
  const widthPct = ((clampedEnd - clampedStart) / totalMs) * 100;

  const isClampedLeft = barStart.getTime() < windowStartMs;
  const isClampedRight = barEnd.getTime() > windowStartMs + totalMs;

  const barWidthPx = (widthPct / 100) * trackWidth;
  const showTitle = barWidthPx > 60;

  // Health-based accent override
  const accentColor =
    healthStatus === 'at_risk' ? '#f59e0b' :
    healthStatus === 'off_track' ? '#ef4444' :
    colors.accent;

  const isZebra = index % 2 === 1;
  const zebraBg = isZebra ? 'bg-gray-50/30' : '';

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className={`flex items-center h-10 hover:bg-gray-50/50 transition-colors group ${zebraBg}`}>
      {/* Sticky label */}
      <div
        className={`sticky left-0 z-10 group-hover:bg-gray-50/50 flex items-center gap-2 px-3 shrink-0 h-full border-r border-gray-100 ${isZebra ? 'bg-gray-50/30' : 'bg-white'}`}
        style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: colors.accent }}
        />
        <span className="text-xs text-gray-700 truncate flex-1">{objective.title}</span>
        <HealthBadge status={healthStatus} size="sm" showLabel={false} className="shrink-0" />
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-full flex-1"
        style={{ minWidth: trackWidth }}
      >
        {/* Vertical grid lines */}
        {weeks.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: i * WEEK_COL_WIDTH }}
          />
        ))}

        {/* Bar */}
        {widthPct > 0 && (
          <div
            className="absolute top-2 bottom-2 cursor-pointer transition-shadow hover:shadow-md"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              backgroundColor: colors.bg,
              borderLeft: `3px solid ${accentColor}`,
              borderRight: hasFallbackEnd ? `2px dashed ${accentColor}` : undefined,
              borderRadius: isClampedLeft ? '0 4px 4px 0' : isClampedRight ? '4px 0 0 4px' : '4px',
              minWidth: 6,
            }}
            onClick={() => onObjectiveClick(objective)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Progress fill */}
            {progressPct > 0 && (
              <div
                className="absolute inset-0 rounded-[inherit]"
                style={{
                  width: `${Math.min(progressPct, 100)}%`,
                  backgroundColor: accentColor,
                  opacity: 0.25,
                }}
              />
            )}

            {/* Title inside bar */}
            {showTitle && (
              <span
                className="absolute inset-0 flex items-center px-2 text-[10px] font-medium truncate"
                style={{
                  color: darkenHex(accentColor, 0.25),
                  textShadow: '0 0 2px rgba(255,255,255,0.6)',
                }}
              >
                {objective.title}
              </span>
            )}

            {/* Deadline diamond — only for real deadlines */}
            {!hasFallbackEnd && !isClampedRight && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -right-[3px]"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: accentColor,
                  transform: 'translateY(-50%) rotate(45deg)',
                }}
              />
            )}
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <GanttTooltip
            objective={objective}
            healthStatus={healthStatus}
            progressPct={progressPct}
            position={tooltip}
            hasFallbackEnd={hasFallbackEnd}
            taskCount={taskCount}
          />
        )}
      </div>
    </div>
  );
}

export { LABEL_COL_WIDTH, WEEK_COL_WIDTH };
