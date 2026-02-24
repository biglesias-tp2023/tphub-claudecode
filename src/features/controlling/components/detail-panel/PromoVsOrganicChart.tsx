import { useMemo } from 'react';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import { formatCurrency } from '@/utils/formatters';
import type { DetailWeekData } from '../../hooks/useDetailPanelData';

interface PromoVsOrganicChartProps {
  data: DetailWeekData[];
}

export function PromoVsOrganicChart({ data }: PromoVsOrganicChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        week: d.weekLabel,
        organic: d.organicRevenue,
        promo: d.promoRevenue,
      })),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Organico
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />Promocionado
        </span>
      </div>
      <div className="h-[170px]">
        <AreaChart
          data={chartData}
          xKey="week"
          series={[
            {
              dataKey: 'organic',
              name: 'Organico',
              color: '#10B981',
              stackId: 'revenue',
              gradientOpacity: [0.4, 0.05],
              strokeWidth: 2,
              showDots: false,
            },
            {
              dataKey: 'promo',
              name: 'Promocionado',
              color: '#8B5CF6',
              stackId: 'revenue',
              gradientOpacity: [0.4, 0.05],
              strokeWidth: 2,
              showDots: false,
            },
          ]}
          yTickFormatter={(v) => formatCurrency(v, { compact: true })}
          margin={{ top: 8, right: 8, left: 40, bottom: 0 }}
          renderTooltip={(dp, xLabel) => (
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
              <p className="font-medium mb-1">{xLabel}</p>
              <p className="text-emerald-300">Organico: {formatCurrency(Number(dp.organic))}</p>
              <p className="text-purple-300">Promo: {formatCurrency(Number(dp.promo))}</p>
              <p className="text-gray-400 mt-1">Total: {formatCurrency(Number(dp.organic) + Number(dp.promo))}</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}
