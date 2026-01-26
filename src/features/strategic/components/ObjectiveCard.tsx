import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, User, Building2, Users, Briefcase } from 'lucide-react';
import { cn } from '@/utils/cn';
import { calculateProgress, formatKpiValue } from '../hooks/useStrategicData';
import { getCategoryConfig, getObjectiveTypeConfig } from '../config';
import type { StrategicObjective, ObjectiveStatus, ObjectiveCategory } from '@/types';

// ============================================
// TYPES
// ============================================

interface ObjectiveCardProps {
  objective: StrategicObjective;
  onClick?: () => void;
  onStatusChange?: (id: string, status: ObjectiveStatus) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
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

function calculateDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDaysRemaining(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d`;
  if (days === 0) return 'Hoy';
  return `${days}d`;
}

// ============================================
// STATUS DROPDOWN COMPONENT (Minimal)
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
      {/* Trigger */}
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

      {/* Dropdown */}
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
}: ObjectiveCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const categoryConfig = getCategoryConfig(objective.category as ObjectiveCategory);
  const objectiveTypeConfig = getObjectiveTypeConfig(objective.objectiveTypeId);

  const progress = calculateProgress(objective);
  const daysRemaining = calculateDaysRemaining(objective.evaluationDate);
  const daysText = formatDaysRemaining(daysRemaining);
  const responsibleInfo = RESPONSIBLE_LABELS[objective.responsible] || RESPONSIBLE_LABELS.thinkpaladar;
  const ResponsibleIcon = responsibleInfo.icon;

  const handleStatusChange = (newStatus: ObjectiveStatus) => {
    if (onStatusChange) {
      onStatusChange(objective.id, newStatus);
    }
  };

  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg border transition-all cursor-pointer',
        'hover:shadow-sm hover:border-gray-200',
        isDragging && 'shadow-lg ring-2 ring-primary-500',
        objective.status === 'completed' ? 'border-gray-100 opacity-75' : 'border-gray-100'
      )}
      onClick={onClick}
    >
      {/* Category accent line */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-0.5 rounded-full',
          categoryConfig?.bgColor || 'bg-gray-200'
        )}
      />

      <div className="p-3 pl-4">
        {/* Top row: Category + Status */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            categoryConfig?.textColor || 'text-gray-500'
          )}>
            {categoryConfig?.label || objective.category}
          </span>
          <StatusDropdown
            currentStatus={objective.status}
            onStatusChange={handleStatusChange}
            isOpen={isStatusOpen}
            onToggle={() => setIsStatusOpen(!isStatusOpen)}
            onClose={() => setIsStatusOpen(false)}
          />
        </div>

        {/* Title */}
        <h3 className={cn(
          'text-sm font-medium text-gray-900 mb-1 line-clamp-2 leading-snug',
          objective.status === 'completed' && 'line-through text-gray-400'
        )}>
          {objective.title}
        </h3>

        {/* Objective type (if different from title) */}
        {objectiveTypeConfig && objectiveTypeConfig.label !== objective.title && (
          <p className="text-[11px] text-gray-400 mb-2 truncate">
            {objectiveTypeConfig.label}
          </p>
        )}

        {/* KPI Progress (if available) */}
        {objective.kpiTargetValue && (
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-lg font-semibold text-gray-900 tabular-nums">
                {formatKpiValue(objective.kpiCurrentValue, objective.kpiUnit)}
              </span>
              <span className="text-xs text-gray-400">
                / {formatKpiValue(objective.kpiTargetValue, objective.kpiUnit)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  progress >= 100 ? 'bg-emerald-500' :
                  progress >= 75 ? 'bg-primary-500' :
                  progress >= 50 ? 'bg-amber-500' : 'bg-red-400'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: Days + Responsible */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          {daysText ? (
            <div className={cn(
              'flex items-center gap-1 text-[11px] font-medium',
              isOverdue && 'text-red-500',
              isUrgent && !isOverdue && 'text-amber-500',
              !isOverdue && !isUrgent && 'text-gray-400'
            )}>
              <Clock className="w-3 h-3" />
              {isOverdue ? (
                <span>{daysText} atrasado</span>
              ) : (
                <span>{daysText}</span>
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <ResponsibleIcon className="w-3 h-3" />
            <span>{responsibleInfo.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADD OBJECTIVE CARD (Minimal)
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
        'w-full h-full min-h-[100px] rounded-lg border border-dashed border-gray-200',
        'flex items-center justify-center',
        'text-gray-400 hover:text-gray-500 hover:border-gray-300 hover:bg-gray-50/50',
        'transition-all cursor-pointer'
      )}
    >
      <span className="text-xl font-light">+</span>
    </button>
  );
}
