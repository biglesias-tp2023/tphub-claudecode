/**
 * Product Selector
 *
 * Component for selecting products from CRP Portal for campaign promotions.
 * Supports both single product selection and multiple product selection.
 *
 * @module features/calendar/components/CampaignEditor/ProductSelector
 */

import { useState, useMemo } from 'react';
import { Search, Package, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency } from '@/utils/formatters';
import type { CampaignPlatform } from '@/types';

// ============================================
// TYPES
// ============================================

interface ProductSelectorProps {
  /** Company ID for fetching products */
  companyId: string | number | undefined;
  /** Platform to filter products by */
  platform: CampaignPlatform;
  /** Whether to allow multiple selections */
  multiple?: boolean;
  /** Currently selected product IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
  /** Optional address ID to filter products further */
  addressId?: string;
  /** Label for the field */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function ProductSelector({
  companyId,
  platform,
  multiple = false,
  selectedIds,
  onChange,
  addressId,
  label = 'Productos',
  required = false,
}: ProductSelectorProps) {
  const [search, setSearch] = useState('');

  // Fetch products from CRP Portal
  const { data: products = [], isLoading } = useProducts({
    companyId,
    platform,
    addressId,
    limit: 200,
  });

  // Filter products by search term locally for instant feedback
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const searchLower = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  // Handle product toggle
  const handleToggle = (productId: string) => {
    if (multiple) {
      // Toggle in array
      if (selectedIds.includes(productId)) {
        onChange(selectedIds.filter(id => id !== productId));
      } else {
        onChange([...selectedIds, productId]);
      }
    } else {
      // Single selection - replace
      onChange([productId]);
    }
  };

  // Get selected products for display
  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <p className="text-xs text-gray-500">
          {multiple
            ? 'Selecciona los productos que participaran en la promocion'
            : 'Selecciona el producto para esta promocion'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected products summary */}
      {selectedProducts.length > 0 && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm font-medium text-primary-800 mb-2">
            {selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''} seleccionado{selectedProducts.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map(product => (
              <span
                key={product.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-primary-300 rounded text-xs text-primary-700"
              >
                {product.name}
                <button
                  type="button"
                  onClick={() => handleToggle(product.id)}
                  className="ml-1 text-primary-400 hover:text-primary-600"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Products list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Cargando productos...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Package className="w-8 h-8 mb-2" />
            <p className="text-sm">
              {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </p>
            {!companyId && (
              <p className="text-xs text-gray-400 mt-1">
                Selecciona un establecimiento para ver sus productos
              </p>
            )}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {filteredProducts.map(product => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleToggle(product.id)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox/Radio indicator */}
                    <div
                      className={`w-5 h-5 flex items-center justify-center border-2 transition-colors ${
                        multiple ? 'rounded' : 'rounded-full'
                      } ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Product info */}
                    <div className="text-left">
                      <p className={`text-sm ${isSelected ? 'font-medium text-primary-900' : 'text-gray-900'}`}>
                        {product.name}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                    {formatCurrency(product.price)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Help text */}
      {filteredProducts.length > 0 && (
        <p className="text-xs text-gray-400">
          Mostrando {filteredProducts.length} de {products.length} productos
        </p>
      )}
    </div>
  );
}
