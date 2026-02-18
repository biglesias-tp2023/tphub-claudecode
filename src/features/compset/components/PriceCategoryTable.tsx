import { cn } from '@/utils/cn';
import type { NormalizedCategory, CompsetProduct } from '@/types';
import type { CompetitorWithData } from '../types';
import { CATEGORY_MAP } from '../config';

interface PriceCategoryTableProps {
  category: NormalizedCategory;
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  allProducts: CompsetProduct[];
}

interface PriceEntry {
  competitorName: string;
  avgPrice: number;
  productCount: number;
  isHero: boolean;
}

export function PriceCategoryTable({
  category,
  hero,
  competitors,
  allProducts,
}: PriceCategoryTableProps) {
  const config = CATEGORY_MAP[category];

  const entries: PriceEntry[] = [];

  const allCompetitors = hero
    ? [{ ...hero, isHero: true }, ...competitors.map((c) => ({ ...c, isHero: false }))]
    : competitors.map((c) => ({ ...c, isHero: false }));

  for (const comp of allCompetitors) {
    const catProducts = allProducts.filter(
      (p) => p.competitorId === comp.competitor.id && p.normalizedCategory === category
    );
    if (catProducts.length === 0) continue;
    const avgPrice = catProducts.reduce((s, p) => s + p.price, 0) / catProducts.length;
    entries.push({
      competitorName: comp.competitor.name,
      avgPrice,
      productCount: catProducts.length,
      isHero: comp.isHero,
    });
  }

  entries.sort((a, b) => a.avgPrice - b.avgPrice);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">{config.label}</h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="text-left py-2 px-4 font-medium">Marca</th>
            <th className="text-right py-2 px-4 font-medium">Precio medio</th>
            <th className="text-right py-2 px-4 font-medium">Productos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.competitorName}
              className={cn(
                'border-b border-gray-50',
                entry.isHero && 'bg-primary-50/40 font-semibold',
                idx === 0 && !entry.isHero && 'text-emerald-600'
              )}
            >
              <td className="py-2 px-4">{entry.competitorName}</td>
              <td className="text-right py-2 px-4">{entry.avgPrice.toFixed(2)} €</td>
              <td className="text-right py-2 px-4 text-gray-500">{entry.productCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
