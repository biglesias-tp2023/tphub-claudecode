import { cn } from '@/utils/cn';
import { MessageSquare, ThumbsDown, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardProps {
  type: 'totalReviews' | 'negativeReviews';
  value: number;
  change?: number;
  className?: string;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString('es-ES');
}

export function SummaryCard({ type, value, change, className }: SummaryCardProps) {
  const isTotal = type === 'totalReviews';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">
            {isTotal ? 'Total Resenas' : 'Resenas Negativas'}
          </div>
          <div
            className={cn(
              'text-3xl font-bold',
              isTotal ? 'text-primary-600' : 'text-red-500'
            )}
          >
            {formatNumber(value)}
          </div>
          {change !== undefined && change !== 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {change > 0 ? (
                <TrendingUp className={cn('w-3.5 h-3.5', isTotal ? 'text-green-500' : 'text-red-500')} />
              ) : (
                <TrendingDown className={cn('w-3.5 h-3.5', isTotal ? 'text-red-500' : 'text-green-500')} />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  isTotal
                    ? (change > 0 ? 'text-green-600' : 'text-red-500')
                    : (change > 0 ? 'text-red-500' : 'text-green-600')
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
            isTotal ? 'bg-primary-50' : 'bg-red-50'
          )}
        >
          {isTotal ? (
            <MessageSquare className="w-5 h-5 text-primary-600" />
          ) : (
            <ThumbsDown className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}
