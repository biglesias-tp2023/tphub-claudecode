import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getCategoryConfig } from '../config';
import type { StrategicTaskWithDetails, ObjectiveCategory } from '@/types';

interface StrategicTaskCalendarItemProps {
  task: StrategicTaskWithDetails;
  onClick?: () => void;
  onToggleComplete?: () => void;
}

/**
 * Get accent color class based on category
 */
function getCategoryAccentColor(category: ObjectiveCategory): string {
  const config = getCategoryConfig(category);
  if (!config) return 'bg-gray-300';

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    pink: 'bg-pink-500',
    amber: 'bg-amber-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
  };

  return colorMap[config.color] || 'bg-gray-300';
}

/**
 * Minimal task item in the calendar view
 */
export function StrategicTaskCalendarItem({
  task,
  onClick,
  onToggleComplete,
}: StrategicTaskCalendarItemProps) {
  const accentColor = getCategoryAccentColor(task.category);

  // Determine responsible display
  const responsibleLabel = task.responsible === 'cliente'
    ? (task.clientName ? getInitials(task.clientName) : 'CL')
    : task.responsible === 'thinkpaladar'
    ? 'TP'
    : task.responsible === 'ambos'
    ? 'A'
    : 'PL';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2.5 py-1.5 px-1 rounded transition-colors cursor-pointer',
        'hover:bg-gray-50',
        task.isCompleted && 'opacity-50'
      )}
      onClick={onClick}
    >
      {/* Completion checkbox - minimal circle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.();
        }}
        className={cn(
          'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all',
          task.isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        {task.isCompleted && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </button>

      {/* Category accent dot */}
      <div className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', accentColor)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-medium text-gray-700 leading-snug',
            task.isCompleted && 'line-through text-gray-400'
          )}
        >
          {task.title}
        </p>

        {/* Meta row - minimal */}
        <div className="flex items-center gap-2 mt-0.5">
          {/* Responsible indicator */}
          <span className="text-[10px] text-gray-400 font-medium">
            {responsibleLabel}
          </span>

          {/* Objective title if available */}
          {task.objectiveTitle && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] text-gray-400 truncate">
                {task.objectiveTitle}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
