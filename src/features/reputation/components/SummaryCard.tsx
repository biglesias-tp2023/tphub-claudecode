import { cn } from '@/utils/cn';
import { Euro, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface SummaryCardProps {
  type: 'billing' | 'refunds';
  value: number;
  subtitle: string;
  className?: string;
}

export function SummaryCard({ type, value, subtitle, className }: SummaryCardProps) {
  const isBilling = type === 'billing';

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
            {isBilling ? 'Facturación Total' : 'Reembolso Total'}
          </div>
          <div
            className={cn(
              'text-3xl font-bold',
              isBilling ? 'text-green-600' : 'text-red-500'
            )}
          >
            {formatCurrency(value)}
          </div>
          <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
        </div>

        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isBilling ? 'bg-green-50' : 'bg-red-50'
          )}
        >
          {isBilling ? (
            <Euro className="w-5 h-5 text-green-600" />
          ) : (
            <RotateCcw className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}
