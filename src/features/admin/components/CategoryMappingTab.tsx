import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { NORMALIZED_CATEGORIES } from '@/features/compset/config';
import { CategoryMappingStats } from './CategoryMappingStats';
import {
  useAllCompsetProducts,
  useAllCompetitorsForMapping,
  useUpdateProductCategory,
} from '../hooks/useCategoryMappings';
import type { NormalizedCategory, CompsetProduct, CompsetCompetitor } from '@/types';

type ViewFilter = 'unmapped' | 'all';

export function CategoryMappingTab() {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('unmapped');
  const { data: allProducts = [], isLoading: loadingProducts } = useAllCompsetProducts();
  const { data: competitors = [], isLoading: loadingCompetitors } = useAllCompetitorsForMapping();
  const updateCategory = useUpdateProductCategory();

  const competitorMap = useMemo(
    () => new Map(competitors.map((c: CompsetCompetitor) => [c.id, c.name])),
    [competitors]
  );

  const filteredProducts = useMemo(() => {
    if (viewFilter === 'unmapped') {
      return allProducts.filter((p: CompsetProduct) => !p.normalizedCategory);
    }
    return allProducts;
  }, [allProducts, viewFilter]);

  // Group products by competitor
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, CompsetProduct[]>();
    for (const product of filteredProducts) {
      const existing = groups.get(product.competitorId) ?? [];
      existing.push(product);
      groups.set(product.competitorId, existing);
    }
    return groups;
  }, [filteredProducts]);

  const handleCategoryChange = (productId: string, category: NormalizedCategory) => {
    updateCategory.mutate({ productId, category });
  };

  if (loadingProducts || loadingCompetitors) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <CategoryMappingStats products={allProducts} />

      {/* Filter toggle */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewFilter('unmapped')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewFilter === 'unmapped'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sin categoría ({allProducts.filter((p: CompsetProduct) => !p.normalizedCategory).length})
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Todos ({allProducts.length})
          </button>
        </div>
      </div>

      {/* Products table grouped by competitor */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">
            {viewFilter === 'unmapped'
              ? 'Todos los productos tienen categoría asignada.'
              : 'No hay productos registrados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedProducts.entries()).map(([competitorId, products]) => (
            <div key={competitorId} className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <h4 className="text-sm font-semibold text-gray-900">
                  {competitorMap.get(competitorId) ?? 'Competidor desconocido'}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({products.length} productos)
                  </span>
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Precio
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Cat. Original
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Cat. Normalizada
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className="text-gray-900">{product.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {product.price.toFixed(2)} €
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                          {product.rawCategory ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <CategoryDropdown
                            value={product.normalizedCategory}
                            onChange={(cat) => handleCategoryChange(product.id, cat)}
                            isLoading={
                              updateCategory.isPending &&
                              updateCategory.variables?.productId === product.id
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryDropdown({
  value,
  onChange,
  isLoading,
}: {
  value: NormalizedCategory | null;
  onChange: (category: NormalizedCategory) => void;
  isLoading: boolean;
}) {
  const matchedCat = NORMALIZED_CATEGORIES.find((c) => c.id === value);

  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as NormalizedCategory)}
        disabled={isLoading}
        className={`block w-full rounded-md border text-sm py-1.5 pl-2 pr-8 transition-colors ${
          value
            ? 'border-gray-200 bg-white text-gray-900'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-gray-300'}`}
      >
        <option value="" disabled>
          Seleccionar...
        </option>
        {NORMALIZED_CATEGORIES.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>
      {matchedCat && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: matchedCat.color }}
        />
      )}
    </div>
  );
}
