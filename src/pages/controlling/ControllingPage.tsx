import { useState, useMemo, useCallback } from 'react';
import {
  Euro,
  ShoppingBag,
  Receipt,
  Clock,
  Megaphone,
  Tag,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Building2,
  Store,
  MapPin,
  Navigation,
  Check,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { ExportButtons, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import { useControllingData } from '@/features/controlling';
import type { HierarchyRow, ChannelMetrics } from '@/features/controlling';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabels } from '@/utils/formatters';
import {
  exportControllingToCSV,
  exportControllingToExcel,
  exportControllingToPDF,
  generateControllingPdfBlob,
  type ControllingExportData,
} from '@/utils/export';
import { cn } from '@/utils/cn';
import type { ChannelId } from '@/types';

// ============================================
// PORTFOLIO CARD COMPONENT (Minimal Design)
// ============================================

interface PortfolioCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  subtitle?: string;
}

function PortfolioCard({ title, value, change, icon: Icon, subtitle }: PortfolioCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
      </div>

      {/* Value */}
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>

      {/* Change and subtitle */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={cn(
          'text-xs font-semibold tabular-nums',
          isPositive ? 'text-emerald-600' : 'text-red-500'
        )}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
        {subtitle && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// CHANNEL CARD COMPONENT (Clean Design)
// ============================================

interface ChannelCardProps {
  data: ChannelMetrics;
}

const CHANNEL_STYLES: Record<ChannelId, { bg: string; border: string; accent: string }> = {
  glovo: { bg: 'bg-amber-50/50', border: 'border-amber-100', accent: 'bg-amber-400' },
  ubereats: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', accent: 'bg-emerald-500' },
  justeat: { bg: 'bg-orange-50/50', border: 'border-orange-100', accent: 'bg-orange-400' },
};

function ChannelCard({ data }: ChannelCardProps) {
  const isPositive = data.revenueChange >= 0;
  const styles = CHANNEL_STYLES[data.channel];

  return (
    <div className={cn('rounded-xl border p-5', styles.bg, styles.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-3 h-3 rounded-full', styles.accent)} />
          <span className="font-semibold text-gray-900">{data.name}</span>
        </div>
        <span className="text-sm text-gray-500 tabular-nums">{data.percentage.toFixed(1)}%</span>
      </div>

      {/* Main metric */}
      <div className="mb-5">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(data.revenue)}</p>
        <span className={cn(
          'text-sm font-medium tabular-nums',
          isPositive ? 'text-emerald-600' : 'text-red-500'
        )}>
          {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{data.revenueChange.toFixed(1)}%
        </span>
      </div>

      {/* Stats grid - Top row */}
      <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-200/60">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Pedidos</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(data.pedidos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.pedidosPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ticket</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{data.ticketMedio.toFixed(1)}€</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Open</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{data.openTime.toFixed(0)}%</p>
        </div>
      </div>

      {/* Stats grid - Bottom row */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/60">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ads</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.ads)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.adsPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Promos</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.promos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.promosPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Reemb.</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.reembolsos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.reembolsosPercentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HIERARCHY TABLE COMPONENT
// ============================================

type ViewTab = 'rendimiento' | 'operaciones' | 'publicidad' | 'promociones';

interface HierarchyTableProps {
  data: HierarchyRow[];
}

const LEVEL_ICONS: Record<HierarchyRow['level'], React.ElementType> = {
  company: Building2,
  brand: Store,
  area: MapPin,
  address: Navigation,
  channel: ShoppingBag,
};

const CHANNEL_COLORS: Record<ChannelId, string> = {
  glovo: 'bg-amber-100 text-amber-800',
  ubereats: 'bg-emerald-100 text-emerald-800',
  justeat: 'bg-orange-100 text-orange-800',
};

function HierarchyTable({ data }: HierarchyTableProps) {
  const [activeTabs, setActiveTabs] = useState<Set<ViewTab>>(new Set(['rendimiento']));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleTab = (tab: ViewTab) => {
    setActiveTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) {
        if (next.size > 1) next.delete(tab);
      } else {
        next.add(tab);
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleRows = useMemo(() => {
    const result: (HierarchyRow & { _depth: number })[] = [];
    const topLevel = data.filter((r) => !r.parentId);

    const addWithChildren = (row: HierarchyRow, depth: number) => {
      result.push({ ...row, _depth: depth });
      if (expandedRows.has(row.id)) {
        const children = data.filter((r) => r.parentId === row.id);
        children.forEach((child) => addWithChildren(child, depth + 1));
      }
    };

    topLevel.forEach((row) => addWithChildren(row, 0));
    return result;
  }, [data, expandedRows]);

  const hasChildren = (id: string) => data.some((r) => r.parentId === id);

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'rendimiento', label: 'Rendimiento' },
    { id: 'operaciones', label: 'Operaciones' },
    { id: 'publicidad', label: 'Publicidad' },
    { id: 'promociones', label: 'Promociones' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Detalle por Compañía</h3>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = activeTabs.has(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => toggleTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                {isActive && <Check className="w-3 h-3" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs w-64">
                Compañía / Marca / Área / Local / Canal
              </th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Ventas</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Var.</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Pedidos</th>
              {activeTabs.has('rendimiento') && (
                <>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Ticket</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Nuevos</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">% Nuevos</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Open</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Conv.</th>
                </>
              )}
              {activeTabs.has('operaciones') && (
                <>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">T.Espera</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Rating</th>
                </>
              )}
              {activeTabs.has('publicidad') && (
                <>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Ads</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Ads %</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">ROAS</th>
                </>
              )}
              {activeTabs.has('promociones') && (
                <>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Promos</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">Promos %</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs">ROAS</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const Icon = LEVEL_ICONS[row.level];
              const canExpand = hasChildren(row.id);
              const isExpanded = expandedRows.has(row.id);
              const depth = row._depth;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                    row.level === 'channel' && 'bg-gray-50/30'
                  )}
                >
                  <td className="py-2.5 px-4">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: depth * 20 }}
                    >
                      {canExpand ? (
                        <button
                          onClick={() => toggleRow(row.id)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      {row.channelId ? (
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', CHANNEL_COLORS[row.channelId])}>
                          {row.name}
                        </span>
                      ) : (
                        <>
                          <Icon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{row.name}</span>
                          {row.subtitle && (
                            <span className="text-gray-400 text-xs">{row.subtitle}</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-2 font-medium text-gray-900 text-sm tabular-nums">
                    {formatCurrency(row.ventas)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-xs tabular-nums">
                    <span className={row.ventasChange >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {row.ventasChange >= 0 ? '+' : ''}{row.ventasChange.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.pedidos)}</td>
                  {activeTabs.has('rendimiento') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ticketMedio.toFixed(1)}€</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.nuevosClientes)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.porcentajeNuevos.toFixed(1)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.openTime.toFixed(0)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ratioConversion.toFixed(1)}%</td>
                    </>
                  )}
                  {activeTabs.has('operaciones') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm">{row.tiempoEspera}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.valoraciones.toFixed(1)}</td>
                    </>
                  )}
                  {activeTabs.has('publicidad') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatCurrency(row.inversionAds)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.adsPercentage.toFixed(1)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.roas.toFixed(1)}</td>
                    </>
                  )}
                  {activeTabs.has('promociones') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatCurrency(row.inversionPromos)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosPercentage.toFixed(1)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosRoas.toFixed(1)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function ControllingPage() {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset } = useDashboardFiltersStore();
  const { data, isLoading, error } = useControllingData();

  // Period labels for comparison
  const periodLabels = useMemo(() => getPeriodLabels(datePreset), [datePreset]);

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
        `${row.openTime.toFixed(0)}%`,
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
        openTime: row.openTime,
        ratioConversion: row.ratioConversion,
        tiempoEspera: row.tiempoEspera,
        valoraciones: row.valoraciones,
        inversionAds: row.inversionAds,
        adsPercentage: row.adsPercentage,
        roas: row.roas,
        inversionPromos: row.inversionPromos,
        promosPercentage: row.promosPercentage,
        promosRoas: row.promosRoas,
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
  const generatePdfBlob = useCallback((): Blob => {
    const exportData = buildExportData();
    if (!exportData) throw new Error('No data available');
    return generateControllingPdfBlob(exportData);
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
        <p className="text-red-600">Error al cargar los datos</p>
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
        <ExportButtons
          onExport={handleExport}
          getPreviewData={getPreviewData}
          generatePdfBlob={generatePdfBlob}
          previewTitle="Controlling"
          previewSubtitle={`${periodLabels.current} vs. ${periodLabels.comparison}`}
        />
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
            <ChannelCard key={channel.channel} data={channel} />
          ))}
        </div>
      </section>

      {/* Detalle por Compañía */}
      <section>
        <HierarchyTable data={hierarchy} />
      </section>
    </div>
  );
}
