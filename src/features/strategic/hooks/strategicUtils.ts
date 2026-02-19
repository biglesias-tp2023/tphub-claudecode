import type {
  StrategicObjective,
  ObjectiveHorizon,
  ObjectiveStatus,
} from '@/types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get horizon display info
 */
export function getHorizonInfo(horizon: ObjectiveHorizon) {
  const info = {
    short: { label: 'Corto Plazo', subtitle: '0-3 meses', color: 'blue' },
    medium: { label: 'Medio Plazo', subtitle: '3-12 meses', color: 'purple' },
    long: { label: 'Largo Plazo', subtitle: '+1 año', color: 'gray' },
  };
  return info[horizon];
}

/**
 * Get status display info
 */
export function getStatusInfo(status: ObjectiveStatus) {
  const info = {
    pending: { label: 'Pendiente', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    in_progress: { label: 'En Progreso', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    completed: { label: 'Cumplido', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  };
  return info[status];
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: string) {
  const info: Record<string, { label: string; icon: string; color: string }> = {
    financiero: { label: 'Financiero', icon: 'TrendingUp', color: 'green' },
    operaciones: { label: 'Operaciones', icon: 'Clock', color: 'purple' },
    reputacion: { label: 'Reputación', icon: 'Star', color: 'yellow' },
    marketing: { label: 'Marketing', icon: 'Megaphone', color: 'pink' },
    otro: { label: 'Otro', icon: 'MoreHorizontal', color: 'gray' },
  };
  return info[category] || info.otro;
}

/**
 * Calculate progress percentage for an objective
 */
export function calculateProgress(objective: StrategicObjective): number {
  if (!objective.kpiCurrentValue || !objective.kpiTargetValue) {
    return 0;
  }
  const progress = (objective.kpiCurrentValue / objective.kpiTargetValue) * 100;
  return Math.min(Math.round(progress), 100);
}

/**
 * Format KPI value for display
 */
export function formatKpiValue(value: number | null, unit: string | null): string {
  if (value === null) return '-';

  const formattedValue = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toFixed(value % 1 === 0 ? 0 : 1);

  return unit ? `${formattedValue}${unit}` : formattedValue;
}
