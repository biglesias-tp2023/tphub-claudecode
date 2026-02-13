import { BarChart } from '@/components/charts/rosen/BarChart';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { SpendDistribution, SpendSegment } from '@/services/crp-portal';
import type { BarChartDataItem } from '@/components/charts/rosen/types';

interface SpendHistogramProps {
  data: SpendDistribution;
}

const SEGMENT_COLORS: Record<SpendSegment['segment'], string> = {
  vip: '#059669',
  high: '#0891b2',
  medium: '#6366f1',
  low: '#f59e0b',
  single_order: '#94a3b8',
};

export function SpendHistogram({ data }: SpendHistogramProps) {
  const { buckets, segments, stats } = data;

  if (buckets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          No hay datos de distribución disponibles
        </div>
      </div>
    );
  }

  const chartData: BarChartDataItem[] = buckets.map((b, i) => ({
    label: `${formatCurrency(b.min, { compact: true })}-${formatCurrency(b.max, { compact: true })}`,
    value: b.count,
    color: '#095789',
    opacity: 0.7 + (i / buckets.length) * 0.3,
  }));

  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Histogram */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Distribución de Gasto</h4>
        <div className="h-64">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            barRadius={4}
            renderTooltip={(item) => (
              <div className="bg-white p-2 shadow-lg rounded-lg border border-gray-200 text-xs">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-gray-600">Clientes: {formatNumber(item.value)}</p>
              </div>
            )}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Mediana</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.median)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Promedio</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.avg)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">P90</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.p90)}</p>
          </div>
        </div>
      </div>

      {/* Segments Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">Segmentos de Clientes</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs">Segmento</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Clientes</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">%</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">
                  <span title="% de clientes con más de 1 pedido" className="cursor-help">
                    Rep. %
                  </span>
                </th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">
                  <span title="Pedidos promedio por cliente" className="cursor-help">
                    Ped./Cli
                  </span>
                </th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">
                  <span title="Días promedio entre pedidos" className="cursor-help">
                    Frec. (días)
                  </span>
                </th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Gasto Prom.</th>
                <th className="text-right py-2.5 px-4 font-medium text-gray-500 text-xs">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.segment} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SEGMENT_COLORS[segment.segment] }}
                      />
                      <span className="font-medium text-gray-900 text-xs">{segment.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {formatNumber(segment.count)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {segment.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {segment.repetitionRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {segment.avgOrdersPerCustomer.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {segment.avgFrequencyDays !== null ? segment.avgFrequencyDays : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 text-xs tabular-nums">
                    {formatCurrency(segment.avgSpend)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-gray-900 text-xs tabular-nums">
                    {formatCurrency(segment.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/50">
                <td className="py-2.5 px-4 font-semibold text-gray-900 text-xs">Total</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900 text-xs tabular-nums">
                  {formatNumber(totalCustomers)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900 text-xs tabular-nums">100%</td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs">-</td>
                <td className="py-2.5 px-4 text-right font-semibold text-gray-900 text-xs tabular-nums">
                  {formatCurrency(segments.reduce((sum, s) => sum + s.totalRevenue, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
