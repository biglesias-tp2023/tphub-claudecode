import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { HealthBadge } from '../HealthBadge';
import { CATEGORIES } from '../../config/objectiveConfig';
import type { StrategicObjective, HealthStatus } from '@/types';

const RESPONSIBLE_LABELS: Record<string, string> = {
  thinkpaladar: 'ThinkPaladar',
  cliente: 'Cliente',
  ambos: 'Ambos',
  plataforma: 'Plataforma',
};

interface GanttTooltipProps {
  objective: StrategicObjective;
  healthStatus: HealthStatus;
  progressPct: number;
  position: { x: number; y: number };
  hasFallbackEnd: boolean;
  taskCount?: { completed: number; total: number };
}

export function GanttTooltip({ objective, healthStatus, progressPct, position, hasFallbackEnd, taskCount }: GanttTooltipProps) {
  const category = CATEGORIES.find(c => c.id === objective.category);
  const startLabel = new Date(objective.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const endLabel = objective.evaluationDate
    ? new Date(objective.evaluationDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // Edge clamp: tooltip is w-64 (256px), half = 128, pad to 140
  const clampedX = Math.max(140, Math.min(position.x, window.innerWidth - 140));

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: clampedX, top: position.y }}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3.5 py-3 text-xs w-64 -translate-x-1/2 translate-y-2">
        {/* Title */}
        <p className="font-semibold text-sm leading-tight mb-2 line-clamp-2">{objective.title}</p>

        {/* Category badge */}
        {category && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {category.label}
          </span>
        )}

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-gray-300 mb-1.5">
          <span>{startLabel}</span>
          <span>&rarr;</span>
          {endLabel ? (
            <span>{endLabel}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <AlertCircle className="w-3 h-3" />
              Sin fecha límite
            </span>
          )}
          {hasFallbackEnd && endLabel && <span className="text-gray-500">(est.)</span>}
        </div>

        {/* Tasks count */}
        {taskCount && taskCount.total > 0 && (
          <div className="text-gray-400 mb-1.5">
            {taskCount.total} {taskCount.total === 1 ? 'tarea' : 'tareas'} ({taskCount.completed} {taskCount.completed === 1 ? 'completada' : 'completadas'})
          </div>
        )}

        {/* Health + progress */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
          <HealthBadge status={healthStatus} size="sm" showLabel />
          <span className="text-gray-400">{progressPct}% progreso</span>
        </div>

        {/* Responsible */}
        <div className="text-gray-400 mt-1.5">
          {RESPONSIBLE_LABELS[objective.responsible] || objective.responsible}
        </div>

        {/* Arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>,
    document.body
  );
}
