import { memo, useMemo } from 'react';
import { AreaChartStacked } from '@/components/charts/rosen/AreaChartStacked';
import type { StackedAreaSeriesConfig } from '@/components/charts/rosen/AreaChartStacked';
import { formatCurrency } from '@/utils/formatters';
import type { PnLData } from '../types';

interface PnLChartProps {
  data: PnLData;
}

// Stacked layers: bottom → top. They sum up to GMV.
const SERIES_CONFIG: (StackedAreaSeriesConfig & { label: string })[] = [
  { key: 'net_revenue', name: 'Ventas netas', label: 'Ventas netas', color: '#095789', gradientOpacity: [0.8, 0.4] },
  { key: 'cogs', name: 'COGS', label: 'Coste producto', color: '#6bb8e0', gradientOpacity: [0.7, 0.3] },
  { key: 'commissions', name: 'Comisiones APP', label: 'Comisiones APP', color: '#9dd0eb', gradientOpacity: [0.6, 0.25] },
  { key: 'ads_promos', name: 'Dto. Promociones', label: 'Dto. Promociones', color: '#ffa166', gradientOpacity: [0.7, 0.3] },
  { key: 'ads_visibility', name: 'Publicidad', label: 'Publicidad', color: '#ffc89e', gradientOpacity: [0.6, 0.25] },
  { key: 'refunds', name: 'Reembolsos', label: 'Reembolsos', color: '#c5e3f3', gradientOpacity: [0.5, 0.2] },
];

export const PnLChart = memo(function PnLChart({ data }: PnLChartProps) {
  const chartData = useMemo(() => {
    if (data.periods.length === 0) return [];

    return data.periods.map((period, i) => {
      const pd = data.byPeriod[period];
      if (!pd) return { label: data.periodLabels[i], net_revenue: 0, cogs: 0, commissions: 0, ads_promos: 0, ads_visibility: 0, refunds: 0 };

      return {
        label: data.periodLabels[i],
        net_revenue: Math.max(0, pd.net_revenue.value),
        cogs: Math.abs(pd.cogs.value),
        commissions: Math.abs(pd.commissions.value),
        ads_promos: Math.abs(pd.ads_promos.value),
        ads_visibility: Math.abs(pd.ads_visibility.value),
        refunds: Math.abs(pd.refunds.value),
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
        {SERIES_CONFIG.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[340px]">
        <AreaChartStacked
          data={chartData}
          series={SERIES_CONFIG}
          margin={{ top: 10, right: 10, bottom: 30, left: 60 }}
          yTickFormatter={(v) => formatCurrency(v, { compact: true })}
          curveType="monotone"
          yAxisLabel="EUR"
          renderTooltip={(item, xLabel) => {
            const total = SERIES_CONFIG.reduce((sum, s) => sum + (Number(item[s.key]) || 0), 0);
            return (
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-3 py-2.5 text-xs min-w-[180px]">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-gray-800">{xLabel}</p>
                  <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(total)}</p>
                </div>
                <div className="space-y-0.5">
                  {SERIES_CONFIG.map((s) => {
                    const val = Number(item[s.key]) || 0;
                    if (val === 0) return null;
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={s.key} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                          <span className="text-gray-600">{s.label}</span>
                        </div>
                        <span className="font-medium tabular-nums text-gray-900">
                          {formatCurrency(val)} <span className="text-gray-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
});
