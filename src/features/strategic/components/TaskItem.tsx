import { Check, Calendar, User, Tag } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Task, TaskArea, Profile } from '@/types';

// ============================================
// TYPES
// ============================================

interface TaskItemProps {
  task: Task;
  area?: TaskArea;
  owner?: Profile;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onClick?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function TaskItem({
  task,
  area,
  owner,
  onToggleComplete,
  onClick,
}: TaskItemProps) {
  // Format deadline
  const deadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  // Format completed date
  const completedDate = task.completedAt
    ? new Date(task.completedAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0',
        'hover:bg-gray-50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id, !task.isCompleted);
        }}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5',
          'transition-colors',
          task.isCompleted
            ? 'bg-primary-500 border-primary-500'
            : 'border-gray-300 hover:border-primary-400'
        )}
      >
        {task.isCompleted && <Check className="w-4 h-4 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
            task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
          )}
        >
          {task.title}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          {/* Area tag */}
          {area && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tag className="w-3 h-3" />
              {area.name}
            </span>
          )}

          {/* Owner */}
          {owner && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              {owner.fullName || owner.email.split('@')[0]}
            </span>
          )}

          {/* Deadline or completed date */}
          {task.isCompleted && completedDate ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" />
              Completada: {completedDate}
            </span>
          ) : deadline ? (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                new Date(task.deadline!) < new Date() ? 'text-red-500' : 'text-gray-500'
              )}
            >
              <Calendar className="w-3 h-3" />
              {deadline}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
