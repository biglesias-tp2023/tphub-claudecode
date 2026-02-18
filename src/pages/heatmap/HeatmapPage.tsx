import { useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { DashboardFilters } from '@/features/dashboard';
import { useHeatmapData, HeatmapGrid, MetricSelector } from '@/features/heatmap';
import type { HeatmapMetric } from '@/features/heatmap';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { getPeriodLabelsFromRange } from '@/utils/formatters';

export function HeatmapPage() {
  const [metric, setMetric] = useState<HeatmapMetric>('revenue');

  const { companyIds } = useGlobalFiltersStore();
  const { dateRange } = useDashboardFiltersStore();
  const { data, isLoading, error } = useHeatmapData();

  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const companyText = companyIds.length === 0
    ? 'Todos los negocios'
    : companyIds.length === 1
      ? '1 compañía'
      : `${companyIds.length} compañías`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Heatmap</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {companyText}
            <span className="mx-2">·</span>
            <span className="font-medium text-gray-700">{periodLabels.current}</span>
          </p>
        </div>
        <MetricSelector value={metric} onChange={setMetric} />
      </div>

      {/* Filters — exclude Just Eat since no data available yet */}
      <DashboardFilters excludeChannels={['justeat']} />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-500 text-sm">
          Error al cargar datos: {(error as Error).message}
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <HeatmapGrid data={data} metric={metric} />
        </div>
      ) : null}
    </div>
  );
}
