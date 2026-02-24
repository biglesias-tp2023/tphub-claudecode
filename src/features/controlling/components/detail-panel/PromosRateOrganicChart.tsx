import { useMemo } from 'react';
import { BarChartLine } from '@/components/charts/rosen/BarChartLine';
import { formatCurrency } from '@/utils/formatters';
import type { DetailWeekData } from '../../hooks/useDetailPanelData';

interface PromosRateOrganicChartProps {
  data: DetailWeekData[];
}

export function PromosRateOrganicChart({ data }: PromosRateOrganicChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.weekLabel,
        barValue: d.promosRate,
        lineValue: d.organicRevenue,
      })),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 opacity-75" />Promos %
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-0.5 bg-emerald-500" />Venta Organica
        </span>
      </div>
      <div className="h-[170px]">
      <BarChartLine
        data={chartData}
        barColor="#8B5CF6"
        lineColor="#10B981"
        yBarFormatter={(v) => `${v.toFixed(0)}%`}
        yLineFormatter={(v) => formatCurrency(v, { compact: true })}
        renderTooltip={(item) => {
          const d = data.find((x) => x.weekLabel === item.label);
          return (
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
              <p className="font-medium mb-1">{item.label}</p>
              <p className="text-purple-300">Promos: {item.barValue.toFixed(1)}%</p>
              <p className="text-emerald-300">Organico: {formatCurrency(item.lineValue)}</p>
              {d && <p className="text-gray-400 mt-1">Descuentos: {formatCurrency(d.descuentos)}</p>}
            </div>
          );
        }}
      />
      </div>
    </div>
  );
}
