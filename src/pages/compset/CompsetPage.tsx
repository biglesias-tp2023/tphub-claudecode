import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Star,
  Tag,
  Settings,
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { useCompsetData } from '@/features/compset/hooks';
import {
  CompsetOverview,
  CompsetProducts,
  CompsetReputation,
  CompsetPromotions,
  CompsetConfig,
} from '@/features/compset/components';
import type { CompsetTabId } from '@/features/compset/types';

const tabs: { id: CompsetTabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Vista General', icon: LayoutDashboard },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'reputation', label: 'Reputación', icon: Star },
  { id: 'promotions', label: 'Promociones', icon: Tag },
  { id: 'config', label: 'Configurar', icon: Settings },
];

export function CompsetPage() {
  const [activeTab, setActiveTab] = useState<CompsetTabId>('overview');
  const companyIds = useGlobalFiltersStore((s) => s.companyIds);
  const companyId = companyIds[0] ?? '1';

  const {
    hero,
    competitors,
    compsetAverage,
    allProducts,
    allPromotions,
    isLoading,
  } = useCompsetData(companyId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compset</h1>
        <p className="text-gray-500 mt-1">
          Análisis competitivo del entorno de delivery
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <CompsetOverview
                  hero={hero}
                  competitors={competitors}
                  compsetAvg={compsetAverage}
                />
              )}

              {activeTab === 'products' && (
                <CompsetProducts
                  hero={hero}
                  competitors={competitors}
                  allProducts={allProducts}
                />
              )}

              {activeTab === 'reputation' && (
                <CompsetReputation
                  hero={hero}
                  competitors={competitors}
                />
              )}

              {activeTab === 'promotions' && (
                <CompsetPromotions
                  hero={hero}
                  competitors={competitors}
                  allPromotions={allPromotions}
                />
              )}

              {activeTab === 'config' && (
                <CompsetConfig
                  hero={hero}
                  competitors={competitors}
                  companyId={companyId}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
