import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CustomerScorecardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  subtitle?: string;
  /** Tooltip text explaining the metric */
  tooltip?: string;
}

export function CustomerScorecard({ title, value, change, icon: Icon, subtitle, tooltip }: CustomerScorecardProps) {
  const hasChange = change !== undefined;
  const isPositive = hasChange && change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        {tooltip && (
          <span
            className="cursor-help text-gray-300 ml-auto"
            title={tooltip}
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>

      <div className="flex items-center gap-1.5 mt-1.5">
        {hasChange && (
          <span className={cn(
            'text-xs font-semibold tabular-nums',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
