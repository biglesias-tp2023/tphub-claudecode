/**
 * TaskEmptyState Component
 *
 * Displayed when an objective has no tasks yet.
 * Shows smart suggestions based on the objective's category and type.
 *
 * Features:
 * - Category-specific task suggestions from OBJECTIVE_TASK_TEMPLATES
 * - Quick add button for each suggestion
 * - Fallback to generic "Add task" if no templates available
 *
 * @example
 * <TaskEmptyState
 *   objective={objective}
 *   onAddTask={(title) => createTask(title)}
 *   onAddCustomTask={() => openTaskEditor()}
 * />
 */

import { Lightbulb, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui';
import { getTaskTemplatesForObjective, getCategoryConfig, type TaskTemplate } from '../config';
import type { StrategicObjective, ObjectiveCategory } from '@/types';

// ============================================
// TYPES
// ============================================

interface TaskEmptyStateProps {
  /** The objective to suggest tasks for */
  objective: StrategicObjective;
  /** Callback when a suggested task is clicked */
  onAddTask: (title: string, template?: TaskTemplate) => void;
  /** Callback when "Add custom task" is clicked */
  onAddCustomTask: () => void;
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
  /** Custom class name */
  className?: string;
}

// ============================================
// GENERIC SUGGESTIONS BY CATEGORY
// ============================================

/**
 * Fallback suggestions when no specific templates exist for the objective type
 */
const GENERIC_SUGGESTIONS: Record<ObjectiveCategory, string[]> = {
  finanzas: [
    'Analizar datos financieros actuales',
    'Definir métricas de seguimiento',
    'Preparar informe de progreso',
  ],
  operaciones: [
    'Auditar procesos actuales',
    'Identificar cuellos de botella',
    'Definir métricas operativas',
  ],
  clientes: [
    'Analizar comportamiento de clientes',
    'Segmentar base de clientes',
    'Diseñar estrategia de retención',
  ],
  marca: [
    'Auditar imagen de marca actual',
    'Definir objetivos de comunicación',
    'Preparar calendario de acciones',
  ],
  reputacion: [
    'Revisar reviews actuales',
    'Responder reviews pendientes',
    'Diseñar estrategia de mejora',
  ],
  proveedores: [
    'Identificar necesidades',
    'Investigar opciones disponibles',
    'Preparar comparativa de propuestas',
  ],
  menu: [
    'Analizar carta actual',
    'Identificar oportunidades de mejora',
    'Preparar propuesta de cambios',
  ],
};

// ============================================
// HELPERS
// ============================================

function getSuggestionsForObjective(
  objective: StrategicObjective,
  maxSuggestions: number
): { title: string; template?: TaskTemplate }[] {
  // First try to get templates for this specific objective type
  const templates = getTaskTemplatesForObjective(objective.objectiveTypeId || '');

  if (templates.length > 0) {
    // Return first N templates
    return templates.slice(0, maxSuggestions).map((t) => ({
      title: t.title,
      template: t,
    }));
  }

  // Fallback to generic category suggestions
  const category = objective.category as ObjectiveCategory;
  const genericSuggestions = GENERIC_SUGGESTIONS[category] || [];

  return genericSuggestions.slice(0, maxSuggestions).map((title) => ({ title }));
}

// ============================================
// COMPONENT
// ============================================

export function TaskEmptyState({
  objective,
  onAddTask,
  onAddCustomTask,
  maxSuggestions = 3,
  className,
}: TaskEmptyStateProps) {
  const suggestions = getSuggestionsForObjective(objective, maxSuggestions);
  const categoryConfig = getCategoryConfig(objective.category as ObjectiveCategory);
  const hasTemplates = suggestions.some((s) => s.template);

  return (
    <div className={cn('py-6 px-4', className)}>
      {/* Empty state header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <CheckCircle2 className="w-6 h-6 text-gray-400" />
        </div>
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          No hay tareas todavía
        </h4>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          {hasTemplates
            ? 'Te sugerimos algunas tareas basadas en este tipo de objetivo'
            : 'Añade tareas para hacer seguimiento del progreso'}
        </p>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-3 justify-center">
            <Sparkles className={cn(
              'w-3.5 h-3.5',
              categoryConfig?.textColor || 'text-gray-500'
            )} />
            <span className="text-xs font-medium text-gray-600">
              Sugerencias
            </span>
          </div>

          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onAddTask(suggestion.title, suggestion.template)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'border border-gray-100 bg-white',
                  'hover:border-gray-200 hover:bg-gray-50',
                  'transition-all group text-left'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                  'bg-gray-50 group-hover:bg-white',
                  'border border-gray-100 group-hover:border-gray-200'
                )}>
                  <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                </div>

                <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                  {suggestion.title}
                </span>

                {suggestion.template && (
                  <div className={cn(
                    'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                    categoryConfig?.bgColor || 'bg-gray-50',
                    categoryConfig?.textColor || 'text-gray-600'
                  )}>
                    <Lightbulb className="w-3 h-3 inline mr-0.5" />
                    Auto
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom task button */}
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAddCustomTask}
        >
          Añadir tarea personalizada
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPACT VARIANT (for inline use)
// ============================================

interface TaskSuggestionsInlineProps {
  objective: StrategicObjective;
  onAddTask: (title: string, template?: TaskTemplate) => void;
  maxSuggestions?: number;
  className?: string;
}

/**
 * Compact inline version showing only suggested tasks
 */
export function TaskSuggestionsInline({
  objective,
  onAddTask,
  maxSuggestions = 2,
  className,
}: TaskSuggestionsInlineProps) {
  const suggestions = getSuggestionsForObjective(objective, maxSuggestions);

  if (suggestions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onAddTask(suggestion.title, suggestion.template)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-md',
            'text-xs text-gray-600 bg-gray-50',
            'hover:bg-gray-100 hover:text-gray-800',
            'transition-colors'
          )}
        >
          <Plus className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{suggestion.title}</span>
        </button>
      ))}
    </div>
  );
}
