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
  ChevronUp,
  Building2,
  Store,
  MapPin,
  Check,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { ExportButtons, DataFreshnessIndicator, type ExportFormat, type PreviewTableData } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import { useControllingData, useWeeklyRevenue } from '@/features/controlling';
import type { HierarchyRow, ChannelMetrics } from '@/features/controlling';
import { Sparkline } from '@/components/charts/Sparkline';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
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
  weeklyData?: number[];
  weeklyLoading?: boolean;
}

const CHANNEL_STYLES: Record<ChannelId, { bg: string; border: string; sparkline: string }> = {
  glovo: { bg: 'bg-amber-50/50', border: 'border-amber-100', sparkline: '#d97706' },
  ubereats: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', sparkline: '#059669' },
  justeat: { bg: 'bg-orange-50/50', border: 'border-orange-100', sparkline: '#ea580c' },
};

const CHANNEL_LOGOS: Record<ChannelId, string> = {
  glovo: '/images/channels/glovo.png',
  ubereats: '/images/channels/ubereats.png',
  justeat: '/images/channels/justeat.webp',
};

function ChannelCard({ data, weeklyData, weeklyLoading }: ChannelCardProps) {
  const isPositive = data.revenueChange >= 0;
  const styles = CHANNEL_STYLES[data.channel];

  return (
    <div className={cn('rounded-xl border p-5', styles.bg, styles.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={CHANNEL_LOGOS[data.channel]}
            alt={data.name}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-lg font-semibold text-gray-900">{data.name}</span>
        </div>
        <span className="text-sm text-gray-500 tabular-nums">{data.percentage.toFixed(1)}%</span>
      </div>

      {/* Main metric + sparkline */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(data.revenue)}</p>
          <span className={cn(
            'text-sm font-medium tabular-nums',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{data.revenueChange.toFixed(1)}%
          </span>
        </div>
        <div>
          {weeklyLoading ? (
            <div className="w-[120px] h-[36px] bg-white/50 rounded animate-pulse" />
          ) : (
            <Sparkline
              data={weeklyData || []}
              width={120}
              height={36}
              color={styles.sparkline}
              areaOpacity={0.12}
            />
          )}
        </div>
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

// Sortable columns
type SortColumn =
  | 'name'
  | 'ventas'
  | 'ventasChange'
  | 'pedidos'
  | 'ticketMedio'
  | 'nuevosClientes'
  | 'porcentajeNuevos'
  | 'recurrentesClientes'
  | 'porcentajeRecurrentes'
  | 'openTime'
  | 'ratioConversion'
  | 'tiempoEspera'
  | 'valoraciones'
  | 'inversionAds'
  | 'adsPercentage'
  | 'roas'
  | 'inversionPromos'
  | 'promosPercentage'
  | 'promosRoas';
type SortDirection = 'asc' | 'desc' | null;

interface HierarchyTableProps {
  data: HierarchyRow[];
  periodLabels: { current: string; comparison: string };
  weeklyRevenue: Map<string, number[]>;
  weeklyRevenueLoading: boolean;
}

const LEVEL_ICONS: Record<HierarchyRow['level'], React.ElementType> = {
  company: Building2,
  brand: Store,
  address: MapPin,
  channel: ShoppingBag,
};

const CHANNEL_COLORS: Record<ChannelId, string> = {
  glovo: 'bg-amber-100 text-amber-800',
  ubereats: 'bg-emerald-100 text-emerald-800',
  justeat: 'bg-orange-100 text-orange-800',
};

// Sortable column header component
interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  currentSort: SortColumn | null;
  currentDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: 'left' | 'right';
}

function SortableHeader({ column, label, currentSort, currentDirection, onSort, align = 'right' }: SortableHeaderProps) {
  const isActive = currentSort === column;

  return (
    <th
      className={cn(
        'py-2.5 px-2 font-medium text-gray-500 text-xs cursor-pointer hover:bg-gray-100 select-none transition-colors',
        align === 'left' ? 'text-left' : 'text-right',
        align === 'left' && 'px-4 w-64'
      )}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && isActive && (
          currentDirection === 'desc' ? (
            <ChevronDown className="w-3 h-3 text-primary-600" />
          ) : (
            <ChevronUp className="w-3 h-3 text-primary-600" />
          )
        )}
        <span className={isActive ? 'text-primary-600' : ''}>{label}</span>
        {align === 'left' && isActive && (
          currentDirection === 'desc' ? (
            <ChevronDown className="w-3 h-3 text-primary-600" />
          ) : (
            <ChevronUp className="w-3 h-3 text-primary-600" />
          )
        )}
      </span>
    </th>
  );
}

function HierarchyTable({ data, periodLabels, weeklyRevenue, weeklyRevenueLoading }: HierarchyTableProps) {
  const [activeTabs, setActiveTabs] = useState<Set<ViewTab>>(new Set(['rendimiento']));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

  // Get all descendant IDs for a given row
  const getDescendantIds = useCallback((parentId: string): string[] => {
    const descendants: string[] = [];
    const children = data.filter((r) => r.parentId === parentId);
    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...getDescendantIds(child.id));
    }
    return descendants;
  }, [data]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Collapse this row AND all its descendants
        next.delete(id);
        const descendants = getDescendantIds(id);
        for (const descendantId of descendants) {
          next.delete(descendantId);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle column sorting: null -> desc -> asc -> null
  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      // New column: start with desc for numeric, asc for text
      setSortColumn(column);
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    } else {
      // Same column: cycle through desc -> asc -> null
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    }
  };

  // Sort function that respects hierarchy
  const sortRowsWithHierarchy = useCallback((rows: HierarchyRow[]): HierarchyRow[] => {
    if (!sortColumn || !sortDirection) return rows;

    // Group rows by parent
    const childrenByParent = new Map<string | undefined, HierarchyRow[]>();
    for (const row of rows) {
      const parentId = row.parentId;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(row);
    }

    // Helper to parse time string "mm:ss" to seconds for comparison
    const parseTimeToSeconds = (time: string | undefined): number => {
      if (!time) return 0;
      const parts = time.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
      return 0;
    };

    // Sort comparator
    const compare = (a: HierarchyRow, b: HierarchyRow): number => {
      let valA: string | number;
      let valB: string | number;

      if (sortColumn === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortColumn === 'tiempoEspera') {
        // Parse time strings like "5:30" to seconds for proper numeric comparison
        valA = parseTimeToSeconds(a.tiempoEspera);
        valB = parseTimeToSeconds(b.tiempoEspera);
      } else {
        valA = a[sortColumn] ?? 0;
        valB = b[sortColumn] ?? 0;
      }

      let result: number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        result = valA.localeCompare(valB, 'es');
      } else {
        result = (valA as number) - (valB as number);
      }

      return sortDirection === 'desc' ? -result : result;
    };

    // Sort each group of siblings
    for (const [, siblings] of childrenByParent) {
      siblings.sort(compare);
    }

    // Rebuild rows array maintaining hierarchy order
    const sortedRows: HierarchyRow[] = [];
    const addSorted = (parentId: string | undefined) => {
      const children = childrenByParent.get(parentId) || [];
      for (const child of children) {
        sortedRows.push(child);
        addSorted(child.id);
      }
    };
    addSorted(undefined);

    return sortedRows;
  }, [sortColumn, sortDirection]);

  const visibleRows = useMemo(() => {
    // First, sort the data while respecting hierarchy
    const sortedData = sortRowsWithHierarchy(data);

    const result: (HierarchyRow & { _depth: number })[] = [];
    const topLevel = sortedData.filter((r) => !r.parentId);

    const addWithChildren = (row: HierarchyRow, depth: number) => {
      result.push({ ...row, _depth: depth });
      if (expandedRows.has(row.id)) {
        const children = sortedData.filter((r) => r.parentId === row.id);
        children.forEach((child) => addWithChildren(child, depth + 1));
      }
    };

    topLevel.forEach((row) => addWithChildren(row, 0));
    return result;
  }, [data, expandedRows, sortRowsWithHierarchy]);

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
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Detalle por Compañía</h3>
          <span className="text-xs">
            <span className="font-medium text-gray-500">{periodLabels.current}</span>
            <span className="italic text-gray-400 ml-1">vs. {periodLabels.comparison}</span>
          </span>
        </div>
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
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
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
              <SortableHeader
                column="name"
                label="Compañía / Marca / Dirección / Canal"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="left"
              />
              <SortableHeader
                column="ventas"
                label="Ventas"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                column="ventasChange"
                label="Var."
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="py-2.5 px-2 font-medium text-gray-500 text-xs text-center w-[98px]">
                Evolución
              </th>
              <SortableHeader
                column="pedidos"
                label="Pedidos"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              {activeTabs.has('rendimiento') && (
                <>
                  <SortableHeader
                    column="ticketMedio"
                    label="Ticket"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="nuevosClientes"
                    label="Nuevos"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="porcentajeNuevos"
                    label="% Nuevos"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="recurrentesClientes"
                    label="Recurrentes"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="porcentajeRecurrentes"
                    label="% Recurrentes"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="openTime"
                    label="Open"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="ratioConversion"
                    label="Conv."
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </>
              )}
              {activeTabs.has('operaciones') && (
                <>
                  <SortableHeader
                    column="tiempoEspera"
                    label="T.Espera"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="valoraciones"
                    label="Rating"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </>
              )}
              {activeTabs.has('publicidad') && (
                <>
                  <SortableHeader
                    column="inversionAds"
                    label="Ads"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="adsPercentage"
                    label="Ads %"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="roas"
                    label="ROAS"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </>
              )}
              {activeTabs.has('promociones') && (
                <>
                  <SortableHeader
                    column="inversionPromos"
                    label="Promos"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="promosPercentage"
                    label="Promos %"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="promosRoas"
                    label="ROAS"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
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
                    row.level === 'company' && 'bg-primary-50/60',
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
                  <td className="py-2.5 px-1 text-center">
                    {weeklyRevenueLoading ? (
                      <div className="inline-block w-[90px] h-[28px] bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <Sparkline
                        data={weeklyRevenue.get(row.id) || []}
                        color={row.level === 'company' ? '#095789' : '#9ca3af'}
                        areaOpacity={row.level === 'company' ? 0.1 : 0.06}
                      />
                    )}
                  </td>
                  <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.pedidos)}</td>
                  {activeTabs.has('rendimiento') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ticketMedio.toFixed(1)}€</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.nuevosClientes)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.porcentajeNuevos.toFixed(1)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.recurrentesClientes)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.porcentajeRecurrentes.toFixed(1)}%</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.openTime != null ? `${row.openTime.toFixed(0)}%` : '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ratioConversion != null ? `${row.ratioConversion.toFixed(1)}%` : '-'}</td>
                    </>
                  )}
                  {activeTabs.has('operaciones') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm">{row.tiempoEspera || '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.valoraciones != null ? row.valoraciones.toFixed(1) : '-'}</td>
                    </>
                  )}
                  {activeTabs.has('publicidad') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.inversionAds != null ? formatCurrency(row.inversionAds) : '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.adsPercentage != null ? `${row.adsPercentage.toFixed(1)}%` : '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.roas != null ? row.roas.toFixed(1) : '-'}</td>
                    </>
                  )}
                  {activeTabs.has('promociones') && (
                    <>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.inversionPromos != null ? formatCurrency(row.inversionPromos) : '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosPercentage != null ? `${row.promosPercentage.toFixed(1)}%` : '-'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosRoas != null ? row.promosRoas.toFixed(1) : '-'}</td>
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
  const { dateRange } = useDashboardFiltersStore();
  const { data, isLoading, error } = useControllingData();
  const { weeklyRevenue, channelWeeklyRevenue, isLoading: weeklyRevenueLoading } = useWeeklyRevenue();

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
        />
      </section>
    </div>
  );
}
