import { Package, Star, Medal, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ProductWithTier, ProductTier } from '@/types';

interface ProductsWidgetProps {
  products: ProductWithTier[];
  isLoading?: boolean;
  onProductClick?: (product: ProductWithTier) => void;
}

const TIER_CONFIG: Record<ProductTier, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  top: {
    label: 'TopVentas',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  tier2: {
    label: 'Tier 2',
    icon: Medal,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  tier3: {
    label: 'Tier 3',
    icon: Medal,
    color: 'text-orange-400',
    bgColor: 'bg-orange-50',
  },
  new: {
    label: 'Nuevo',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

function ProductItem({ product, onClick }: { product: ProductWithTier; onClick?: () => void }) {
  const config = TIER_CONFIG[product.tier];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
        'hover:bg-gray-50'
      )}
    >
      {/* Product image or placeholder */}
      <div className="w-10 h-10 rounded bg-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-500 truncate">{product.category}</p>
      </div>

      {/* Tier badge */}
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    </button>
  );
}

export function ProductsWidget({ products, isLoading, onProductClick }: ProductsWidgetProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Productos</h3>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Productos</h3>
        </div>
        <p className="text-sm text-gray-500">
          Selecciona un restaurante para ver los productos sugeridos
        </p>
      </div>
    );
  }

  // Group by tier
  const topProducts = products.filter(p => p.tier === 'top');
  const tier2Products = products.filter(p => p.tier === 'tier2');
  const tier3Products = products.filter(p => p.tier === 'tier3');
  const newProducts = products.filter(p => p.tier === 'new');

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-medium text-gray-700">Productos Sugeridos</h3>
      </div>

      <div className="space-y-4">
        {/* Top products */}
        {topProducts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              TopVentas
            </p>
            {topProducts.slice(0, 3).map(product => (
              <ProductItem
                key={product.id}
                product={product}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        )}

        {/* Tier 2 */}
        {tier2Products.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Tier 2
            </p>
            {tier2Products.slice(0, 2).map(product => (
              <ProductItem
                key={product.id}
                product={product}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        )}

        {/* Tier 3 */}
        {tier3Products.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-orange-400 uppercase tracking-wide">
              Tier 3
            </p>
            {tier3Products.slice(0, 2).map(product => (
              <ProductItem
                key={product.id}
                product={product}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        )}

        {/* New products */}
        {newProducts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
              Nuevos
            </p>
            {newProducts.slice(0, 2).map(product => (
              <ProductItem
                key={product.id}
                product={product}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
