/**
 * ProgressCircle Component
 *
 * Animated SVG circular progress indicator with percentage display.
 * Used in ObjectiveCard to show progress towards goal.
 *
 * @example
 * <ProgressCircle value={78} color="green" size={64} />
 * <ProgressCircle value={100} color="emerald" showIcon />
 */

import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

// ============================================
// TYPES
// ============================================

export type ProgressCircleColor = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray' | 'emerald' | 'primary';

interface ProgressCircleProps {
  /** Progress value (0-100+) */
  value: number | null;
  /** Circle size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Color theme */
  color?: ProgressCircleColor;
  /** Show percentage text inside */
  showValue?: boolean;
  /** Show checkmark icon when complete (overrides showValue at 100%) */
  showIcon?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// COLOR MAPPING
// ============================================

const COLOR_CONFIG: Record<ProgressCircleColor, { stroke: string; bg: string; text: string }> = {
  green: {
    stroke: 'stroke-emerald-500',
    bg: 'stroke-emerald-100',
    text: 'text-emerald-600',
  },
  emerald: {
    stroke: 'stroke-emerald-500',
    bg: 'stroke-emerald-100',
    text: 'text-emerald-600',
  },
  yellow: {
    stroke: 'stroke-amber-500',
    bg: 'stroke-amber-100',
    text: 'text-amber-600',
  },
  red: {
    stroke: 'stroke-red-500',
    bg: 'stroke-red-100',
    text: 'text-red-600',
  },
  blue: {
    stroke: 'stroke-blue-500',
    bg: 'stroke-blue-100',
    text: 'text-blue-600',
  },
  purple: {
    stroke: 'stroke-violet-500',
    bg: 'stroke-violet-100',
    text: 'text-violet-600',
  },
  gray: {
    stroke: 'stroke-gray-400',
    bg: 'stroke-gray-100',
    text: 'text-gray-500',
  },
  primary: {
    stroke: 'stroke-primary-500',
    bg: 'stroke-primary-100',
    text: 'text-primary-600',
  },
};

// ============================================
// COMPONENT
// ============================================

export function ProgressCircle({
  value,
  size = 56,
  strokeWidth = 5,
  color = 'green',
  showValue = true,
  showIcon = false,
  className,
}: ProgressCircleProps) {
  // Calculate SVG dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp value between 0 and 100 for display, but allow showing >100%
  const displayValue = value ?? 0;
  const clampedValue = Math.min(Math.max(displayValue, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  const colors = COLOR_CONFIG[color];

  // Format value for display
  const formattedValue = value === null ? '-' : `${Math.round(displayValue)}%`;

  // Show checkmark icon when complete and showIcon is true
  const shouldShowIcon = showIcon && clampedValue >= 100;
  const iconSize = Math.max(size * 0.35, 14);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.bg}
        />

        {/* Progress circle */}
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={cn(colors.stroke, 'transition-all duration-500 ease-out')}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        )}
      </svg>

      {/* Center content: Icon or text */}
      <div className="absolute inset-0 flex items-center justify-center">
        {shouldShowIcon ? (
          <Check
            className={cn(colors.text, 'animate-in zoom-in duration-300')}
            style={{ width: iconSize, height: iconSize }}
            strokeWidth={3}
          />
        ) : showValue ? (
          <span
            className={cn(
              'font-semibold tabular-nums',
              colors.text,
              size >= 56 ? 'text-sm' : 'text-xs'
            )}
          >
            {formattedValue}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ============================================
// UTILITY: Get color from progress/health
// ============================================

/**
 * Get circle color based on health status
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getProgressCircleColor(
  healthStatus: 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'exceeded'
): ProgressCircleColor {
  switch (healthStatus) {
    case 'on_track':
      return 'green';
    case 'at_risk':
      return 'yellow';
    case 'off_track':
      return 'red';
    case 'completed':
      return 'blue';
    case 'exceeded':
      return 'purple';
    default:
      return 'gray';
  }
}
