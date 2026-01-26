import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui';
import { ExportButtons, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters';
import {
  ChannelRatingCard,
  SummaryCard,
  ErrorHeatmap,
  ErrorTypesChart,
  ReviewsTable,
  useReputationData,
} from '@/features/reputation';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { getPeriodLabels } from '@/utils/formatters';
import {
  exportReputationToCSV,
  exportReputationToExcel,
  exportReputationToPDF,
  generateReputationPdfBlob,
  type ReputationExportData,
} from '@/utils/export';

type TabId = 'general' | 'detalle';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'detalle', label: 'Detalle' },
];

export function ReputationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { datePreset } = useDashboardFiltersStore();
  const { data, isLoading, error } = useReputationData();

  // Period labels for comparison
  const periodLabels = useMemo(() => getPeriodLabels(datePreset), [datePreset]);

  // Build export data helper
  const buildExportData = useCallback((): ReputationExportData | null => {
    if (!data) return null;

    const totalErrors = data.errorTypes.reduce((sum, e) => sum + e.count, 0);

    return {
      channelRatings: data.channelRatings.map((r) => ({
        channel: r.name,
        rating: r.rating,
        totalReviews: r.totalReviews,
        trend: r.positivePercent - 50,
      })),
      summary: {
        totalBilling: data.summary.totalBilling,
        totalRefunds: data.summary.totalRefunds,
      },
      errorTypes: data.errorTypes.map((e) => ({
        type: e.label,
        count: e.count,
        percentage: totalErrors > 0 ? (e.count / totalErrors) * 100 : 0,
      })),
      reviews: data.reviews.map((r) => ({
        id: r.id,
        channel: r.channel,
        restaurant: r.products.join(', ') || 'N/A',
        rating: typeof r.rating === 'number' ? r.rating : (r.rating === 'thumbsUp' ? 5 : 1),
        comment: r.comment || '',
        date: new Date(r.orderDate).toLocaleDateString('es-ES'),
        orderNumber: r.orderId,
      })),
      dateRange: `${periodLabels.current} vs. ${periodLabels.comparison}`,
    };
  }, [data, periodLabels]);

  // Export handler
  const handleExport = useCallback((format: ExportFormat) => {
    const exportData = buildExportData();
    if (!exportData) return;

    switch (format) {
      case 'pdf':
        exportReputationToPDF(exportData);
        break;
      case 'excel':
        exportReputationToExcel(exportData);
        break;
      case 'csv':
        exportReputationToCSV(exportData);
        break;
    }
  }, [buildExportData]);

  // Generate PDF blob for preview
  const generatePdfBlob = useCallback((): Blob => {
    const exportData = buildExportData();
    if (!exportData) throw new Error('No data available');
    return generateReputationPdfBlob(exportData);
  }, [buildExportData]);

  // Preview data for export modal
  const getPreviewData = useCallback((): PreviewTableData => {
    if (!data) return { headers: [], rows: [] };

    return {
      headers: ['Canal', 'Order ID', 'Fecha', 'Hora', 'Importe', 'Rating', 'Tag', 'Comentario'],
      rows: data.reviews.slice(0, 15).map((r) => [
        r.channel === 'glovo' ? 'Glovo' : r.channel === 'ubereats' ? 'Uber Eats' : 'Just Eat',
        r.orderId,
        new Date(r.orderDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        r.orderTime,
        `${r.value.toFixed(2)} €`,
        typeof r.rating === 'number' ? `${r.rating}★` : (r.rating === 'thumbsUp' ? '👍' : '👎'),
        r.tag,
        r.comment || '-',
      ]),
      totalRows: data.reviews.length,
    };
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reputación</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Valoraciones, reseñas y análisis de errores
            <span className="mx-2">·</span>
            <span className="font-medium text-gray-700">{periodLabels.current}</span>
            <span className="italic text-gray-400 ml-1.5">vs. {periodLabels.comparison}</span>
          </p>
        </div>
        {data && (
          <ExportButtons
            onExport={handleExport}
            getPreviewData={getPreviewData}
            generatePdfBlob={generatePdfBlob}
            previewTitle="Reputación"
            previewSubtitle={`${periodLabels.current} vs. ${periodLabels.comparison}`}
          />
        )}
      </div>

      {/* Filters */}
      <DashboardFilters />

      {isLoading || !data ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.channelRatings.map((rating) => (
              <ChannelRatingCard key={rating.channel} data={rating} />
            ))}
            <SummaryCard
              type="billing"
              value={data.summary.totalBilling}
              subtitle="Esta semana"
            />
            <SummaryCard
              type="refunds"
              value={data.summary.totalRefunds}
              subtitle="Devoluciones"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors',
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 border-gray-200'
                      : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'general' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ErrorHeatmap data={data.heatmap} />
              </div>
              <div>
                <ErrorTypesChart data={data.errorTypes} />
              </div>
            </div>
          ) : (
            <ReviewsTable data={data.reviews} />
          )}
        </>
      )}
    </div>
  );
}
