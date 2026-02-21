import { cn } from '@/utils/cn';
import type { RatingDistributionItem } from '../hooks/useReputationData';

interface RatingDistributionChartProps {
  data: RatingDistributionItem[];
  className?: string;
}

export function RatingDistributionChart({ data, className }: RatingDistributionChartProps) {
  const totalReviews = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Distribucion de Valoraciones</h3>
        <p className="text-sm text-gray-500">{totalReviews.toLocaleString('es-ES')} valoraciones en total</p>
      </div>

      <div className="space-y-3">
        {data.map((item) => {
          const percent = totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;
          return (
            <div key={item.rating} className="flex items-center gap-3">
              <div className="w-20 text-right text-sm text-gray-600 shrink-0">
                {item.label}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="w-20 text-sm text-gray-700 tabular-nums text-right shrink-0">
                {item.count.toLocaleString('es-ES')}
                <span className="text-gray-400 ml-1">({percent.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
