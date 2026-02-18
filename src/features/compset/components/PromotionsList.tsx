import { Tag, Percent, Truck, Gift, Zap, Stamp } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CompsetPromotion, CompsetPromoType } from '@/types';
import type { CompetitorWithData } from '../types';

interface PromotionsListProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  allPromotions: CompsetPromotion[];
}

const PROMO_CONFIG: Record<CompsetPromoType, { label: string; icon: React.ElementType; color: string }> = {
  discount_percent: { label: 'Descuento %', icon: Percent, color: 'bg-emerald-50 text-emerald-700' },
  discount_amount: { label: 'Descuento €', icon: Tag, color: 'bg-blue-50 text-blue-700' },
  bogo: { label: '2x1', icon: Gift, color: 'bg-purple-50 text-purple-700' },
  free_delivery: { label: 'Envío gratis', icon: Truck, color: 'bg-amber-50 text-amber-700' },
  free_item: { label: 'Item gratis', icon: Gift, color: 'bg-pink-50 text-pink-700' },
  flash_offer: { label: 'Flash', icon: Zap, color: 'bg-red-50 text-red-700' },
  stamp_card: { label: 'Tarjeta sellos', icon: Stamp, color: 'bg-indigo-50 text-indigo-700' },
};

export function PromotionsList({ hero, competitors, allPromotions }: PromotionsListProps) {
  const all = hero ? [hero, ...competitors] : competitors;

  return (
    <div className="space-y-4">
      {all.map((c) => {
        const promos = allPromotions.filter((p) => p.competitorId === c.competitor.id);
        if (promos.length === 0) return null;
        const isHero = c.competitor.id === hero?.competitor.id;

        return (
          <div key={c.competitor.id}>
            <h4
              className={cn(
                'text-sm font-medium mb-2',
                isHero ? 'text-primary-700' : 'text-gray-700'
              )}
            >
              {c.competitor.name}
              <span className="text-gray-400 font-normal ml-2">({promos.length})</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {promos.map((promo) => {
                const config = PROMO_CONFIG[promo.promoType];
                const PromoIcon = config?.icon ?? Tag;
                return (
                  <div
                    key={promo.id}
                    className="flex items-start gap-3 bg-white rounded-lg border border-gray-100 p-3"
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-md shrink-0',
                        config?.color ?? 'bg-gray-50 text-gray-600'
                      )}
                    >
                      <PromoIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {promo.title ?? config?.label ?? promo.promoType}
                      </div>
                      {promo.description && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {promo.description}
                        </div>
                      )}
                      {promo.discountValue && (
                        <div className="text-xs font-semibold text-emerald-600 mt-1">
                          {promo.discountUnit === '%'
                            ? `-${promo.discountValue}%`
                            : `-${promo.discountValue} ${promo.discountUnit}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
