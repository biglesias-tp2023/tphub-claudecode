import { Info } from 'lucide-react';
import type { RevenueConcentration as RevenueConcentrationType } from '@/services/crp-portal';

interface RevenueConcentrationProps {
  data: RevenueConcentrationType;
}

const SEGMENTS = [
  { key: 'top10Pct' as const, label: 'Top 10%', color: 'bg-primary-600' },
  { key: 'top20Pct' as const, label: 'Top 20%', color: 'bg-primary-400' },
  { key: 'top50Pct' as const, label: 'Top 50%', color: 'bg-primary-200' },
] as const;

export function RevenueConcentration({ data }: RevenueConcentrationProps) {
  if (data.top10Pct === 0 && data.top20Pct === 0 && data.top50Pct === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Concentración de Ingresos</h3>
          <span
            className="cursor-help text-gray-300"
            title="Análisis Pareto: qué porcentaje de los ingresos genera cada segmento de clientes"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
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
            title={`Top 10%: ${data.top10Pct.toFixed(1)}%`}
          />
          <div
            className="bg-primary-400 transition-all"
            style={{ width: `${Math.max(0, data.top20Pct - data.top10Pct)}%` }}
            title={`Top 11-20%: ${(data.top20Pct - data.top10Pct).toFixed(1)}%`}
          />
          <div
            className="bg-primary-200 transition-all"
            style={{ width: `${Math.max(0, data.top50Pct - data.top20Pct)}%` }}
            title={`Top 21-50%: ${(data.top50Pct - data.top20Pct).toFixed(1)}%`}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {SEGMENTS.map(({ key, label, color }) => (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {data[key].toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400">de los ingresos</p>
            </div>
          ))}
        </div>

        {/* Gini */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Coeficiente Gini</span>
            <span
              className="cursor-help text-gray-300"
              title="0 = distribución perfectamente igual, 1 = toda la facturación en un solo cliente. Mayor de 0.5 indica alta concentración."
            >
              <Info className="w-3 h-3" />
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {data.giniCoefficient.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
