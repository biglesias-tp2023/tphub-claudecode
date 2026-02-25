import { Info } from 'lucide-react';
import { MetricTooltip, tooltipContent } from '@/components/common';
import type { RevenueConcentration as RevenueConcentrationType } from '@/services/crp-portal';

interface RevenueConcentrationProps {
  data: RevenueConcentrationType;
}

export function RevenueConcentration({ data }: RevenueConcentrationProps) {
  if (data.top10Pct === 0 && data.top20Pct === 0 && data.top50Pct === 0) {
    return null;
  }

  const segments = [
    {
      key: 'top10Pct' as const,
      label: 'Top 10%',
      color: 'bg-primary-600',
      value: data.top10Pct,
      tooltip: tooltipContent(
        `El 10% de tus clientes que más gastan genera el ${data.top10Pct.toFixed(1)}% de los ingresos totales.`,
        'Ordena clientes por gasto descendente → suma el gasto del top 10% → divide entre ingresos totales × 100.',
        'Un valor >50% indica alta dependencia de pocos clientes. Diversificar la base reduce el riesgo.'
      ),
    },
    {
      key: 'top20Pct' as const,
      label: 'Top 20%',
      color: 'bg-primary-400',
      value: data.top20Pct,
      tooltip: tooltipContent(
        `El 20% de tus clientes que más gastan genera el ${data.top20Pct.toFixed(1)}% de los ingresos totales.`,
        'Ordena clientes por gasto descendente → suma el gasto del top 20% → divide entre ingresos totales × 100.',
        'Regla de Pareto: si ~20% genera ~80%, tu distribución es típica. Más de 80% indica concentración elevada.'
      ),
    },
    {
      key: 'top50Pct' as const,
      label: 'Top 50%',
      color: 'bg-primary-200',
      value: data.top50Pct,
      tooltip: tooltipContent(
        `La mitad de tus clientes (los que más gastan) genera el ${data.top50Pct.toFixed(1)}% de los ingresos totales.`,
        'Ordena clientes por gasto descendente → suma el gasto del top 50% → divide entre ingresos totales × 100.',
        'Si es >95%, la mitad inferior apenas contribuye. Activar esos clientes puede desbloquear crecimiento.'
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Concentración de Ingresos</h3>
          <MetricTooltip
            content={tooltipContent(
              'Principio de Pareto: normalmente un grupo reducido de clientes genera la mayor parte de los ingresos.',
              'Se ordenan los clientes por gasto total y se calcula qué proporción aportan los segmentos top 10%, 20% y 50%.',
              'Cuanto mayor sea la concentración, más vulnerable es el negocio a perder clientes clave.'
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </MetricTooltip>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Distribución de ingresos por concentración de clientes
        </p>
      </div>

      <div className="p-5">
        {/* Stacked bar */}
        <div className="h-6 rounded-full overflow-hidden flex bg-gray-100 mb-5">
          <div
            className="bg-primary-600 transition-all"
            style={{ width: `${data.top10Pct}%` }}
          />
          <div
            className="bg-primary-400 transition-all"
            style={{ width: `${Math.max(0, data.top20Pct - data.top10Pct)}%` }}
          />
          <div
            className="bg-primary-200 transition-all"
            style={{ width: `${Math.max(0, data.top50Pct - data.top20Pct)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {segments.map(({ key, label, color, value, tooltip }) => (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
                <MetricTooltip content={tooltip}>
                  <Info className="w-3 h-3" />
                </MetricTooltip>
              </div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {value.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400">de los ingresos</p>
            </div>
          ))}
        </div>

        {/* Gini */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Coeficiente Gini</span>
            <MetricTooltip
              content={tooltipContent(
                `Coeficiente de Gini = ${data.giniCoefficient.toFixed(2)}. Mide la desigualdad en el gasto de tus clientes.`,
                '0 = todos gastan exactamente igual. 1 = un solo cliente acumula toda la facturación. Basado en la curva de Lorenz del gasto acumulado.',
                '>0.5 indica alta concentración. Es normal en delivery (0.4-0.7), pero conviene monitorizar la tendencia.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {data.giniCoefficient.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
