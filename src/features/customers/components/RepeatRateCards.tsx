import { Info } from 'lucide-react';
import { MetricTooltip, tooltipContent } from '@/components/common';
import { formatNumber } from '@/utils/formatters';
import type { RepeatRateData } from '@/services/crp-portal';

interface RepeatRateCardsProps {
  data: RepeatRateData;
}

const WINDOWS = [
  {
    key: '30d' as const,
    label: '30 días',
    rateKey: 'rate30d' as const,
    totalKey: 'total30d' as const,
    repeatKey: 'repeat30d' as const,
    tooltipWhat: 'De los clientes cuya primera compra fue hace más de 30 días, qué porcentaje realizó al menos un pedido adicional.',
    tooltipCalc: 'Clientes con 1er pedido hace ≥30d que volvieron / Total clientes con 1er pedido hace ≥30d × 100',
    tooltipWhy: 'Mide la fidelización a corto plazo: si el cliente vuelve en el primer mes, es buena señal.',
  },
  {
    key: '60d' as const,
    label: '60 días',
    rateKey: 'rate60d' as const,
    totalKey: 'total60d' as const,
    repeatKey: 'repeat60d' as const,
    tooltipWhat: 'De los clientes cuya primera compra fue hace más de 60 días, qué porcentaje realizó al menos un pedido adicional.',
    tooltipCalc: 'Clientes con 1er pedido hace ≥60d que volvieron / Total clientes con 1er pedido hace ≥60d × 100',
    tooltipWhy: 'Mide la retención a medio plazo. Una mejora entre 30d y 60d indica que los clientes siguen descubriendo la marca.',
  },
  {
    key: '90d' as const,
    label: '90 días',
    rateKey: 'rate90d' as const,
    totalKey: 'total90d' as const,
    repeatKey: 'repeat90d' as const,
    tooltipWhat: 'De los clientes cuya primera compra fue hace más de 90 días, qué porcentaje realizó al menos un pedido adicional.',
    tooltipCalc: 'Clientes con 1er pedido hace ≥90d que volvieron / Total clientes con 1er pedido hace ≥90d × 100',
    tooltipWhy: 'Mide la retención a largo plazo. Si a 90 días no repiten, difícilmente lo harán después.',
  },
];

export function RepeatRateCards({ data }: RepeatRateCardsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Tasa de Repetición</h3>
          <MetricTooltip
            content={tooltipContent(
              'Porcentaje de clientes que vuelven a comprar dentro de ventanas de 30, 60 y 90 días desde su primera compra.',
              'Para cada ventana: clientes con 1er pedido hace ≥N días que hicieron al menos 1 pedido más / total elegible × 100.',
              'Permite evaluar la velocidad de fidelización. Una tasa creciente entre ventanas indica buena retención orgánica.'
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </MetricTooltip>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {WINDOWS.map((w) => {
          const rate = data[w.rateKey];
          const total = data[w.totalKey];
          const repeat = data[w.repeatKey];

          return (
            <div key={w.key} className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tasa {w.label}</span>
                <MetricTooltip
                  content={tooltipContent(w.tooltipWhat, w.tooltipCalc, w.tooltipWhy)}
                >
                  <Info className="w-3 h-3" />
                </MetricTooltip>
              </div>

              <p className="text-2xl font-bold text-gray-900 tabular-nums mb-1">
                {rate.toFixed(1)}%
              </p>

              <p className="text-xs text-gray-500 tabular-nums mb-3">
                {formatNumber(repeat)} de {formatNumber(total)} clientes
              </p>

              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
