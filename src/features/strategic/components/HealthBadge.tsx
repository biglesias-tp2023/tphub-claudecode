/**
 * HealthBadge Component
 *
 * Displays the health status of an objective with icon and label.
 * Color-coded for quick visual identification.
 *
 * @example
 * <HealthBadge status="on_track" />
 * <HealthBadge status="at_risk" size="sm" />
 */

import { CheckCircle, CheckCircle2, AlertTriangle, XCircle, Trophy } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { HealthStatus } from '@/types';

// ============================================
// TYPES
// ============================================

interface HealthBadgeProps {
  /** Health status to display */
  status: HealthStatus;
  /** Badge size */
  size?: 'sm' | 'md';
  /** Show label text */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// CONFIG
// ============================================

interface StatusConfig {
  label: string;
  icon: typeof CheckCircle;
  bgColor: string;
  textColor: string;
  iconColor: string;
}

const STATUS_CONFIG: Record<HealthStatus, StatusConfig> = {
  on_track: {
    label: 'En camino',
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  at_risk: {
    label: 'En riesgo',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  off_track: {
    label: 'Desviado',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle2,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
  exceeded: {
    label: 'Superado',
    icon: Trophy,
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    iconColor: 'text-violet-500',
  },
};

// ============================================
// COMPONENT
// ============================================

export function HealthBadge({
  status,
  size = 'sm',
  showLabel = true,
  className,
}: HealthBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 gap-1',
      icon: 'w-3 h-3',
      text: 'text-[10px]',
    },
    md: {
      container: 'px-2.5 py-1 gap-1.5',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bgColor,
        sizes.container,
        className
      )}
    >
      <Icon className={cn(sizes.icon, config.iconColor)} />
      {showLabel && (
        <span className={cn(sizes.text, config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Get just the label for a health status
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getHealthStatusLabel(status: HealthStatus): string {
  return STATUS_CONFIG[status].label;
}

/**
 * Get the config for a health status (for custom rendering)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getHealthStatusConfig(status: HealthStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
