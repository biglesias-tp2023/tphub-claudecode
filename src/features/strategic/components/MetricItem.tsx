import { cn } from '@/utils/cn';

interface MetricItemProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricItem({ label, value, icon: Icon, color = 'default' }: MetricItemProps) {
  const colorStyles = {
    default: 'text-gray-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={cn('text-xl font-semibold tabular-nums', colorStyles[color])}>{value}</p>
      </div>
    </div>
  );
}
