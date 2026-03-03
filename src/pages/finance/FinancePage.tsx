import { useState } from 'react';
import { Info, Table2, LineChart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DashboardFilters } from '@/features/dashboard';
import { useCompanyIds } from '@/stores/filtersStore';
import { useSessionState } from '@/hooks/useSessionState';

import { usePnLData } from '@/features/finance/hooks';
import { PnLControls } from '@/features/finance/components/PnLControls';
import { PnLTable } from '@/features/finance/components/PnLTable';
import { PnLChart } from '@/features/finance/components/PnLChart';
import type { PnLGranularity, PnLDisplayFormat, PnLChannelTab } from '@/features/finance/types';

type ViewMode = 'table' | 'chart';

export function FinancePage() {
  const companyIds = useCompanyIds();

  // Session-persisted controls
  const [granularity, setGranularity] = useSessionState<PnLGranularity>('pnl-granularity', 'month');
  const [displayFormat, setDisplayFormat] = useSessionState<PnLDisplayFormat>('pnl-format', 'combined');
  const [channelTab, setChannelTab] = useSessionState<PnLChannelTab>('pnl-channel', 'total');
  const [foodCostPct, setFoodCostPct] = useSessionState<number>('pnl-food-cost', 30);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Data hook
  const { data, isLoading, error } = usePnLData({
    granularity,
    channelTab,
    foodCostPct,
  });

  const isMultiCompany = companyIds.length > 1;
  const hasNoCompany = companyIds.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Pérdidas y Ganancias
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análisis financiero por canal de delivery
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            )}
            title="Vista tabla"
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'chart'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            )}
            title="Vista gráfico"
          >
            <LineChart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters hideChannels />

      {/* Multi-company disclaimer */}
      {isMultiCompany && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Selecciona una única compañía para obtener un P&L preciso con comisiones individuales.
          </p>
        </div>
      )}

      {/* No company selected */}
      {hasNoCompany && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          Selecciona una compañía para ver el P&L
        </div>
      )}

      {/* Main content */}
      {!hasNoCompany && (
        <>
          {/* Controls */}
          <PnLControls
            channelTab={channelTab}
            granularity={granularity}
            displayFormat={displayFormat}
            foodCostPct={foodCostPct}
            onChannelTabChange={setChannelTab}
            onGranularityChange={setGranularity}
            onDisplayFormatChange={setDisplayFormat}
            onFoodCostChange={setFoodCostPct}
          />

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <Info className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                Error al cargar datos: {error.message}
              </p>
            </div>
          )}

          {/* Data views */}
          {data && !isLoading && (
            viewMode === 'table' ? (
              <PnLTable data={data} displayFormat={displayFormat} />
            ) : (
              <PnLChart data={data} />
            )
          )}
        </>
      )}
    </div>
  );
}
