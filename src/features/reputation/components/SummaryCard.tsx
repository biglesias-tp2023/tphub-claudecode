import { cn } from '@/utils/cn';
import { MessageSquare, ThumbsDown, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardProps {
  type: 'totalReviews' | 'negativeReviews' | 'refunds';
  value: number;
  change?: number;
  subtitle?: string;
  className?: string;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString('es-ES');
}

function formatCurrency(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC';
}

const CARD_CONFIG = {
  totalReviews: {
    label: 'Total Reseñas',
    valueColor: 'text-primary-600',
    iconBg: 'bg-primary-50',
    Icon: MessageSquare,
    iconColor: 'text-primary-600',
    invertChange: false, // up = green
    formatValue: formatNumber,
  },
  negativeReviews: {
    label: 'Reseñas Negativas',
    valueColor: 'text-red-500',
    iconBg: 'bg-red-50',
    Icon: ThumbsDown,
    iconColor: 'text-red-500',
    invertChange: true, // up = red (bad)
    formatValue: formatNumber,
  },
  refunds: {
    label: 'Reembolsos',
    valueColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    Icon: RotateCcw,
    iconColor: 'text-amber-600',
    invertChange: true, // up = red (bad)
    formatValue: formatCurrency,
  },
} as const;

export function SummaryCard({ type, value, change, subtitle, className }: SummaryCardProps) {
  const config = CARD_CONFIG[type];
  const { Icon } = config;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">
            {config.label}
          </div>
          <div className={cn('text-3xl font-bold', config.valueColor)}>
            {config.formatValue(value)}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
          )}
          {change !== undefined && change !== 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {change > 0 ? (
                <TrendingUp className={cn('w-3.5 h-3.5', config.invertChange ? 'text-red-500' : 'text-green-500')} />
              ) : (
                <TrendingDown className={cn('w-3.5 h-3.5', config.invertChange ? 'text-green-500' : 'text-red-500')} />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  config.invertChange
                    ? (change > 0 ? 'text-red-500' : 'text-green-600')
                    : (change > 0 ? 'text-green-600' : 'text-red-500')
                )}
              >
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            config.iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
      </div>
    </div>
  );
}
