// @ts-nocheck — WIP component, ErrorType not yet exported
import { cn } from '@/utils/cn';
import type { ErrorType } from '../hooks/useReputationData';

interface ErrorTypesChartProps {
  data: ErrorType[];
  className?: string;
}

export function ErrorTypesChart({ data, className }: ErrorTypesChartProps) {
  const totalErrors = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tipos de Errores</h3>
        <p className="text-sm text-gray-500">{totalErrors} errores clasificados</p>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-32 text-right text-sm text-gray-600 shrink-0">
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
            <div className="w-8 text-sm text-gray-700 tabular-nums">
              {item.count}
            </div>
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-3 pl-36 pr-8 text-xs text-gray-400">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </div>
    </div>
  );
}
