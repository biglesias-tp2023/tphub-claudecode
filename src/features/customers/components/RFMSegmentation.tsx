import { Info } from 'lucide-react';
import { MetricTooltip, tooltipContent } from '@/components/common';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { RFMAnalysis, RFMSegment } from '@/services/crp-portal';
import { cn } from '@/utils/cn';

interface RFMSegmentationProps {
  data: RFMAnalysis;
}

const SEGMENT_CONFIG: Record<RFMSegment, { label: string; color: string; bgColor: string; description: string }> = {
  champions: {
    label: 'Champions',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    description: 'Recency >= 4, Frequency >= 4, Monetary >= 4. Compraron recientemente, compran a menudo y gastan mucho.',
  },
  loyal: {
    label: 'Leales',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Frequency >= 3, Monetary >= 3. Compran con frecuencia y gastan bien, aunque puede que no sean los más recientes.',
  },
  promising: {
    label: 'Prometedores',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    description: 'Recency >= 4, Frequency <= 2. Compraron hace poco pero aún no son frecuentes. Potencial de fidelización.',
  },
  at_risk: {
    label: 'En riesgo',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    description: 'Recency <= 2, Frequency >= 2. Solían comprar pero llevan tiempo sin hacerlo. Necesitan reactivación.',
  },
  lost: {
    label: 'Perdidos',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    description: 'Recency <= 2, Frequency <= 2. Poco frecuentes y hace mucho que no compran.',
  },
};

export function RFMSegmentation({ data }: RFMSegmentationProps) {
  if (data.segments.length === 0) return null;

  const maxPctRevenue = Math.max(...data.segments.map((s) => s.pctRevenue));

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Segmentación RFM</h3>
          <MetricTooltip
            content={tooltipContent(
              'Clasifica a tus clientes en 5 segmentos basándose en tres dimensiones: Recencia (cuándo fue su último pedido), Frecuencia (cuántas veces compran) y Valor Monetario (cuánto gastan).',
              'Cada cliente recibe una puntuación de 1 a 5 (quintiles) en cada dimensión. La combinación de puntuaciones determina su segmento.',
              'Permite diseñar estrategias diferenciadas: retener Champions, reactivar En Riesgo, fidelizar Prometedores.'
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </MetricTooltip>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatNumber(data.totalCustomers)} clientes · {formatCurrency(data.totalRevenue)} ingresos
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs">Segmento</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Clientes</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">% Clientes</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">Ingresos</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">% Ingresos</th>
              <th className="text-right py-2.5 px-4 font-medium text-gray-500 text-xs">Ticket</th>
            </tr>
          </thead>
          <tbody>
            {data.segments.map((seg) => {
              const config = SEGMENT_CONFIG[seg.segment];
              return (
                <tr key={seg.segment} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.color)} />
                      <span className="text-xs font-medium text-gray-900">{config.label}</span>
                      <MetricTooltip content={config.description}>
                        <Info className="w-3 h-3" />
                      </MetricTooltip>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900 font-medium">
                    {formatNumber(seg.count)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', config.color)}
                          style={{ width: `${seg.pctCustomers}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-600 w-10 text-right">{seg.pctCustomers.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900">
                    {formatCurrency(seg.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', config.color)}
                          style={{ width: `${(seg.pctRevenue / maxPctRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-600 w-10 text-right">{seg.pctRevenue.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right text-xs tabular-nums text-gray-900">
                    {formatCurrency(seg.avgTicket)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
