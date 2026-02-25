import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Building2,
  Store,
  MapPin,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { Sparkline } from '@/components/charts/Sparkline';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { HierarchyRow } from '@/features/controlling';
import { useSessionState, useSessionSet } from '@/features/controlling/hooks/useSessionState';
import type { ChannelId } from '@/types';

type ViewTab = 'rendimiento' | 'publicidad' | 'promociones' | 'operaciones';

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
  | 'inversionAds'
  | 'adsPercentage'
  | 'roas'
  | 'impressions'
  | 'clicks'
  | 'adOrders'
  | 'inversionPromos'
  | 'promosPercentage'
  | 'promosRoas'
  | 'organicOrders'
  | 'ratingGlovo'
  | 'reviewsGlovo'
  | 'ratingUber'
  | 'reviewsUber';
type SortDirection = 'asc' | 'desc' | null;

interface HierarchyTableProps {
  data: HierarchyRow[];
  periodLabels: { current: string; comparison: string };
  weeklyRevenue: Map<string, number[]>;
  weeklyRevenueLoading: boolean;
  onRowClick?: (row: HierarchyRow) => void;
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

// --- Extracted row component (memoized) ---

interface HierarchyTableRowProps {
  row: HierarchyRow & { _depth: number };
  canExpand: boolean;
  isExpanded: boolean;
  activeTabs: ReadonlySet<ViewTab>;
  onRowClick?: (row: HierarchyRow) => void;
  onToggleRow: (id: string) => void;
  weeklyRevenue: Map<string, number[]>;
  weeklyRevenueLoading: boolean;
}

const HierarchyTableRow = React.memo(function HierarchyTableRow({
  row,
  canExpand,
  isExpanded,
  activeTabs,
  onRowClick,
  onToggleRow,
  weeklyRevenue,
  weeklyRevenueLoading,
}: HierarchyTableRowProps) {
  const Icon = LEVEL_ICONS[row.level];
  const depth = row._depth;

  const handleRowClick = useCallback(() => {
    onRowClick?.(row);
  }, [onRowClick, row]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleRow(row.id);
    },
    [onToggleRow, row.id]
  );

  return (
    <tr
      className={cn(
        'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
        row.level === 'company' && 'bg-primary-50/60',
        row.level === 'channel' && 'bg-gray-50/30',
        onRowClick && 'cursor-pointer'
      )}
      onClick={handleRowClick}
    >
      <td className="py-2.5 px-4">
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: depth * 20 }}
        >
          {canExpand ? (
            <button
              onClick={handleToggle}
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
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ticketMedio.toFixed(1)}{'\u20AC'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.nuevosClientes)}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.porcentajeNuevos.toFixed(1)}%</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{formatNumber(row.recurrentesClientes)}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.porcentajeRecurrentes.toFixed(1)}%</td>
        </>
      )}
      {activeTabs.has('publicidad') && (
        <>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.inversionAds != null ? formatCurrency(row.inversionAds) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.adsPercentage != null ? `${row.adsPercentage.toFixed(1)}%` : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.roas != null ? row.roas.toFixed(1) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.impressions ? formatNumber(row.impressions) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.clicks ? formatNumber(row.clicks) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.adOrders ? formatNumber(row.adOrders) : '-'}</td>
        </>
      )}
      {activeTabs.has('promociones') && (
        <>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.inversionPromos != null ? formatCurrency(row.inversionPromos) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosPercentage != null ? `${row.promosPercentage.toFixed(1)}%` : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.promosRoas != null ? row.promosRoas.toFixed(1) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums" title="Pedidos sin promocion">{row.organicOrders != null ? `${row.organicOrders.toFixed(1)}%` : '-'}</td>
        </>
      )}
      {activeTabs.has('operaciones') && (
        <>
          <td className="text-right py-2.5 px-2 text-gray-400 text-sm">-</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ratingGlovo ? `${row.ratingGlovo.toFixed(1)}%` : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.reviewsGlovo ? formatNumber(row.reviewsGlovo) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.ratingUber ? row.ratingUber.toFixed(1) : '-'}</td>
          <td className="text-right py-2.5 px-2 text-gray-600 text-sm tabular-nums">{row.reviewsUber ? formatNumber(row.reviewsUber) : '-'}</td>
        </>
      )}
    </tr>
  );
});

// --- Main table component ---

export function HierarchyTable({ data, periodLabels, weeklyRevenue, weeklyRevenueLoading, onRowClick }: HierarchyTableProps) {
  const [activeTabs, setActiveTabs] = useSessionSet<ViewTab>('tphub-ht-tabs', ['rendimiento']);
  const [expandedRows, setExpandedRows] = useSessionSet<string>('tphub-ht-expanded', []);
  const [sortColumn, setSortColumn] = useSessionState<SortColumn | null>('tphub-ht-sort-col', null);
  const [sortDirection, setSortDirection] = useSessionState<SortDirection>('tphub-ht-sort-dir', null);

  // Scroll restoration
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Restore horizontal scroll position after first render
    requestAnimationFrame(() => {
      try {
        const scrollX = sessionStorage.getItem('tphub-ht-scroll-x');
        if (scrollX && scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = Number(scrollX);
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const handleTableScroll = useCallback(() => {
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      try {
        if (scrollContainerRef.current) {
          sessionStorage.setItem('tphub-ht-scroll-x', String(scrollContainerRef.current.scrollLeft));
        }
      } catch {
        // ignore
      }
    }, 150);
  }, []);

  useEffect(() => {
    return () => clearTimeout(scrollTimerRef.current);
  }, []);

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

  // Pre-build parent->children index for O(1) lookups
  const childrenIndex = useMemo(() => {
    const map = new Map<string | undefined, HierarchyRow[]>();
    for (const row of data) {
      const pid = row.parentId;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(row);
    }
    return map;
  }, [data]);

  // Get all descendant IDs for a given row (uses pre-built index)
  const getDescendantIds = useCallback((parentId: string): string[] => {
    const descendants: string[] = [];
    const stack = [parentId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const children = childrenIndex.get(currentId) || [];
      for (const child of children) {
        descendants.push(child.id);
        stack.push(child.id);
      }
    }
    return descendants;
  }, [childrenIndex]);

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

    // Sort comparator
    const compare = (a: HierarchyRow, b: HierarchyRow): number => {
      let valA: string | number;
      let valB: string | number;

      if (sortColumn === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
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

    // Build sorted index for O(1) child lookups
    const sortedChildrenIndex = new Map<string | undefined, HierarchyRow[]>();
    for (const row of sortedData) {
      const pid = row.parentId;
      if (!sortedChildrenIndex.has(pid)) sortedChildrenIndex.set(pid, []);
      sortedChildrenIndex.get(pid)!.push(row);
    }

    const result: (HierarchyRow & { _depth: number })[] = [];
    const topLevel = sortedChildrenIndex.get(undefined) || [];

    const addWithChildren = (row: HierarchyRow, depth: number) => {
      result.push({ ...row, _depth: depth });
      if (expandedRows.has(row.id)) {
        const children = sortedChildrenIndex.get(row.id) || [];
        children.forEach((child) => addWithChildren(child, depth + 1));
      }
    };

    topLevel.forEach((row) => addWithChildren(row, 0));
    return result;
  }, [data, expandedRows, sortRowsWithHierarchy]);

  const hasChildren = (id: string) => childrenIndex.has(id);

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'rendimiento', label: 'Rendimiento' },
    { id: 'publicidad', label: 'Publicidad' },
    { id: 'promociones', label: 'Promociones' },
    { id: 'operaciones', label: 'Operaciones' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Detalle por Compania</h3>
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
      <div className="overflow-x-auto" ref={scrollContainerRef} onScroll={handleTableScroll}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <SortableHeader
                column="name"
                label="Compania / Marca / Direccion / Canal"
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
                Evolucion
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
                </>
              )}
              {activeTabs.has('publicidad') && (
                <>
                  <SortableHeader
                    column="inversionAds"
                    label="Inv. Ads"
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
                  <SortableHeader
                    column="impressions"
                    label="Impresiones"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="clicks"
                    label="Clicks"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="adOrders"
                    label="Orders"
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
                    label="Inv. Promo"
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
                  <th
                    className="py-2.5 px-2 font-medium text-gray-500 text-xs text-right cursor-pointer hover:bg-gray-100 select-none transition-colors"
                    onClick={() => handleSort('organicOrders')}
                    title="Pedidos sin promocion"
                  >
                    <span className="inline-flex items-center gap-1">
                      {sortColumn === 'organicOrders' && (
                        sortDirection === 'desc' ? (
                          <ChevronDown className="w-3 h-3 text-primary-600" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-primary-600" />
                        )
                      )}
                      <span className={sortColumn === 'organicOrders' ? 'text-primary-600' : ''}>Organico</span>
                    </span>
                  </th>
                </>
              )}
              {activeTabs.has('operaciones') && (
                <>
                  <th className="py-2.5 px-2 font-medium text-gray-500 text-xs text-right" title="Tiempo de entrega">
                    ETA
                  </th>
                  <SortableHeader
                    column="ratingGlovo"
                    label="Rating G"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="reviewsGlovo"
                    label="Reviews G"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="ratingUber"
                    label="Rating Uber"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="reviewsUber"
                    label="Reviews Uber"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <HierarchyTableRow
                key={row.id}
                row={row}
                canExpand={hasChildren(row.id)}
                isExpanded={expandedRows.has(row.id)}
                activeTabs={activeTabs}
                onRowClick={onRowClick}
                onToggleRow={toggleRow}
                weeklyRevenue={weeklyRevenue}
                weeklyRevenueLoading={weeklyRevenueLoading}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
