import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ObjectiveCard, AddObjectiveCard } from './index';
import { getHorizonInfo } from '../hooks';
import { cn } from '@/utils/cn';
import type { StrategicObjective, ObjectiveHorizon, ObjectiveStatus } from '@/types';

interface HorizonSectionProps {
  horizon: ObjectiveHorizon;
  objectives: StrategicObjective[];
  onAddClick: () => void;
  onObjectiveClick: (objective: StrategicObjective) => void;
  onStatusChange: (id: string, status: ObjectiveStatus) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  taskCountByObjectiveId: Record<string, { completed: number; total: number }>;
}

export function HorizonSection({
  horizon,
  objectives,
  onAddClick,
  onObjectiveClick,
  onStatusChange,
  isExpanded,
  onToggleExpand,
  taskCountByObjectiveId,
}: HorizonSectionProps) {
  const horizonInfo = getHorizonInfo(horizon);
  const completedCount = objectives.filter((o) => o.status === 'completed').length;
  const totalCount = objectives.length;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Section Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center transition-colors',
            isExpanded ? 'bg-gray-100' : 'bg-transparent group-hover:bg-gray-50'
          )}>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
          <span className="text-sm font-semibold text-gray-900">{horizonInfo.label}</span>
          <span className="text-xs text-gray-400">{horizonInfo.subtitle}</span>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-xs font-medium tabular-nums',
              completedCount === totalCount ? 'text-emerald-600' : 'text-gray-400'
            )}>
              {completedCount}/{totalCount}
            </span>
            {completedCount === totalCount && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
        )}
      </button>

      {/* Objectives Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 ml-7">
          {objectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onClick={() => onObjectiveClick(objective)}
              onStatusChange={onStatusChange}
              taskCount={taskCountByObjectiveId[objective.id]}
            />
          ))}
          <AddObjectiveCard horizon={horizon} onClick={onAddClick} />
        </div>
      )}
    </div>
  );
}
