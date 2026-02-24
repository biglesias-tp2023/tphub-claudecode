import { useMemo } from 'react';
import { BarChartStacked } from '@/components/charts/rosen/BarChartStacked';
import { formatNumber } from '@/utils/formatters';
import type { WeekSegmentData } from '../../hooks/useWeeklyRevenue';

interface CustomerSegmentsChartProps {
  data: WeekSegmentData[];
}

export function CustomerSegmentsChart({ data }: CustomerSegmentsChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.weekLabel,
        new: d.newCustomers,
        occasional: d.occasionalCustomers,
        frequent: d.frequentCustomers,
      })),
    [data]
  );

  const series = useMemo(
    () => [
      { key: 'new', name: 'Nuevo', color: '#3B82F6' },
      { key: 'occasional', name: 'Ocasional', color: '#F59E0B' },
      { key: 'frequent', name: 'Frecuente', color: '#10B981' },
    ],
    []
  );

  const hasAnyData = data.some(
    (d) => d.newCustomers > 0 || d.occasionalCustomers > 0 || d.frequentCustomers > 0
  );

  if (!hasAnyData) {
    return (
      <div className="h-[180px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-xs text-gray-400">Sin datos de segmentacion</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Nuevo (1 pedido)
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Ocasional (2-3)
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Frecuente (4+)
        </span>
      </div>
      <div className="h-[170px]">
        <BarChartStacked
          data={chartData}
          series={series}
          yTickFormatter={(v) => formatNumber(v, { notation: 'compact' })}
          renderTooltip={(item) => {
            const total = Number(item.new) + Number(item.occasional) + Number(item.frequent);
            return (
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                <p className="font-medium mb-1">{item.label}</p>
                <p className="text-blue-300">Nuevo: {formatNumber(Number(item.new))}</p>
                <p className="text-amber-300">Ocasional: {formatNumber(Number(item.occasional))}</p>
                <p className="text-emerald-300">Frecuente: {formatNumber(Number(item.frequent))}</p>
                <p className="text-gray-400 mt-1">Total: {formatNumber(total)}</p>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
