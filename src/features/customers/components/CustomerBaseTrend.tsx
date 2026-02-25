import { Info } from 'lucide-react';
import { MetricTooltip, tooltipContent } from '@/components/common';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import { formatNumber } from '@/utils/formatters';
import type { CustomerBaseTrendWeek } from '@/services/crp-portal';

interface CustomerBaseTrendProps {
  data: CustomerBaseTrendWeek[];
}

const SERIES = [
  { dataKey: 'nuevos', name: 'Nuevos', color: '#10B981', stackId: 'segments' },
  { dataKey: 'recurrentes', name: 'Recurrentes', color: '#3B82F6', stackId: 'segments' },
  { dataKey: 'frecuentes', name: 'Frecuentes', color: '#8B5CF6', stackId: 'segments' },
  { dataKey: 'vip', name: 'VIP', color: '#F59E0B', stackId: 'segments' },
] as const;

export function CustomerBaseTrend({ data }: CustomerBaseTrendProps) {
  if (data.length === 0) return null;

  const chartData = data.map((w) => ({
    weekLabel: w.weekLabel,
    nuevos: w.nuevos,
    recurrentes: w.recurrentes,
    frecuentes: w.frecuentes,
    vip: w.vip,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Tendencia Base de Clientes</h3>
          <MetricTooltip
            content={tooltipContent(
              'Evolución semanal de tu base de clientes clasificada por su historial de compra en los últimos 183 días.',
              'Nuevo: 0 pedidos previos. Recurrente: 1-3 pedidos. Frecuente: 4-9 pedidos. VIP: 10+ pedidos.',
              'Permite ver si tu base migra de nuevos a frecuentes/VIP o si pierdes clientes. Una base sana crece en frecuentes y VIP.'
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </MetricTooltip>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Últimas 8 semanas</p>
      </div>

      <div className="p-5">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          {SERIES.map((s) => (
            <div key={s.dataKey} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-gray-600">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="h-56">
          <AreaChart
            data={chartData}
            xKey="weekLabel"
            series={SERIES.map((s) => ({
              dataKey: s.dataKey,
              name: s.name,
              color: s.color,
              stackId: s.stackId,
              gradientOpacity: [0.8, 0.3],
            }))}
            curveType="monotone"
            yTickFormatter={(v) => formatNumber(v)}
            renderTooltip={(dataPoint) => (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900 mb-1.5">{String(dataPoint.weekLabel)}</p>
                {[...SERIES].reverse().map((s) => {
                  const val = Number(dataPoint[s.dataKey]) || 0;
                  return (
                    <div key={s.dataKey} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-600">{s.name}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900 tabular-nums">{formatNumber(val)}</span>
                    </div>
                  );
                })}
                <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Total</span>
                  <span className="text-xs font-bold text-gray-900 tabular-nums">
                    {formatNumber(
                      SERIES.reduce((sum, s) => sum + (Number(dataPoint[s.dataKey]) || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
