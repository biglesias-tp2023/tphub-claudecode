/**
 * useObjectiveProgress Hook
 *
 * Calculates comprehensive progress data for strategic objectives including:
 * - Progress percentage considering baseline and target direction
 * - Health status (on_track, at_risk, off_track, completed, exceeded)
 * - Velocity and trend from historical snapshots
 * - Projected final value
 *
 * @example
 * const progress = useObjectiveProgress(objective);
 * // progress.healthStatus = 'on_track'
 * // progress.progressPercentage = 78
 * // progress.projectedValue = 48500
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useObjectiveKpiValue } from './useObjectiveKpiValue';
import { supabase } from '@/services/supabase';
import type {
  StrategicObjective,
  ObjectiveProgressData,
  HealthStatus,
  TrendDirection,
  ObjectiveSnapshot,
  DbObjectiveSnapshot,
} from '@/types';

// ============================================
// TYPES
// ============================================

interface UseObjectiveProgressParams {
  objective: StrategicObjective;
  /** Whether to fetch snapshots for velocity calculation */
  includeSnapshots?: boolean;
}

// ============================================
// SNAPSHOT FETCHING
// ============================================

/**
 * Map database snapshot to app type
 */
function mapDbSnapshot(db: DbObjectiveSnapshot): ObjectiveSnapshot {
  return {
    id: db.id,
    objectiveId: db.objective_id,
    snapshotDate: db.snapshot_date,
    kpiValue: db.kpi_value,
    progressPercentage: db.progress_percentage,
    daysRemaining: db.days_remaining,
    velocity: db.velocity,
    projectedValue: db.projected_value,
    healthStatus: db.health_status as HealthStatus,
    createdAt: db.created_at,
  };
}

/**
 * Fetch recent snapshots for an objective
 */
async function fetchObjectiveSnapshots(objectiveId: string, limit = 10): Promise<ObjectiveSnapshot[]> {
  const { data, error } = await supabase
    .from('objective_snapshots')
    .select('*')
    .eq('objective_id', objectiveId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[fetchObjectiveSnapshots] Error:', error);
    return [];
  }

  return (data || []).map(mapDbSnapshot);
}

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Calculate progress percentage based on baseline, current, target, and direction
 *
 * For INCREASE: progress = (current - baseline) / (target - baseline) * 100
 * For DECREASE: progress = (baseline - current) / (baseline - target) * 100
 * For MAINTAIN: progress = 100 if within ±5% of target, otherwise scaled
 */
function calculateProgress(
  current: number,
  baseline: number,
  target: number,
  direction: 'increase' | 'decrease' | 'maintain'
): number {
  // Handle edge cases
  if (baseline === target) return current === target ? 100 : 0;

  switch (direction) {
    case 'increase': {
      const delta = target - baseline;
      if (delta === 0) return 100;
      const progress = ((current - baseline) / delta) * 100;
      return Math.max(0, progress); // Don't go below 0
    }
    case 'decrease': {
      const delta = baseline - target;
      if (delta === 0) return 100;
      const progress = ((baseline - current) / delta) * 100;
      return Math.max(0, progress);
    }
    case 'maintain': {
      // For maintain, check if within ±5% tolerance
      const tolerance = target * 0.05;
      const deviation = Math.abs(current - target);
      if (deviation <= tolerance) return 100;
      // Scale based on how far outside tolerance
      const maxDeviation = target * 0.2; // 20% deviation = 0%
      const progress = Math.max(0, (1 - (deviation - tolerance) / maxDeviation) * 100);
      return progress;
    }
    default:
      return 0;
  }
}

/**
 * Calculate expected progress based on time elapsed
 * expectedProgress = (daysElapsed / totalDays) * 100
 */
function calculateExpectedProgress(daysElapsed: number, totalDays: number): number {
  if (totalDays <= 0) return 100;
  return Math.min(100, (daysElapsed / totalDays) * 100);
}

/**
 * Determine health status based on actual vs expected progress ratio
 *
 * completed: status is 'completed' or progress >= 100
 * exceeded: progress >= 110
 * on_track: ratio >= 0.9
 * at_risk: ratio >= 0.7 && < 0.9
 * off_track: ratio < 0.7
 */
function calculateHealthStatus(
  actualProgress: number,
  expectedProgress: number,
  objectiveStatus: string
): HealthStatus {
  // If objective is already marked completed
  if (objectiveStatus === 'completed') {
    return actualProgress >= 110 ? 'exceeded' : 'completed';
  }

  // If progress exceeds target
  if (actualProgress >= 110) return 'exceeded';
  if (actualProgress >= 100) return 'completed';

  // Calculate ratio of actual to expected
  // Avoid division by zero
  if (expectedProgress <= 0) {
    return actualProgress > 0 ? 'on_track' : 'off_track';
  }

  const ratio = actualProgress / expectedProgress;

  if (ratio >= 0.9) return 'on_track';
  if (ratio >= 0.7) return 'at_risk';
  return 'off_track';
}

/**
 * Calculate velocity (change per day) from snapshots
 * Uses linear regression for more stable calculation
 */
function calculateVelocity(snapshots: ObjectiveSnapshot[]): number | null {
  if (snapshots.length < 2) return null;

  // Sort by date ascending
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );

  // Simple linear regression
  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  const firstDate = new Date(sorted[0].snapshotDate).getTime();

  for (let i = 0; i < n; i++) {
    const x = (new Date(sorted[i].snapshotDate).getTime() - firstDate) / (1000 * 60 * 60 * 24); // Days
    const y = sorted[i].kpiValue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;

  // Slope = velocity (change per day)
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

/**
 * Determine trend direction from velocity
 */
function calculateTrend(
  velocity: number | null,
  targetDirection: 'increase' | 'decrease' | 'maintain'
): TrendDirection {
  if (velocity === null) return 'stable';

  // Define threshold for "stable" (less than 1% of typical daily change)
  const threshold = 0.01;

  if (Math.abs(velocity) < threshold) return 'stable';

  // For increase targets: positive velocity is good (up)
  // For decrease targets: negative velocity is good (down)
  if (targetDirection === 'increase') {
    return velocity > 0 ? 'up' : 'down';
  } else if (targetDirection === 'decrease') {
    return velocity < 0 ? 'up' : 'down'; // Inverted: negative velocity is "up" (good)
  }

  // For maintain, any significant change is concerning
  return velocity > 0 ? 'up' : 'down';
}

/**
 * Project final value based on current value, velocity, and days remaining
 */
function calculateProjectedValue(
  currentValue: number,
  velocity: number | null,
  daysRemaining: number
): number | null {
  if (velocity === null || daysRemaining <= 0) return null;
  return currentValue + velocity * daysRemaining;
}

/**
 * Determine if objective will be completed at current pace
 */
function calculateWillComplete(
  projectedValue: number | null,
  target: number,
  _baseline: number,
  direction: 'increase' | 'decrease' | 'maintain'
): boolean {
  if (projectedValue === null) return false;

  switch (direction) {
    case 'increase':
      return projectedValue >= target;
    case 'decrease':
      return projectedValue <= target;
    case 'maintain': {
      const tolerance = target * 0.05;
      return Math.abs(projectedValue - target) <= tolerance;
    }
    default:
      return false;
  }
}

/**
 * Calculate days between two dates
 */
function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook to calculate comprehensive progress data for an objective
 */
export function useObjectiveProgress({
  objective,
  includeSnapshots = true,
}: UseObjectiveProgressParams): ObjectiveProgressData {
  // Fetch current KPI value from real-time data
  const {
    value: currentValue,
    monthLabel,
    isLoading: isLoadingKpi,
  } = useObjectiveKpiValue({
    kpiType: objective.kpiType,
    companyId: objective.companyId,
    brandId: objective.brandId,
    addressId: objective.addressId,
  });

  // Fetch historical snapshots for velocity calculation
  const {
    data: snapshots = [],
    isLoading: isLoadingSnapshots,
  } = useQuery({
    queryKey: ['objective-snapshots', objective.id],
    queryFn: () => fetchObjectiveSnapshots(objective.id),
    enabled: includeSnapshots && !!objective.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate all progress metrics
  const progressData = useMemo((): ObjectiveProgressData => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extract values with defaults
    const baseline = objective.baselineValue ?? 0;
    const target = objective.kpiTargetValue ?? 0;
    const direction = objective.targetDirection ?? 'increase';
    const baselineDate = objective.baselineDate ?? objective.createdAt;
    const evaluationDate = objective.evaluationDate;

    // Calculate time metrics
    const daysElapsed = daysBetween(baselineDate, today);
    const daysRemaining = evaluationDate ? daysBetween(today, evaluationDate) : 0;
    const totalDays = daysElapsed + daysRemaining;

    // Default return for loading state
    if (isLoadingKpi) {
      return {
        currentValue: null,
        progressPercentage: null,
        expectedProgress: null,
        healthStatus: 'off_track',
        velocity: null,
        projectedValue: null,
        willComplete: false,
        trend: 'stable',
        daysElapsed,
        daysRemaining,
        totalDays,
        monthLabel,
        isLoading: true,
      };
    }

    // If no KPI configured or no target, return minimal data
    if (currentValue === null || target === 0) {
      return {
        currentValue,
        progressPercentage: null,
        expectedProgress: null,
        healthStatus: objective.status === 'completed' ? 'completed' : 'off_track',
        velocity: null,
        projectedValue: null,
        willComplete: false,
        trend: 'stable',
        daysElapsed,
        daysRemaining,
        totalDays,
        monthLabel,
        isLoading: false,
      };
    }

    // Calculate progress percentage
    const progressPercentage = calculateProgress(currentValue, baseline, target, direction);

    // Calculate expected progress
    const expectedProgress = calculateExpectedProgress(daysElapsed, totalDays);

    // Calculate health status
    const healthStatus = calculateHealthStatus(progressPercentage, expectedProgress, objective.status);

    // Calculate velocity from snapshots
    const velocity = calculateVelocity(snapshots);

    // Calculate projected value
    const projectedValue = calculateProjectedValue(currentValue, velocity, daysRemaining);

    // Calculate trend
    const trend = calculateTrend(velocity, direction);

    // Determine if will complete
    const willComplete = calculateWillComplete(projectedValue, target, baseline, direction);

    return {
      currentValue,
      progressPercentage,
      expectedProgress,
      healthStatus,
      velocity,
      projectedValue,
      willComplete,
      trend,
      daysElapsed,
      daysRemaining,
      totalDays,
      monthLabel,
      isLoading: false,
    };
  }, [
    objective,
    currentValue,
    snapshots,
    isLoadingKpi,
    monthLabel,
  ]);

  return {
    ...progressData,
    isLoading: isLoadingKpi || (includeSnapshots && isLoadingSnapshots),
  };
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { calculateProgress, calculateHealthStatus, calculateVelocity };
