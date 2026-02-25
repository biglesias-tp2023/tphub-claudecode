import { useMemo } from 'react';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import { CHANNELS } from '@/constants/channels';
import { formatCurrency } from '@/utils/formatters';
import type { DetailWeekData } from '../../hooks/useDetailPanelData';

interface RevenueByChannelChartProps {
  data: DetailWeekData[];
}

export function RevenueByChannelChart({ data }: RevenueByChannelChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        week: d.weekLabel,
        glovo: d.ventasGlovo,
        ubereats: d.ventasUbereats,
      })),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <img src={CHANNELS.glovo.logoUrl} alt="Glovo" className="w-4 h-4 object-contain" />Glovo
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <img src={CHANNELS.ubereats.logoUrl} alt="Uber Eats" className="w-4 h-4 object-contain" />UberEats
        </span>
      </div>
      <div className="h-[170px]">
      <AreaChart
        data={chartData}
        xKey="week"
        series={[
          {
            dataKey: 'glovo',
            name: 'Glovo',
            color: '#F5A623',
            gradientOpacity: [0.35, 0.05],
            strokeWidth: 2,
            stackId: 'revenue',
          },
          {
            dataKey: 'ubereats',
            name: 'UberEats',
            color: '#06C167',
            gradientOpacity: [0.35, 0.05],
            strokeWidth: 2,
            stackId: 'revenue',
          },
        ]}
        yTickFormatter={(v) => formatCurrency(v, { compact: true })}
        margin={{ top: 8, right: 8, left: 40, bottom: 0 }}
        renderTooltip={(dp, xLabel) => {
          const glovo = Number(dp.glovo) || 0;
          const ubereats = Number(dp.ubereats) || 0;
          return (
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
              <p className="font-medium mb-1">{xLabel}</p>
              <p className="text-amber-300">Glovo: {formatCurrency(glovo)}</p>
              <p className="text-emerald-300">UberEats: {formatCurrency(ubereats)}</p>
              <p className="text-gray-300 border-t border-gray-700 mt-1 pt-1">Total: {formatCurrency(glovo + ubereats)}</p>
            </div>
          );
        }}
      />
      </div>
    </div>
  );
}
