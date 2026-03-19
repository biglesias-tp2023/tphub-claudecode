/**
 * ProductsPage
 *
 * Product sales analysis dashboard.
 * Shows a ranked table of products by revenue with scorecards and export.
 */

import { useCallback, useMemo } from 'react';
import { Package, ShoppingCart, DollarSign, Receipt } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { ErrorAlert, ExportButtons, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import { ProductsAnalysisTable } from '@/features/products';
import { useProductsPageState } from './useProductsPageState';
import { useCompanyIds } from '@/stores/filtersStore';
import { useDateFilters } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface ScorecardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

function Scorecard({ title, value, icon: Icon, color }: ScorecardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{title}</p>
          <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const companyIds = useCompanyIds();
  const { dateRange } = useDateFilters();
  const { rows, summary, isLoading, error, refetch } = useProductsPageState();

  const periodLabels = useMemo(
    () => getPeriodLabelsFromRange(dateRange),
    [dateRange]
  );

  const companyText = useMemo(() => {
    if (companyIds.length === 0) return 'Todos los negocios';
    if (companyIds.length === 1) return '1 compañía';
    return `${companyIds.length} compañías`;
  }, [companyIds]);

  // Export: preview data
  const getPreviewData = useCallback((): PreviewTableData => {
    if (rows.length === 0) return { headers: [], rows: [] };
    return {
      headers: ['#', 'Producto', 'Precio €', 'Total (uds)', 'Total %', 'Ventas €', 'Ventas %'],
      rows: rows.slice(0, 20).map((row, idx) => [
        String(idx + 1),
        row.productName,
        formatCurrency(row.unitPrice),
        formatNumber(row.totalQuantity),
        `${row.quantityPercent.toFixed(1)}%`,
        formatCurrency(row.totalRevenue),
        `${row.revenuePercent.toFixed(1)}%`,
      ]),
      totalRows: rows.length,
    };
  }, [rows]);

  // Export: CSV/Excel handler
  const handleExport = useCallback((format: ExportFormat) => {
    if (rows.length === 0) return;

    const headers = ['#', 'Producto', 'Precio €', 'Total (uds)', 'Total %', 'Ventas €', 'Ventas %'];
    const csvRows = rows.map((row, idx) => [
      idx + 1,
      row.productName,
      row.unitPrice,
      row.totalQuantity,
      `${row.quantityPercent.toFixed(1)}%`,
      row.totalRevenue,
      `${row.revenuePercent.toFixed(1)}%`,
    ]);

    if (format === 'csv') {
      const csvContent = [
        headers.join(';'),
        ...csvRows.map((r) => r.map((v) => typeof v === 'string' && v.includes(';') ? `"${v}"` : v).join(';')),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${periodLabels.current.replace(/\s/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (format === 'excel') {
      import('xlsx').then(({ utils, writeFile }) => {
        const ws = utils.aoa_to_sheet([headers, ...csvRows]);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Productos');
        writeFile(wb, `productos_${periodLabels.current.replace(/\s/g, '_')}.xlsx`);
      });
    }
  }, [rows, periodLabels]);

  // Loading state
  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis de rendimiento por producto</p>
        </div>
        <DashboardFilters />
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis de rendimiento por producto</p>
        </div>
        <DashboardFilters />
        <div className="flex items-center justify-center h-96">
          <ErrorAlert
            error={error instanceof Error ? error : new Error('Error cargando datos de productos')}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {companyText}
            <span className="mx-2">·</span>
            <span className="font-medium text-gray-700">{periodLabels.current}</span>
          </p>
        </div>
        <ExportButtons
          onExport={handleExport}
          getPreviewData={getPreviewData}
          previewTitle="Productos — Análisis de Rendimiento"
          previewSubtitle={`${companyText} · ${periodLabels.current}`}
        />
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Scorecard
          title="Productos"
          value={formatNumber(summary.totalProducts)}
          icon={Package}
          color="bg-primary-600"
        />
        <Scorecard
          title="Unidades vendidas"
          value={formatNumber(summary.totalQuantity)}
          icon={ShoppingCart}
          color="bg-emerald-500"
        />
        <Scorecard
          title="Ventas totales"
          value={formatCurrency(summary.totalRevenue)}
          icon={DollarSign}
          color="bg-amber-500"
        />
        <Scorecard
          title="Ticket medio"
          value={formatCurrency(summary.avgTicket)}
          icon={Receipt}
          color="bg-violet-500"
        />
      </div>

      {/* Table */}
      <ProductsAnalysisTable data={rows} isLoading={isLoading} />
    </div>
  );
}
