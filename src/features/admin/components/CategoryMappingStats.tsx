import { NORMALIZED_CATEGORIES } from '@/features/compset/config';
import type { CompsetProduct } from '@/types';

interface CategoryMappingStatsProps {
  products: CompsetProduct[];
}

export function CategoryMappingStats({ products }: CategoryMappingStatsProps) {
  const unmappedCount = products.filter((p) => !p.normalizedCategory).length;
  const mappedCount = products.length - unmappedCount;
  const mappedPercent = products.length > 0
    ? Math.round((mappedCount / products.length) * 100)
    : 0;

  const categoryStats = NORMALIZED_CATEGORIES.map((cat) => {
    const catProducts = products.filter((p) => p.normalizedCategory === cat.id);
    const avgPrice = catProducts.length > 0
      ? catProducts.reduce((sum, p) => sum + p.price, 0) / catProducts.length
      : 0;
    return {
      ...cat,
      count: catProducts.length,
      avgPrice,
    };
  });

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso de mapeo
          </span>
          <span className="text-sm text-gray-500">
            {mappedCount}/{products.length} productos ({mappedPercent}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${mappedPercent}%` }}
          />
        </div>
        {unmappedCount > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {unmappedCount} productos sin categoría asignada
          </p>
        )}
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categoryStats.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-xs font-medium text-gray-700">{cat.label}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{cat.count}</div>
            {cat.count > 0 && (
              <div className="text-xs text-gray-500">
                Media: {cat.avgPrice.toFixed(2)} €
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
