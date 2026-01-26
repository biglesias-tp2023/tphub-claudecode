import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, CheckCircle2, Clock } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { TaskItem } from './TaskItem';
import type { Task, TaskArea, Profile } from '@/types';

// ============================================
// TYPES
// ============================================

interface TaskListProps {
  pendingTasks: Task[];
  completedTasks: Task[];
  areas: TaskArea[];
  profiles: Profile[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function TaskList({
  pendingTasks,
  completedTasks,
  areas,
  profiles,
  onToggleComplete,
  onTaskClick,
  onAddTask,
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Helper to get area by ID
  const getArea = (areaId: string) => areas.find((a) => a.id === areaId);

  // Helper to get profile by ID
  const getProfile = (ownerId: string | null) =>
    ownerId ? profiles.find((p) => p.id === ownerId) : undefined;

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Tareas Pendientes</h3>
          <span className="text-sm text-gray-500">({pendingTasks.length})</span>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={onAddTask}>
          Nueva tarea
        </Button>
      </div>

      {/* Pending tasks */}
      {pendingTasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay tareas pendientes</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={onAddTask}
          >
            Añadir primera tarea
          </Button>
        </div>
      ) : (
        <div>
          {pendingTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              area={getArea(task.areaId)}
              owner={getProfile(task.ownerId)}
              onToggleComplete={onToggleComplete}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
      )}

      {/* Completed tasks section */}
      {completedTasks.length > 0 && (
        <>
          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Completed header */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            {showCompleted ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-600">
              Tareas completadas
            </span>
            <span className="text-sm text-gray-400">({completedTasks.length})</span>
          </button>

          {/* Completed tasks (collapsible) */}
          {showCompleted && (
            <div className="bg-gray-50/50">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  area={getArea(task.areaId)}
                  owner={getProfile(task.ownerId)}
                  onToggleComplete={onToggleComplete}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
