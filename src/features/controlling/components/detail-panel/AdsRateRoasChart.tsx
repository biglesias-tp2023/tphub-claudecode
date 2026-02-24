import { useMemo } from 'react';
import { BarChartLine } from '@/components/charts/rosen/BarChartLine';
import { formatCurrency } from '@/utils/formatters';
import type { DetailWeekData } from '../../hooks/useDetailPanelData';

interface AdsRateRoasChartProps {
  data: DetailWeekData[];
}

export function AdsRateRoasChart({ data }: AdsRateRoasChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        label: d.weekLabel,
        barValue: d.adsRate,
        lineValue: d.roas,
      })),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary-600 opacity-75" />Tasa ADS %
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-2.5 h-0.5 bg-accent-400" />ROAS
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
              <p>Tasa ADS: {item.barValue.toFixed(1)}%</p>
              <p className="text-accent-400">ROAS: {item.lineValue.toFixed(1)}x</p>
              {d && (
                <>
                  <p className="text-gray-400 mt-1">Inv: {formatCurrency(d.adSpent)}</p>
                  <p className="text-gray-400">Rev: {formatCurrency(d.adRevenue)}</p>
                </>
              )}
            </div>
          );
        }}
      />
      </div>
    </div>
  );
}
