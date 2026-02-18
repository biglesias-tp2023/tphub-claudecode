import { Package } from 'lucide-react';
import { BarChart } from '@/components/charts/rosen/BarChart';
import { PriceCategoryTable } from './PriceCategoryTable';
import { NORMALIZED_CATEGORIES } from '../config';
import type { CompetitorWithData } from '../types';
import type { CompsetProduct, NormalizedCategory } from '@/types';
import type { BarChartDataItem } from '@/components/charts/rosen/types';

interface CompsetProductsProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
  allProducts: CompsetProduct[];
}

export function CompsetProducts({ hero, competitors, allProducts }: CompsetProductsProps) {
  const allCompetitors = hero
    ? [hero, ...competitors]
    : competitors;

  // Build bar chart data: categories count per competitor
  const categoriesBarData: BarChartDataItem[] = allCompetitors.map((c) => {
    const uniqueCats = new Set(
      allProducts
        .filter((p) => p.competitorId === c.competitor.id && p.normalizedCategory)
        .map((p) => p.normalizedCategory)
    );
    return {
      label: c.competitor.name,
      value: uniqueCats.size,
      color: c.competitor.id === hero?.competitor.id ? '#095789' : '#9dd0eb',
    };
  });

  // Build bar chart data: products count per competitor
  const productsBarData: BarChartDataItem[] = allCompetitors.map((c) => {
    const count = allProducts.filter((p) => p.competitorId === c.competitor.id).length;
    return {
      label: c.competitor.name,
      value: count,
      color: c.competitor.id === hero?.competitor.id ? '#095789' : '#9dd0eb',
    };
  });

  const categories = NORMALIZED_CATEGORIES.map((c) => c.id);

  return (
    <div className="space-y-6">
      {/* Volume charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Categorías por competidor</h3>
          </div>
          <div className="h-64">
            <BarChart
              data={categoriesBarData}
              renderTooltip={(item) => (
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow">
                  {item.label}: {item.value} categorías
                </div>
              )}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Productos por competidor</h3>
          </div>
          <div className="h-64">
            <BarChart
              data={productsBarData}
              renderTooltip={(item) => (
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow">
                  {item.label}: {item.value} productos
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Price category tables */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Precios por categoría</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((catId) => (
            <PriceCategoryTable
              key={catId}
              category={catId as NormalizedCategory}
              hero={hero}
              competitors={competitors}
              allProducts={allProducts}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
