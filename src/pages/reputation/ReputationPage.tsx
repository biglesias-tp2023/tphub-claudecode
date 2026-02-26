import { useState, useMemo, useCallback } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui';
import { ExportButtons, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters';
import {
  ChannelRatingCard,
  SummaryCard,
  ErrorHeatmap,
  RatingDistributionChart,
  ReviewsTable,
  ReviewDetailDrawer,
  useReputationData,
} from '@/features/reputation';
import type { Review } from '@/features/reputation';
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
  const [activeTab, setActiveTab] = useSessionState<TabId>('tphub-reputation-activeTab', 'general');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const { datePreset } = useDashboardFiltersStore();
  const { data, isLoading, error } = useReputationData();

  // Period labels for comparison
  const periodLabels = useMemo(() => getPeriodLabels(datePreset), [datePreset]);

  // Build export data helper
  const buildExportData = useCallback((): ReputationExportData | null => {
    if (!data) return null;

    const totalReviews = data.ratingDistribution.reduce((sum, r) => sum + r.count, 0);

    return {
      channelRatings: data.channelRatings.map((r) => ({
        channel: r.name,
        rating: r.rating,
        totalReviews: r.totalReviews,
        positivePercent: r.positivePercent,
        negativePercent: r.negativePercent,
      })),
      summary: {
        totalReviews: data.summary.totalReviews,
        negativeReviews: data.summary.negativeReviews,
        totalRefunds: data.summary.totalRefunds,
        refundRate: data.summary.refundRate,
      },
      ratingDistribution: data.ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r.count,
        percentage: totalReviews > 0 ? (r.count / totalReviews) * 100 : 0,
      })),
      reviews: data.reviews.map((r) => ({
        id: r.id,
        channel: r.channel,
        orderId: r.orderId,
        orderAmount: r.orderAmount ?? undefined,
        rating: r.rating,
        date: new Date(r.date).toLocaleDateString('es-ES'),
        time: r.time,
        comment: r.comment ?? undefined,
        tags: r.tags ?? undefined,
        deliveryTime: r.deliveryTime ?? undefined,
        refundAmount: r.refundAmount ?? undefined,
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
  const generatePdfBlob = useCallback(async (): Promise<Blob> => {
    const exportData = buildExportData();
    if (!exportData) throw new Error('No data available');
    return await generateReputationPdfBlob(exportData);
  }, [buildExportData]);

  // Preview data for export modal
  const getPreviewData = useCallback((): PreviewTableData => {
    if (!data) return { headers: [], rows: [] };

    return {
      headers: ['Canal', 'Review ID', 'Order ID', 'AOV', 'Fecha', 'Hora', 'Rating', 'Comentario', 'Tags', 'T. Entrega', 'Reembolso'],
      rows: data.reviews.slice(0, 15).map((r) => [
        r.channel === 'glovo' ? 'Glovo' : r.channel === 'ubereats' ? 'Uber Eats' : 'Just Eat',
        r.id.slice(0, 12),
        r.orderId.slice(0, 12),
        r.orderAmount != null && r.orderAmount > 0 ? `${r.orderAmount.toFixed(2)} €` : '—',
        new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        r.time,
        `${r.rating}★`,
        r.comment ?? '—',
        r.tags?.join(', ') ?? '—',
        r.deliveryTime != null ? `${r.deliveryTime} min` : '—',
        r.refundAmount != null && r.refundAmount > 0 ? `${r.refundAmount.toFixed(2)} €` : '—',
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
            Valoraciones y reseñas de clientes
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
          <div className="flex gap-4 overflow-x-auto">
            {data.channelRatings.map((rating) => (
              <ChannelRatingCard key={rating.channel} data={rating} className="flex-1 min-w-0" />
            ))}
            <SummaryCard
              type="negativeReviews"
              value={data.summary.negativeReviews}
              change={data.summary.negativeReviewsChange}
              subtitle={data.summary.totalReviews > 0
                ? `${((data.summary.negativeReviews / data.summary.totalReviews) * 100).toFixed(1)}% del total`
                : undefined
              }
              className="flex-1 min-w-0"
            />
            <SummaryCard
              type="refunds"
              value={data.summary.totalRefunds}
              change={data.summary.totalRefundsChange}
              subtitle={`${data.summary.refundRate.toFixed(1)}% de ventas`}
              className="flex-1 min-w-0"
            />
          </div>

          {/* Tabs */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'general' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ErrorHeatmap data={data.heatmap} />
              </div>
              <div>
                <RatingDistributionChart data={data.ratingDistribution} />
              </div>
            </div>
          ) : (
            <ReviewsTable
              data={data.reviews}
              totalInPeriod={data.totalReviewsInPeriod}
              onRowClick={setSelectedReview}
            />
          )}
        </>
      )}

      {/* Review detail drawer */}
      <ReviewDetailDrawer
        review={selectedReview}
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
}
