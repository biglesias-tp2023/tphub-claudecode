import { useMemo, useCallback } from 'react';
import {
  Euro,
  ShoppingBag,
  Receipt,
  Clock,
  Megaphone,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorAlert, ExportButtons, DataFreshnessIndicator, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import { useControllingData, useWeeklyRevenue } from '@/features/controlling';
import type { HierarchyRow } from '@/features/controlling';
import { PortfolioCard, ChannelCard, HierarchyTable, DetailPanel } from '@/features/controlling/components';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useSessionState } from '@/hooks/useSessionState';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
import {
  exportControllingToCSV,
  exportControllingToExcel,
  exportControllingToPDF,
  generateControllingPdfBlob,
  type ControllingExportData,
} from '@/utils/export';

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function ControllingPage() {
  const companyIds = useGlobalFiltersStore((s) => s.companyIds);
  const dateRange = useDashboardFiltersStore((s) => s.dateRange);
  const { data, isLoading, error } = useControllingData();
  const { weeklyRevenue, channelWeeklyRevenue, weeklyMetrics, isLoading: weeklyRevenueLoading } = useWeeklyRevenue();

  // Detail panel state — persist selected row ID across navigation
  const [selectedRowId, setSelectedRowId] = useSessionState<string | null>('tphub-controlling-selectedRow', null);
  const selectedRow = useMemo(
    () => (selectedRowId && data ? data.hierarchy.find((r) => r.id === selectedRowId) ?? null : null),
    [selectedRowId, data]
  );
  const setSelectedRow = useCallback(
    (row: HierarchyRow | null) => setSelectedRowId(row?.id ?? null),
    [setSelectedRowId]
  );

  // Period labels for comparison - use actual dateRange values
  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const companyText = companyIds.length === 0
    ? 'Todos los negocios'
    : companyIds.length === 1
      ? '1 compañía'
      : `${companyIds.length} compañías`;

  // Preview data for export
  const getPreviewData = useCallback((): PreviewTableData => {
    if (!data) return { headers: [], rows: [] };

    return {
      headers: ['Nombre', 'Nivel', 'Ventas', 'Var. %', 'Pedidos', 'Ticket', 'Open Time'],
      rows: data.hierarchy.slice(0, 15).map((row) => [
        row.name,
        row.level,
        formatCurrency(row.ventas),
        `${row.ventasChange >= 0 ? '+' : ''}${row.ventasChange.toFixed(1)}%`,
        formatNumber(row.pedidos),
        `${row.ticketMedio.toFixed(1)}€`,
        `${(row.openTime ?? 0).toFixed(0)}%`,
      ]),
      totalRows: data.hierarchy.length,
    };
  }, [data]);

  // Build export data helper
  const buildExportData = useCallback((): ControllingExportData | null => {
    if (!data) return null;

    return {
      portfolio: data.portfolio,
      channels: data.channels.map((ch) => ({
        channel: ch.channel,
        name: ch.name,
        revenue: ch.revenue,
        revenueChange: ch.revenueChange,
        percentage: ch.percentage,
        pedidos: ch.pedidos,
        pedidosPercentage: ch.pedidosPercentage,
        ticketMedio: ch.ticketMedio,
        openTime: ch.openTime,
        ads: ch.ads,
        adsPercentage: ch.adsPercentage,
        promos: ch.promos,
        promosPercentage: ch.promosPercentage,
        reembolsos: ch.reembolsos,
        reembolsosPercentage: ch.reembolsosPercentage,
      })),
      hierarchy: data.hierarchy.map((row) => ({
        name: row.name,
        level: row.level,
        ventas: row.ventas,
        ventasChange: row.ventasChange,
        pedidos: row.pedidos,
        ticketMedio: row.ticketMedio,
        nuevosClientes: row.nuevosClientes,
        porcentajeNuevos: row.porcentajeNuevos,
        openTime: row.openTime ?? 0,
        ratioConversion: row.ratioConversion ?? 0,
        tiempoEspera: row.tiempoEspera ?? '-',
        valoraciones: row.valoraciones ?? 0,
        inversionAds: row.inversionAds ?? 0,
        adsPercentage: row.adsPercentage ?? 0,
        roas: row.roas ?? 0,
        inversionPromos: row.inversionPromos ?? 0,
        promosPercentage: row.promosPercentage ?? 0,
        promosRoas: row.promosRoas ?? 0,
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
        exportControllingToPDF(exportData);
        break;
      case 'excel':
        exportControllingToExcel(exportData);
        break;
      case 'csv':
        exportControllingToCSV(exportData);
        break;
    }
  }, [buildExportData]);

  // Generate PDF blob for preview
  const generatePdfBlob = useCallback(async (): Promise<Blob> => {
    const exportData = buildExportData();
    if (!exportData) throw new Error('No data available');
    return await generateControllingPdfBlob(exportData);
  }, [buildExportData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <ErrorAlert error={error instanceof Error ? error : new Error('Error al cargar los datos')} />
      </div>
    );
  }

  const { portfolio, channels: allChannels, hierarchy } = data;

  // Filter out Just Eat from channels (no data available yet)
  const channels = allChannels.filter((ch) => ch.channel !== 'justeat');

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Controlling</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {companyText}
            <span className="mx-2">·</span>
            <span className="font-medium text-gray-700">{periodLabels.current}</span>
            <span className="italic text-gray-400 ml-1.5">vs. {periodLabels.comparison}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataFreshnessIndicator />
          <ExportButtons
            onExport={handleExport}
            getPreviewData={getPreviewData}
            generatePdfBlob={generatePdfBlob}
            previewTitle="Controlling"
            previewSubtitle={`${periodLabels.current} vs. ${periodLabels.comparison}`}
          />
        </div>
      </div>

      {/* Filters - exclude Just Eat since no data available yet */}
      <DashboardFilters excludeChannels={['justeat']} />

      {/* Resumen Cartera */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumen Cartera</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <PortfolioCard
            title="Ventas"
            value={formatCurrency(portfolio.ventas)}
            change={portfolio.ventasChange}
            icon={Euro}
          />
          <PortfolioCard
            title="Pedidos"
            value={formatNumber(portfolio.pedidos)}
            change={portfolio.pedidosChange}
            icon={ShoppingBag}
          />
          <PortfolioCard
            title="Ticket Medio"
            value={formatCurrency(portfolio.ticketMedio)}
            change={portfolio.ticketMedioChange}
            icon={Receipt}
          />
          <PortfolioCard
            title="Open Time"
            value={`${portfolio.openTime.toFixed(1)}%`}
            change={portfolio.openTimeChange}
            icon={Clock}
          />
          <PortfolioCard
            title="Inversión Ads"
            value={formatCurrency(portfolio.inversionAds)}
            change={portfolio.inversionAdsChange}
            subtitle={`(${portfolio.adsPercentage.toFixed(1)}%)`}
            icon={Megaphone}
          />
          <PortfolioCard
            title="Inv. Promos"
            value={formatCurrency(portfolio.inversionPromos)}
            change={portfolio.inversionPromosChange}
            subtitle={`(${portfolio.promosPercentage.toFixed(1)}%)`}
            icon={Tag}
          />
          <PortfolioCard
            title="Reembolsos"
            value={formatCurrency(portfolio.reembolsos)}
            change={portfolio.reembolsosChange}
            subtitle={`(${portfolio.reembolsosPercentage.toFixed(1)}%)`}
            icon={RotateCcw}
          />
        </div>
      </section>

      {/* Rendimiento por Canal */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Rendimiento por Canal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.channel}
              data={channel}
              weeklyData={channelWeeklyRevenue.get(channel.channel)}
              weeklyLoading={weeklyRevenueLoading}
            />
          ))}
        </div>
      </section>

      {/* Detalle por Compañía */}
      <section>
        <HierarchyTable
          data={hierarchy}
          periodLabels={periodLabels}
          weeklyRevenue={weeklyRevenue}
          weeklyRevenueLoading={weeklyRevenueLoading}
          onRowClick={setSelectedRow}
        />
      </section>

      {/* Detail Panel (Drawer) */}
      <DetailPanel
        row={selectedRow}
        hierarchy={hierarchy}
        weeklyMetrics={weeklyMetrics}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
