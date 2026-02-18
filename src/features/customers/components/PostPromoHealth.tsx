import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PostPromoHealth as PostPromoHealthType } from '@/services/crp-portal';

interface PostPromoHealthProps {
  data: PostPromoHealthType;
}

const SEGMENTS = [
  {
    key: 'sticky' as const,
    label: 'Sticky',
    color: 'bg-emerald-400',
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-700',
    tooltip: 'Entraron con promo y han vuelto sin promo. Captación exitosa: el cliente se queda sin necesidad de descuento.',
  },
  {
    key: 'promocioneros' as const,
    label: 'Promocioneros',
    color: 'bg-amber-400',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-700',
    tooltip: 'Entraron con promo y siguen comprando solo con promo. Alta dependencia promocional.',
  },
  {
    key: 'organico' as const,
    label: 'Orgánico',
    color: 'bg-blue-400',
    dotColor: 'bg-blue-400',
    textColor: 'text-blue-700',
    tooltip: 'Entraron sin promo. Base de clientes saludable que no necesitó incentivo.',
  },
  {
    key: 'dormidos' as const,
    label: 'Dormidos',
    color: 'bg-gray-400',
    dotColor: 'bg-gray-400',
    textColor: 'text-gray-600',
    tooltip: 'Clientes con +45 días sin pedido reactivados por promo. Mide eficacia de reactivación.',
  },
] as const;

export function PostPromoHealth({ data }: PostPromoHealthProps) {
  if (data.total === 0) {
    return null;
  }

  const getPercentage = (value: number) => data.total > 0 ? (value / data.total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Salud de la Cohorte Post-Promo</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Distribución de usuarios captados por comportamiento promocional
        </p>
      </div>

      <div className="p-5">
        {/* Stacked bar */}
        <div className="h-6 rounded-full overflow-hidden flex bg-gray-100 mb-5">
          {SEGMENTS.map(({ key, color }) => {
            const pct = getPercentage(data[key]);
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={cn(color, 'transition-all')}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {SEGMENTS.map(({ key, label, dotColor, textColor, tooltip }) => {
            const count = data[key];
            const pct = getPercentage(count);

            return (
              <div key={key} className="flex items-start gap-2.5 py-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0', dotColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={cn('text-xs font-medium', textColor)}>{label}</span>
                    <span
                      className="cursor-help text-gray-300"
                      title={tooltip}
                    >
                      <Info className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{pct.toFixed(1)}%</span>
                    <span className="text-[10px] text-gray-400 tabular-nums">({count})</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
