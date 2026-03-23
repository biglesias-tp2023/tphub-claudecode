import { useRef, useState, useCallback, useEffect } from 'react';
import { HealthBadge } from '../HealthBadge';
import { CATEGORY_GANTT_COLORS } from '../../config/objectiveConfig';
import { GanttTooltip } from './GanttTooltip';
import type { StrategicObjective, HealthStatus } from '@/types';

const DEFAULT_LABEL_COL_WIDTH = 260;
const HANDLE_W = 8;
const DRAG_THRESHOLD = 4; // px before drag starts (to distinguish click from drag)

/** Darken a hex color by a given amount (0–1) */
function darkenHex(hex: string, amount = 0.3): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

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
  onDateChange?: (objectiveId: string, startDate: string, endDate: string) => void;
  index: number;
  taskCount?: { completed: number; total: number };
  labelWidth?: number;
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
  onDateChange,
  index,
  taskCount,
  labelWidth = DEFAULT_LABEL_COL_WIDTH,
}: GanttRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  // All drag state in refs to avoid stale closures
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<DragMode>('move');
  const dragStartXRef = useRef(0);
  const dragOrigStartRef = useRef(barStart);
  const dragOrigEndRef = useRef(barEnd);

  // Only this triggers re-render for visual feedback during drag
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const colors = CATEGORY_GANTT_COLORS[objective.category] ?? CATEGORY_GANTT_COLORS.finanzas;

  const windowStartMs = windowStart.getTime();
  const totalMs = totalDays * 86400000;

  // Apply drag offset to compute visual dates
  const mode = isDragging ? dragModeRef.current : null;
  const offsetMs = dragOffsetDays * 86400000;
  const effectiveStartMs = mode === 'resize-end'
    ? barStart.getTime()
    : barStart.getTime() + (isDragging ? offsetMs : 0);
  const effectiveEndMs = mode === 'resize-start'
    ? barEnd.getTime()
    : barEnd.getTime() + (isDragging ? offsetMs : 0);

  const clampedStart = Math.max(effectiveStartMs, windowStartMs);
  const clampedEnd = Math.min(effectiveEndMs, windowStartMs + totalMs);

  const leftPct = ((clampedStart - windowStartMs) / totalMs) * 100;
  const widthPct = Math.max(0, ((clampedEnd - clampedStart) / totalMs) * 100);

  const isClampedLeft = effectiveStartMs < windowStartMs;
  const isClampedRight = effectiveEndMs > windowStartMs + totalMs;

  // Health-based accent override
  const accentColor =
    healthStatus === 'at_risk' ? '#f59e0b' :
    healthStatus === 'off_track' ? '#ef4444' :
    colors.accent;

  const isZebra = index % 2 === 1;
  const zebraBg = isZebra ? 'bg-gray-50/30' : '';

  // Tooltip handlers
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Convert px delta to days
  const pxToDays = useCallback((px: number): number => {
    if (!trackRef.current) return 0;
    const trackWidth = trackRef.current.clientWidth;
    return Math.round((px / trackWidth) * totalDays);
  }, [totalDays]);

  // Unified mousedown handler — starts pending drag
  const handleBarMouseDown = useCallback((e: React.MouseEvent, pendingMode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = false; // not yet — waiting for threshold
    dragModeRef.current = pendingMode;
    dragStartXRef.current = e.clientX;
    dragOrigStartRef.current = barStart;
    dragOrigEndRef.current = barEnd;
    setTooltip(null);

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartXRef.current;

      // Wait for threshold before committing to drag
      if (!isDraggingRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      setDragOffsetDays(pxToDays(dx));
    };

    const handleMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (!isDraggingRef.current) {
        // Was a click, not a drag — only for 'move' mode (center of bar)
        if (pendingMode === 'move') {
          onObjectiveClick(objective);
        }
        isDraggingRef.current = false;
        return;
      }

      // Commit drag: compute final dates
      const finalDx = ev.clientX - dragStartXRef.current;
      const finalOffsetDays = pxToDays(finalDx);
      const finalOffsetMs = finalOffsetDays * 86400000;
      const currentMode = dragModeRef.current;

      let newStart: Date;
      let newEnd: Date;

      if (currentMode === 'move') {
        newStart = new Date(dragOrigStartRef.current.getTime() + finalOffsetMs);
        newEnd = new Date(dragOrigEndRef.current.getTime() + finalOffsetMs);
      } else if (currentMode === 'resize-start') {
        newStart = new Date(dragOrigStartRef.current.getTime() + finalOffsetMs);
        newEnd = dragOrigEndRef.current;
        if (newStart >= newEnd) newStart = new Date(newEnd.getTime() - 7 * 86400000);
      } else {
        newStart = dragOrigStartRef.current;
        newEnd = new Date(dragOrigEndRef.current.getTime() + finalOffsetMs);
        if (newEnd <= newStart) newEnd = new Date(newStart.getTime() + 7 * 86400000);
      }

      const startStr = newStart.toISOString().split('T')[0];
      const endStr = newEnd.toISOString().split('T')[0];
      const origStartStr = dragOrigStartRef.current.toISOString().split('T')[0];
      const origEndStr = dragOrigEndRef.current.toISOString().split('T')[0];

      if ((startStr !== origStartStr || endStr !== origEndStr) && onDateChange) {
        onDateChange(objective.id, startStr, endStr);
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffsetDays(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [barStart, barEnd, pxToDays, onDateChange, onObjectiveClick, objective]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
    };
  }, []);

  return (
    <div className={`flex items-center h-10 hover:bg-gray-50/50 transition-colors group ${zebraBg}`}>
      {/* Sticky label */}
      <div
        className={`sticky left-0 z-10 group-hover:bg-gray-50/50 flex items-center gap-2 px-3 shrink-0 h-full border-r border-gray-100 ${isZebra ? 'bg-gray-50/30' : 'bg-white'}`}
        style={{ width: labelWidth, minWidth: labelWidth }}
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
      >
        {/* Vertical grid lines */}
        {weeks.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: `${(i / weeks.length) * 100}%` }}
          />
        ))}

        {/* Bar */}
        {widthPct > 0 && (
          <div
            className={`absolute top-2 bottom-2 select-none ${isDragging ? 'shadow-lg opacity-75 z-10' : 'hover:shadow-md cursor-grab'}`}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              backgroundColor: colors.bg,
              borderLeft: `3px solid ${accentColor}`,
              borderRight: hasFallbackEnd ? `2px dashed ${accentColor}` : undefined,
              borderRadius: isClampedLeft ? '0 4px 4px 0' : isClampedRight ? '4px 0 0 4px' : '4px',
              minWidth: 6,
              cursor: isDragging ? 'grabbing' : undefined,
            }}
            onMouseDown={(e) => handleBarMouseDown(e, 'move')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Progress fill */}
            {progressPct > 0 && (
              <div
                className="absolute inset-0 rounded-[inherit] pointer-events-none"
                style={{
                  width: `${Math.min(progressPct, 100)}%`,
                  backgroundColor: accentColor,
                  opacity: 0.25,
                }}
              />
            )}

            {/* Title inside bar */}
            {(widthPct / 100) * (trackRef.current?.clientWidth ?? 600) > 80 && (
              <span
                className="absolute inset-0 flex items-center px-2 text-[10px] font-medium truncate pointer-events-none"
                style={{
                  color: darkenHex(accentColor, 0.25),
                  textShadow: '0 0 2px rgba(255,255,255,0.6)',
                  paddingLeft: HANDLE_W + 4,
                  paddingRight: HANDLE_W + 4,
                }}
              >
                {objective.title}
              </span>
            )}

            {/* Left resize handle */}
            {!isClampedLeft && (
              <div
                className="absolute top-0 bottom-0 left-0 cursor-col-resize hover:bg-black/10 active:bg-black/20 transition-colors rounded-l"
                style={{ width: HANDLE_W }}
                onMouseDown={(e) => handleBarMouseDown(e, 'resize-start')}
              />
            )}

            {/* Right resize handle */}
            {!isClampedRight && !hasFallbackEnd && (
              <div
                className="absolute top-0 bottom-0 right-0 cursor-col-resize hover:bg-black/10 active:bg-black/20 transition-colors rounded-r"
                style={{ width: HANDLE_W }}
                onMouseDown={(e) => handleBarMouseDown(e, 'resize-end')}
              />
            )}

            {/* Deadline diamond — only for real deadlines */}
            {!hasFallbackEnd && !isClampedRight && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -right-[3px] pointer-events-none"
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
        {tooltip && !isDragging && (
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

export { DEFAULT_LABEL_COL_WIDTH };
