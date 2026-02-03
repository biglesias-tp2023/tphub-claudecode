/**
 * ObjectiveCard Component
 *
 * Displays a strategic objective with progress visualization, health status,
 * and projection alerts. Uses useObjectiveProgress for calculated metrics.
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │ ┌─────┐  CATEGORÍA      [HealthBadge]  │
 * │ │ 78% │  Título del objetivo            │
 * │ │ ◐   │                    TrendIndicator│
 * │ └─────┘  Actual: X  →  Obj: Y           │
 * │ ════════════════════════════════════════│
 * │ ⚠️ Proyección: Llegarás a ~Z            │
 * │ ─────────────────────────────────────── │
 * │ ⏰ 15d    📋 3/5 tareas    👤 Responsable│
 * └─────────────────────────────────────────┘
 */

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, User, Building2, Users, Briefcase, AlertTriangle, CheckSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatKpiValue } from '../hooks/useStrategicData';
import { useObjectiveProgress } from '../hooks/useObjectiveProgress';
import { getCategoryConfig } from '../config';
import { ProgressCircle, getProgressCircleColor } from './ProgressCircle';
import { HealthBadge } from './HealthBadge';
import { TrendIndicator } from './TrendIndicator';
import type { StrategicObjective, ObjectiveStatus, ObjectiveCategory } from '@/types';

// ============================================
// TYPES
// ============================================

interface ObjectiveCardProps {
  objective: StrategicObjective;
  onClick?: () => void;
  onStatusChange?: (id: string, status: ObjectiveStatus) => void;
  isDragging?: boolean;
  /** Task count for this objective (passed from parent) */
  taskCount?: { completed: number; total: number };
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_OPTIONS: { value: ObjectiveStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'text-gray-500' },
  { value: 'in_progress', label: 'En progreso', color: 'text-primary-600' },
  { value: 'completed', label: 'Completado', color: 'text-emerald-600' },
];

const RESPONSIBLE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  thinkpaladar: { label: 'TP', icon: Building2 },
  cliente: { label: 'Cliente', icon: User },
  ambos: { label: 'Ambos', icon: Users },
  plataforma: { label: 'Platform', icon: Briefcase },
};

// ============================================
// HELPERS
// ============================================

function formatDaysRemaining(days: number): string {
  if (days < 0) return `${Math.abs(days)}d atrasado`;
  if (days === 0) return 'Hoy';
  return `${days}d`;
}

function formatProjectedValue(value: number | null, unit: string | null): string {
  if (value === null) return '-';
  return formatKpiValue(value, unit);
}

// ============================================
// STATUS DROPDOWN COMPONENT
// ============================================

interface StatusDropdownProps {
  currentStatus: ObjectiveStatus;
  onStatusChange: (status: ObjectiveStatus) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function StatusDropdown({ currentStatus, onStatusChange, isOpen, onToggle, onClose }: StatusDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus) || STATUS_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all',
          currentStatus === 'completed' && 'bg-emerald-50 text-emerald-600',
          currentStatus === 'in_progress' && 'bg-primary-50 text-primary-600',
          currentStatus === 'pending' && 'bg-gray-50 text-gray-500',
          'hover:ring-1 hover:ring-gray-200'
        )}
      >
        {currentStatus === 'in_progress' && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary-400 animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-500" />
          </span>
        )}
        {currentOption.label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] py-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(option.value);
                onClose();
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left',
                option.value === currentStatus ? 'bg-gray-50' : 'hover:bg-gray-50',
                option.color
              )}
            >
              {option.label}
              {option.value === currentStatus && (
                <span className="ml-auto text-[10px]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ObjectiveCard({
  objective,
  onClick,
  onStatusChange,
  isDragging = false,
  taskCount,
}: ObjectiveCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const categoryConfig = getCategoryConfig(objective.category as ObjectiveCategory);

  // Get comprehensive progress data
  const progress = useObjectiveProgress({ objective });

  const responsibleInfo = RESPONSIBLE_LABELS[objective.responsible] || RESPONSIBLE_LABELS.thinkpaladar;
  const ResponsibleIcon = responsibleInfo.icon;

  const handleStatusChange = (newStatus: ObjectiveStatus) => {
    if (onStatusChange) {
      onStatusChange(objective.id, newStatus);
    }
  };

  // Determine if we should show KPI data (has KPI configured)
  const hasKpi = !!objective.kpiType && !!objective.kpiTargetValue;

  // Circle color based on health status
  const circleColor = getProgressCircleColor(progress.healthStatus);

  // Show projection alert if at_risk or off_track and not going to complete
  const showProjectionAlert =
    hasKpi &&
    !progress.willComplete &&
    progress.projectedValue !== null &&
    (progress.healthStatus === 'at_risk' || progress.healthStatus === 'off_track');

  // Days display
  const isOverdue = progress.daysRemaining < 0;
  const isUrgent = progress.daysRemaining >= 0 && progress.daysRemaining <= 7;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border transition-all cursor-pointer',
        'hover:shadow-md hover:border-gray-200',
        isDragging && 'shadow-lg ring-2 ring-primary-500',
        objective.status === 'completed' ? 'border-gray-100 opacity-80' : 'border-gray-100'
      )}
      onClick={onClick}
    >
      {/* Category accent line */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-full',
          categoryConfig?.bgColor || 'bg-gray-200'
        )}
      />

      <div className="p-4 pl-5">
        {/* Top row: Category + Health Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            categoryConfig?.textColor || 'text-gray-500'
          )}>
            {categoryConfig?.label || objective.category}
          </span>
          {hasKpi && !progress.isLoading && (
            <HealthBadge status={progress.healthStatus} size="sm" />
          )}
        </div>

        {/* Main content: Circle + Info */}
        <div className="flex gap-4">
          {/* Progress Circle */}
          {hasKpi && (
            <div className="flex-shrink-0">
              {progress.isLoading ? (
                <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
              ) : (
                <ProgressCircle
                  value={progress.progressPercentage}
                  size={56}
                  strokeWidth={5}
                  color={circleColor}
                />
              )}
            </div>
          )}

          {/* Title and values */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={cn(
              'text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1',
              objective.status === 'completed' && 'line-through text-gray-400'
            )}>
              {objective.title}
            </h3>

            {/* Trend indicator (if has velocity data) */}
            {hasKpi && !progress.isLoading && progress.velocity !== null && (
              <div className="mb-2">
                <TrendIndicator
                  trend={progress.trend}
                  velocity={progress.velocity}
                  unit={objective.kpiUnit || undefined}
                  size="sm"
                />
              </div>
            )}

            {/* KPI Values: Actual → Objetivo */}
            {hasKpi && !progress.isLoading && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">
                  Actual:{' '}
                  <span className="font-medium text-gray-700">
                    {progress.currentValue !== null
                      ? formatKpiValue(progress.currentValue, objective.kpiUnit)
                      : '-'}
                  </span>
                </span>
                <span className="text-gray-300">→</span>
                <span className="text-gray-500">
                  Obj:{' '}
                  <span className="font-medium text-gray-700">
                    {formatKpiValue(objective.kpiTargetValue!, objective.kpiUnit)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Projection Alert (if at risk and won't complete) */}
        {showProjectionAlert && (
          <div className={cn(
            'mt-3 px-3 py-2 rounded-lg flex items-start gap-2',
            progress.healthStatus === 'off_track'
              ? 'bg-red-50 border border-red-100'
              : 'bg-amber-50 border border-amber-100'
          )}>
            <AlertTriangle className={cn(
              'w-4 h-4 flex-shrink-0 mt-0.5',
              progress.healthStatus === 'off_track' ? 'text-red-500' : 'text-amber-500'
            )} />
            <div>
              <p className={cn(
                'text-xs font-medium',
                progress.healthStatus === 'off_track' ? 'text-red-700' : 'text-amber-700'
              )}>
                Proyección: {formatProjectedValue(progress.projectedValue, objective.kpiUnit)}
              </p>
              <p className={cn(
                'text-[10px]',
                progress.healthStatus === 'off_track' ? 'text-red-600' : 'text-amber-600'
              )}>
                {progress.healthStatus === 'off_track'
                  ? 'No alcanzarás el objetivo al ritmo actual'
                  : 'Riesgo de no alcanzar el objetivo'}
              </p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 mt-3 pt-3">
          {/* Footer: Days + Tasks + Status + Responsible */}
          <div className="flex items-center justify-between">
            {/* Left side: Days + Tasks */}
            <div className="flex items-center gap-3">
              {/* Days remaining */}
              {objective.evaluationDate && (
                <div className={cn(
                  'flex items-center gap-1 text-[11px] font-medium',
                  isOverdue && 'text-red-500',
                  isUrgent && !isOverdue && 'text-amber-500',
                  !isOverdue && !isUrgent && 'text-gray-400'
                )}>
                  <Clock className="w-3 h-3" />
                  <span>{formatDaysRemaining(progress.daysRemaining)}</span>
                </div>
              )}

              {/* Task count */}
              {taskCount && taskCount.total > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <CheckSquare className="w-3 h-3" />
                  <span className="tabular-nums">
                    {taskCount.completed}/{taskCount.total}
                  </span>
                </div>
              )}
            </div>

            {/* Right side: Status + Responsible */}
            <div className="flex items-center gap-2">
              {/* Status dropdown */}
              <StatusDropdown
                currentStatus={objective.status}
                onStatusChange={handleStatusChange}
                isOpen={isStatusOpen}
                onToggle={() => setIsStatusOpen(!isStatusOpen)}
                onClose={() => setIsStatusOpen(false)}
              />

              {/* Responsible */}
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <ResponsibleIcon className="w-3 h-3" />
                <span>{responsibleInfo.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADD OBJECTIVE CARD
// ============================================

interface AddObjectiveCardProps {
  horizon: string;
  onClick: () => void;
}

export function AddObjectiveCard({ onClick }: AddObjectiveCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full h-full min-h-[140px] rounded-xl border border-dashed border-gray-200',
        'flex items-center justify-center',
        'text-gray-400 hover:text-gray-500 hover:border-gray-300 hover:bg-gray-50/50',
        'transition-all cursor-pointer'
      )}
    >
      <span className="text-2xl font-light">+</span>
    </button>
  );
}
