import { useState, useMemo } from 'react';
import { Plus, ChevronRight, CheckCircle2, ListTodo } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { StrategicTaskCalendarItem } from './StrategicTaskCalendarItem';
import type { StrategicTaskWithDetails } from '@/types';

interface StrategicTaskCalendarProps {
  tasksByDate: Record<string, StrategicTaskWithDetails[]>;
  sortedDates: string[];
  stats: {
    completed: number;
    pending: number;
    overdue: number;
    total: number;
  };
  onTaskClick: (task: StrategicTaskWithDetails) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onAddTask: () => void;
  isLoading?: boolean;
}

/**
 * Format a date for display in the calendar header
 */
function formatDateHeader(dateStr: string): { dayName: string; dayNumber: string; monthName: string; isToday: boolean; isPast: boolean } {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = date.toDateString() === today.toDateString();
  const isPast = date < today;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayName = dayNames[date.getDay()];
  const dayNumber = date.getDate().toString();
  const monthName = monthNames[date.getMonth()];

  return { dayName, dayNumber, monthName, isToday, isPast };
}

/**
 * Group dates by relative time periods
 */
function groupDatesByPeriod(dates: string[]): { label: string; dates: string[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups: { label: string; dates: string[] }[] = [];

  const overdueDates: string[] = [];
  const todayDates: string[] = [];
  const thisWeekDates: string[] = [];
  const laterDates: string[] = [];

  for (const dateStr of dates) {
    const date = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      overdueDates.push(dateStr);
    } else if (diff === 0) {
      todayDates.push(dateStr);
    } else if (diff <= 7) {
      thisWeekDates.push(dateStr);
    } else {
      laterDates.push(dateStr);
    }
  }

  if (overdueDates.length) groups.push({ label: 'Atrasadas', dates: overdueDates });
  if (todayDates.length) groups.push({ label: 'Hoy', dates: todayDates });
  if (thisWeekDates.length) groups.push({ label: 'Esta semana', dates: thisWeekDates });
  if (laterDates.length) groups.push({ label: 'Próximamente', dates: laterDates });

  return groups;
}

/**
 * Minimal calendar view for strategic tasks
 */
export function StrategicTaskCalendar({
  tasksByDate,
  sortedDates,
  stats,
  onTaskClick,
  onToggleTaskComplete,
  onAddTask,
  isLoading,
}: StrategicTaskCalendarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Atrasadas': true,
    'Hoy': true,
    'Esta semana': true,
    'Próximamente': false,
  });

  const [showCompleted, setShowCompleted] = useState(false);

  // Group dates by period
  const dateGroups = useMemo(() => groupDatesByPeriod(sortedDates), [sortedDates]);

  // Filter tasks based on showCompleted
  const filterTasks = (tasks: StrategicTaskWithDetails[]) => {
    if (showCompleted) return tasks;
    return tasks.filter((t) => !t.isCompleted);
  };

  // Toggle group expansion
  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Handle tasks without deadline
  const noDateTasks = filterTasks(tasksByDate['no-date'] || []);

  return (
    <Card padding="none" className="h-full flex flex-col border-gray-100">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Tareas</h2>
        <button
          onClick={onAddTask}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Stats - Inline, subtle */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">
            <span className="font-medium text-gray-700">{stats.pending}</span> pendientes
          </span>
          {stats.overdue > 0 && (
            <span className="text-red-600">
              <span className="font-medium">{stats.overdue}</span> atrasadas
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={cn(
            'flex items-center gap-1 text-xs transition-colors',
            showCompleted ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>{stats.completed}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
          </div>
        ) : stats.total === 0 ? (
          /* Empty State - Minimal */
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <ListTodo className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Sin tareas</p>
            <p className="text-xs text-gray-400 mb-4">
              Se crean al definir objetivos
            </p>
            <button
              onClick={onAddTask}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Crear tarea
            </button>
          </div>
        ) : (
          <div className="py-2">
            {/* Date groups */}
            {dateGroups.map((group) => {
              const isExpanded = expandedGroups[group.label] ?? true;
              const groupTaskCount = group.dates.reduce(
                (sum, date) => sum + filterTasks(tasksByDate[date] || []).length,
                0
              );

              if (groupTaskCount === 0) return null;

              return (
                <div key={group.label} className="mb-2">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      'w-full flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-colors',
                      group.label === 'Atrasadas' ? 'text-red-600' : 'text-gray-500'
                    )}
                  >
                    <ChevronRight className={cn(
                      'w-3 h-3 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                    {group.label}
                    <span className="text-gray-300 font-normal">({groupTaskCount})</span>
                  </button>

                  {/* Dates in group */}
                  {isExpanded && (
                    <div className="mt-1 space-y-3">
                      {group.dates.map((dateStr) => {
                        const tasks = filterTasks(tasksByDate[dateStr] || []);
                        if (tasks.length === 0) return null;

                        const { dayName, dayNumber, monthName, isToday, isPast } = formatDateHeader(dateStr);

                        return (
                          <div key={dateStr} className="px-4">
                            {/* Date header - Minimal */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn(
                                'flex items-baseline gap-1 text-xs',
                                isToday && 'text-primary-600 font-medium',
                                isPast && !isToday && 'text-red-500',
                                !isToday && !isPast && 'text-gray-400'
                              )}>
                                <span className="text-lg font-semibold tabular-nums">{dayNumber}</span>
                                <span>{monthName}</span>
                                <span className="text-gray-300">·</span>
                                <span>{dayName}</span>
                              </div>
                              {isToday && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">
                                  Hoy
                                </span>
                              )}
                            </div>

                            {/* Tasks for this date */}
                            <div className="space-y-1.5 pl-1">
                              {tasks.map((task) => (
                                <StrategicTaskCalendarItem
                                  key={task.id}
                                  task={task}
                                  onClick={() => onTaskClick(task)}
                                  onToggleComplete={() => onToggleTaskComplete(task.id)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tasks without deadline */}
            {noDateTasks.length > 0 && (
              <div className="px-4 mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs font-medium text-gray-400 mb-2">Sin fecha</p>
                <div className="space-y-1.5 pl-1">
                  {noDateTasks.map((task) => (
                    <StrategicTaskCalendarItem
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onToggleComplete={() => onToggleTaskComplete(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
