import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface KpiComparisonCardProps {
  label: string;
  heroValue: number | null;
  compsetAvg: number | null;
  format?: 'number' | 'currency' | 'rating' | 'minutes' | 'count';
  lowerIsBetter?: boolean;
  icon: React.ElementType;
}

function formatValue(value: number | null, format: string): string {
  if (value === null) return '—';
  switch (format) {
    case 'currency':
      return `${value.toFixed(2)} €`;
    case 'rating':
      return value.toFixed(2);
    case 'minutes':
      return `${Math.round(value)} min`;
    case 'count':
      return Math.round(value).toString();
    default:
      return value.toFixed(1);
  }
}

export function KpiComparisonCard({
  label,
  heroValue,
  compsetAvg,
  format = 'number',
  lowerIsBetter = false,
  icon: Icon,
}: KpiComparisonCardProps) {
  const diff =
    heroValue !== null && compsetAvg !== null && compsetAvg !== 0
      ? ((heroValue - compsetAvg) / compsetAvg) * 100
      : null;

  const isPositive = diff !== null ? (lowerIsBetter ? diff < 0 : diff > 0) : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary-50 rounded-lg">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {formatValue(heroValue, format)}
      </div>
      {diff !== null && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : diff === 0 ? (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositive
                ? 'text-emerald-600'
                : diff === 0
                ? 'text-gray-500'
                : 'text-red-600'
            )}
          >
            {Math.abs(diff).toFixed(1)}% vs media
          </span>
        </div>
      )}
    </div>
  );
}
