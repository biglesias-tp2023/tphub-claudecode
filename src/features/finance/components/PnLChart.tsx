import { memo, useMemo } from 'react';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import type { PnLData, PnLLineId } from '../types';

interface PnLChartProps {
  data: PnLData;
}

const CHART_SERIES_CONFIG: {
  lineId: PnLLineId;
  label: string;
  color: string;
  dashed?: boolean;
  yAxis?: 'left' | 'right';
}[] = [
  { lineId: 'gmv', label: 'GMV', color: '#095789' },
  { lineId: 'net_revenue', label: 'Ventas netas', color: '#0b7bb8' },
  { lineId: 'gross_profit', label: 'Beneficio bruto', color: '#10b981' },
  { lineId: 'gross_margin', label: 'Margen bruto %', color: '#f59e0b', dashed: true, yAxis: 'right' },
];

export const PnLChart = memo(function PnLChart({ data }: PnLChartProps) {
  const chartData = useMemo(() => {
    if (data.periods.length === 0) return [];

    return data.periods.map((period, i) => {
      const periodData = data.byPeriod[period];
      if (!periodData) return { label: data.periodLabels[i] };
      return {
        label: data.periodLabels[i],
        gmv: periodData.gmv.value,
        net_revenue: periodData.net_revenue.value,
        gross_profit: periodData.gross_profit.value,
        gross_margin: periodData.gross_margin.value,
      };
    });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        No hay datos para el período seleccionado
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {CHART_SERIES_CONFIG.map((s) => (
          <div key={s.lineId} className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: s.color,
                borderBottom: s.dashed ? `2px dashed ${s.color}` : undefined,
                height: s.dashed ? 0 : 2,
              }}
            />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[340px]">
        <AreaChart
          data={chartData}
          xKey="label"
          series={CHART_SERIES_CONFIG.map((s) => ({
            dataKey: s.lineId,
            name: s.label,
            color: s.color,
            gradientOpacity: [0.15, 0] as [number, number],
            strokeWidth: 2,
            strokeDasharray: s.dashed ? '6 3' : undefined,
            yAxisId: s.yAxis || 'left',
          }))}
          margin={{ top: 10, right: 60, bottom: 30, left: 60 }}
          yTickFormatter={(v) => formatCurrency(v, { compact: true })}
          rightYTickFormatter={(v) => `${v.toFixed(0)}%`}
          curveType="monotone"
          yAxisLabel="EUR"
          renderTooltip={(point, xLabel) => (
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-3 py-2 text-xs">
              <p className="font-semibold text-gray-800 mb-1">{xLabel}</p>
              {CHART_SERIES_CONFIG.map((s) => {
                const val = (point as Record<string, unknown>)[s.lineId] as number | undefined;
                if (val == null) return null;
                return (
                  <div key={s.lineId} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600">{s.label}</span>
                    </div>
                    <span className="font-medium tabular-nums text-gray-900">
                      {s.lineId === 'gross_margin'
                        ? formatPercentage(val, 1, false)
                        : formatCurrency(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
});
