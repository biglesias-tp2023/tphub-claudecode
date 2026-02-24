import { useMemo } from 'react';
import { BarChartStacked } from '@/components/charts/rosen/BarChartStacked';
import { formatCurrency } from '@/utils/formatters';
import type { DetailWeekData } from '../../hooks/useDetailPanelData';

interface PromoVsOrganicChartProps {
  data: DetailWeekData[];
}

export function PromoVsOrganicChart({ data }: PromoVsOrganicChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.weekLabel,
        organic: d.organicRevenue,
        promo: d.promoRevenue,
      })),
    [data]
  );

  const series = useMemo(
    () => [
      { key: 'organic', name: 'Organico', color: '#10B981' },
      { key: 'promo', name: 'Promocionado', color: '#8B5CF6' },
    ],
    []
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Organico
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />Promocionado
        </span>
      </div>
      <div className="h-[170px]">
      <BarChartStacked
        data={chartData}
        series={series}
        yTickFormatter={(v) => formatCurrency(v, { compact: true })}
        renderTooltip={(item) => (
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <p className="font-medium mb-1">{item.label}</p>
            <p className="text-emerald-300">Organico: {formatCurrency(Number(item.organic))}</p>
            <p className="text-purple-300">Promo: {formatCurrency(Number(item.promo))}</p>
            <p className="text-gray-400 mt-1">Total: {formatCurrency(Number(item.organic) + Number(item.promo))}</p>
          </div>
        )}
      />
      </div>
    </div>
  );
}
