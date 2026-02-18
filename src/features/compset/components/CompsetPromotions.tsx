import { Tag, DollarSign } from 'lucide-react';
import { BarChart } from '@/components/charts/rosen/BarChart';
import { TcoChart } from './TcoChart';
import { PromotionsList } from './PromotionsList';
import type { CompetitorWithData } from '../types';
import type { CompsetPromotion } from '@/types';
import type { BarChartDataItem } from '@/components/charts/rosen/types';

interface CompsetPromotionsProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  allPromotions: CompsetPromotion[];
}

export function CompsetPromotions({ hero, competitors, allPromotions }: CompsetPromotionsProps) {
  const all = hero ? [hero, ...competitors] : competitors;

  // Delivery fee bar chart data
  const deliveryFeeData: BarChartDataItem[] = all
    .filter((c) => c.snapshot?.deliveryFee != null)
    .map((c) => ({
      label: c.competitor.name,
      value: c.snapshot!.deliveryFee!,
      color: c.competitor.id === hero?.competitor.id ? '#095789' : '#9dd0eb',
    }));

  return (
    <div className="space-y-6">
      {/* TCO Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Coste total para el cliente (TCO)
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Ticket medio + delivery fee + service fee = coste total del pedido
        </p>
        <TcoChart hero={hero} competitors={competitors} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery fees bar chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Delivery fees</h3>
          </div>
          <div className="h-56">
            <BarChart
              data={deliveryFeeData}
              renderTooltip={(item) => (
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow">
                  {item.label}: {item.value.toFixed(2)} €
                </div>
              )}
            />
          </div>
        </div>

        {/* Promo count summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Promos activas</h3>
          </div>
          <div className="space-y-2">
            {all
              .sort(
                (a, b) =>
                  (b.snapshot?.activePromoCount ?? 0) - (a.snapshot?.activePromoCount ?? 0)
              )
              .map((c) => (
                <div key={c.competitor.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{c.competitor.name}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {c.snapshot?.activePromoCount ?? 0}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Promotions list */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Detalle de promociones</h3>
        </div>
        <PromotionsList
          hero={hero}
          competitors={competitors}
          allPromotions={allPromotions}
        />
      </div>
    </div>
  );
}
