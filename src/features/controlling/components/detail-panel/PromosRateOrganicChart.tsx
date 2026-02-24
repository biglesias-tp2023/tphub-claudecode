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
        lineValue: d.promosRetorno,
      })),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary-600 opacity-75" />Inv. Promos %
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-0.5 bg-accent-400" />Retorno Promos
        </span>
      </div>
      <div className="h-[170px]">
      <BarChartLine
        data={chartData}
        barColor="#095789"
        lineColor="#ffa166"
        yBarFormatter={(v) => `${v.toFixed(0)}%`}
        yLineFormatter={(v) => `${v.toFixed(1)}x`}
        renderTooltip={(item) => {
          const d = data.find((x) => x.weekLabel === item.label);
          return (
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
              <p className="font-medium mb-1">{item.label}</p>
              <p style={{ color: '#6bb8e0' }}>Inv. Promos: {item.barValue.toFixed(1)}%</p>
              <p className="text-accent-400">Retorno: {item.lineValue.toFixed(1)}x</p>
              {d && <p className="text-gray-400 mt-1">Descuentos: {formatCurrency(d.descuentos)}</p>}
            </div>
          );
        }}
      />
      </div>
    </div>
  );
}
