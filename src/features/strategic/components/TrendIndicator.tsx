/**
 * TrendIndicator Component
 *
 * Shows the velocity trend with an arrow and value.
 * Used in ObjectiveCard to indicate momentum.
 *
 * @example
 * <TrendIndicator trend="up" velocity={150.5} unit="€" />
 * <TrendIndicator trend="down" velocity={-25} />
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TrendDirection } from '@/types';

// ============================================
// TYPES
// ============================================

interface TrendIndicatorProps {
  /** Trend direction */
  trend: TrendDirection;
  /** Velocity value (change per day) */
  velocity: number | null;
  /** Unit for display (€, %, etc.) */
  unit?: string;
  /** Show velocity value */
  showValue?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Format velocity for display
 */
function formatVelocity(velocity: number, unit?: string): string {
  const absValue = Math.abs(velocity);
  let formatted: string;

  if (absValue >= 1000) {
    formatted = `${(absValue / 1000).toFixed(1)}k`;
  } else if (absValue >= 100) {
    formatted = Math.round(absValue).toString();
  } else if (absValue >= 10) {
    formatted = absValue.toFixed(1);
  } else {
    formatted = absValue.toFixed(2);
  }

  const sign = velocity >= 0 ? '+' : '-';
  const unitSuffix = unit ? unit : '';
  return `${sign}${formatted}${unitSuffix}/día`;
}

// ============================================
// CONFIG
// ============================================

const TREND_CONFIG: Record<TrendDirection, {
  icon: typeof TrendingUp;
  color: string;
  bgColor: string;
}> = {
  up: {
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  stable: {
    icon: Minus,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
  },
};

// ============================================
// COMPONENT
// ============================================

export function TrendIndicator({
  trend,
  velocity,
  unit,
  showValue = true,
  size = 'sm',
  className,
}: TrendIndicatorProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'gap-1',
      icon: 'w-3 h-3',
      text: 'text-[10px]',
    },
    md: {
      container: 'gap-1.5',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
    },
  };

  const sizes = sizeClasses[size];

  // Don't show value if velocity is null or stable with no meaningful value
  const shouldShowValue = showValue && velocity !== null && (trend !== 'stable' || Math.abs(velocity) > 0.01);

  return (
    <div className={cn('inline-flex items-center', sizes.container, className)}>
      <div className={cn('p-0.5 rounded', config.bgColor)}>
        <Icon className={cn(sizes.icon, config.color)} />
      </div>
      {shouldShowValue && velocity !== null && (
        <span className={cn(sizes.text, 'font-medium tabular-nums', config.color)}>
          {formatVelocity(velocity, unit)}
        </span>
      )}
    </div>
  );
}

// ============================================
// COMPACT VARIANT (icon only)
// ============================================

interface TrendIconProps {
  trend: TrendDirection;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrendIcon({ trend, size = 'sm', className }: TrendIconProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return <Icon className={cn(iconSize, config.color, className)} />;
}
