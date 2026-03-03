import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Store,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Megaphone,
  Tag,
  BarChart3,
  Users,
  Clock,
  Layers,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer/Drawer';
import { formatCurrency } from '@/utils/formatters';
import { CHANNELS } from '@/constants/channels';
import type { ChannelId } from '@/types';
import type { HierarchyRow } from '../hooks/useControllingData';
import type { WeekMetrics } from '../hooks/useWeeklyRevenue';
import { useDetailPanelData } from '../hooks/useDetailPanelData';
import { useDetailSegments } from '../hooks/useDetailSegments';
import {
  RevenueByChannelChart,
  AdsRateRoasChart,
  PromosRateOrganicChart,
  PromoVsOrganicChart,
  CustomerSegmentsChart,
  AdsHourlyChart,
} from './detail-panel';
import { useAdsHourlyData } from '../hooks/useAdsHourlyData';

type ChannelView = 'all' | ChannelId;

const CHANNEL_TOGGLE_OPTIONS: { value: ChannelView; label: string; logoUrl?: string }[] = [
  { value: 'all', label: 'Agrupado' },
  { value: 'glovo', label: 'Glovo', logoUrl: CHANNELS.glovo.logoUrl },
  { value: 'ubereats', label: 'Uber', logoUrl: CHANNELS.ubereats.logoUrl },
];

const LEVEL_ICONS: Record<HierarchyRow['level'], React.ElementType> = {
  company: Building2,
  brand: Store,
  address: MapPin,
  channel: ShoppingBag,
};

const LEVEL_LABELS: Record<HierarchyRow['level'], string> = {
  company: 'Compania',
  brand: 'Marca',
  address: 'Establecimiento',
  channel: 'Canal',
};

interface ChartSectionProps {
  title: string;
  icon: React.ElementType;
  children?: React.ReactNode;
  placeholder?: boolean;
  note?: string;
}

function ChartSection({ title, icon: Icon, children, placeholder, note }: ChartSectionProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
        {note && <span className="text-[10px] text-gray-400 ml-auto">{note}</span>}
      </div>
      {placeholder ? (
        <div className="h-[180px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-xs text-gray-400">Proximamente</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Count descendants by level for a given row */
function getDescendantsSummary(row: HierarchyRow, hierarchy: HierarchyRow[]): string {
  const descendants: HierarchyRow[] = [];
  const queue = [row.id];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const r of hierarchy) {
      if (r.parentId === parentId) {
        descendants.push(r);
        queue.push(r.id);
      }
    }
  }
  const parts: string[] = [];
  const brands = descendants.filter((r) => r.level === 'brand').length;
  const addresses = descendants.filter((r) => r.level === 'address').length;
  const channels = descendants.filter((r) => r.level === 'channel').length;
  if (brands > 0) parts.push(`${brands} marca${brands !== 1 ? 's' : ''}`);
  if (addresses > 0) parts.push(`${addresses} establecimiento${addresses !== 1 ? 's' : ''}`);
  if (channels > 0) parts.push(`${channels} canal${channels !== 1 ? 'es' : ''}`);
  return parts.join(' · ');
}

/** Build the breadcrumb path by walking parentId up the hierarchy */
function getBreadcrumbPath(row: HierarchyRow, hierarchy: HierarchyRow[]): string[] {
  const path: string[] = [];
  let current: HierarchyRow | undefined = row;
  while (current) {
    path.unshift(current.name);
    if (!current.parentId) break;
    current = hierarchy.find((r) => r.id === current!.parentId);
  }
  return path;
}

/** BFS to find all descendant channel-level row IDs matching a specific channelId */
function getDescendantChannelIds(
  row: HierarchyRow,
  hierarchy: HierarchyRow[],
  channelId: ChannelId,
): string[] {
  const result: string[] = [];
  const queue = [row.id];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const r of hierarchy) {
      if (r.parentId === parentId) {
        if (r.level === 'channel' && r.channelId === channelId) {
          result.push(r.id);
        }
        queue.push(r.id);
      }
    }
  }
  return result;
}

/** Merge multiple WeekMetrics arrays by weekLabel, summing all numeric fields */
function mergeWeekMetricsByLabel(arrays: (WeekMetrics[] | undefined)[]): WeekMetrics[] | null {
  const byLabel = new Map<string, WeekMetrics>();

  for (const arr of arrays) {
    if (!arr) continue;
    for (const m of arr) {
      const existing = byLabel.get(m.weekLabel);
      if (!existing) {
        byLabel.set(m.weekLabel, { ...m });
      } else {
        existing.ventas += m.ventas;
        existing.pedidos += m.pedidos;
        existing.nuevos += m.nuevos;
        existing.descuentos += m.descuentos;
        existing.promotedOrders += m.promotedOrders;
        existing.adSpent += m.adSpent;
        existing.adRevenue += m.adRevenue;
        existing.impressions += m.impressions;
        existing.clicks += m.clicks;
        existing.adOrders += m.adOrders;
        existing.ventasGlovo += m.ventasGlovo;
        existing.ventasUbereats += m.ventasUbereats;
        existing.pedidosGlovo += m.pedidosGlovo;
        existing.pedidosUbereats += m.pedidosUbereats;
      }
    }
  }

  if (byLabel.size === 0) return null;

  // Return sorted by weekStart to maintain chronological order
  return Array.from(byLabel.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

interface DetailPanelProps {
  row: HierarchyRow | null;
  hierarchy: HierarchyRow[];
  weeklyMetrics: Map<string, WeekMetrics[]>;
  onClose: () => void;
}

export function DetailPanel({ row, hierarchy, weeklyMetrics, onClose }: DetailPanelProps) {
  const [channelView, setChannelView] = useState<ChannelView>('all');

  // Reset channel view when row changes
  useEffect(() => {
    setChannelView('all');
  }, [row?.id]);

  // Compute descendant channel row IDs for the selected channel filter
  const channelRowIds = useMemo(() => {
    if (!row || channelView === 'all' || row.level === 'channel') return [];
    return getDescendantChannelIds(row, hierarchy, channelView as ChannelId);
  }, [row, hierarchy, channelView]);

  // Compute filtered metrics based on channel view
  const filteredMetrics = useMemo(() => {
    if (!row) return null;
    if (channelView === 'all' || row.level === 'channel') {
      return weeklyMetrics.get(row.id) ?? null;
    }
    // Merge metrics from descendant channel rows
    const arrays = channelRowIds.map((id) => weeklyMetrics.get(id));
    return mergeWeekMetricsByLabel(arrays);
  }, [row, channelView, channelRowIds, weeklyMetrics]);

  // Segment row IDs: single row for 'all', multiple channel rows for filtered
  const segmentRowIds = useMemo(() => {
    if (!row) return [];
    if (channelView === 'all' || row.level === 'channel') return [row.id];
    return channelRowIds;
  }, [row, channelView, channelRowIds]);

  const { data } = useDetailPanelData({ metrics: filteredMetrics });
  const { segments, isLoading: segmentsLoading } = useDetailSegments(segmentRowIds);
  const { data: adsHourlyData, isLoading: adsHourlyLoading } = useAdsHourlyData(row);

  if (!row) return null;

  const Icon = LEVEL_ICONS[row.level];
  const levelLabel = LEVEL_LABELS[row.level];
  const hasData = data && data.length > 0;
  const descendantsSummary = row.level !== 'channel' ? getDescendantsSummary(row, hierarchy) : '';
  const breadcrumb = getBreadcrumbPath(row, hierarchy);
  const parentPath = breadcrumb.slice(0, -1); // All except current
  const showChannelToggle = row.level !== 'channel';
  const isChannelFiltered = channelView !== 'all';

  const headerContent = (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {levelLabel}
        </span>
      </div>
      {parentPath.length > 0 && (
        <p className="text-[10px] text-gray-400 mb-0.5 truncate">
          {parentPath.join(' › ')}
        </p>
      )}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 truncate">{row.name}</h2>
          {row.subtitle && (
            <p className="text-xs text-gray-500 truncate">{row.subtitle}</p>
          )}
        </div>
        {row.ventas > 0 && (
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(row.ventas)}</p>
            {row.ventasChange !== 0 && (
              <p className={`text-[10px] font-medium ${row.ventasChange > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {row.ventasChange > 0 ? '+' : ''}{row.ventasChange.toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </div>
      {descendantsSummary && (
        <p className="text-[10px] text-gray-500 mt-1.5">{descendantsSummary}</p>
      )}
      <p className="text-[10px] text-gray-400 mt-1">
        Ultimas 8 semanas completas (lun-dom)
      </p>

      {/* Channel toggle */}
      {showChannelToggle && (
        <div className="flex items-center gap-1 mt-2">
          {CHANNEL_TOGGLE_OPTIONS.map((opt) => {
            const isActive = channelView === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setChannelView(opt.value)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                  transition-colors cursor-pointer
                  ${isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {opt.logoUrl ? (
                  <img
                    src={opt.logoUrl}
                    alt={opt.label}
                    className={`w-3.5 h-3.5 object-contain ${isActive ? '' : 'opacity-70'}`}
                  />
                ) : (
                  <Layers className="w-3 h-3" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={!!row}
      onClose={onClose}
      width="640px"
      header={headerContent}
    >
      {!hasData ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-400">Sin datos disponibles</p>
        </div>
      ) : (
        <>
          {/* Chart 1: Ventas por Canal */}
          <ChartSection title="Ventas por Canal" icon={TrendingUp}>
            <RevenueByChannelChart data={data} channelView={channelView} />
          </ChartSection>

          {/* Chart 2: Segmentacion Clientes */}
          <ChartSection title="Segmentacion Clientes" icon={Users}>
            {segmentsLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-gray-400">Cargando segmentos...</p>
              </div>
            ) : (
              <CustomerSegmentsChart data={segments ?? []} />
            )}
          </ChartSection>

          {/* Chart 3: Inversion en ADS + ROAS ADS */}
          <ChartSection title="Inversion en ADS + ROAS ADS" icon={Megaphone}>
            <AdsRateRoasChart data={data} />
          </ChartSection>

          {/* Chart 4: Inversion en Promos vs. Retorno */}
          <ChartSection title="Inversion en Promos vs. Retorno" icon={Tag}>
            <PromosRateOrganicChart data={data} />
          </ChartSection>

          {/* Chart 5: Venta con Promocion vs. Venta Organica */}
          <ChartSection title="Venta con Promocion vs. Venta Organica" icon={BarChart3}>
            <PromoVsOrganicChart data={data} />
          </ChartSection>

          {/* Chart 6: Inversion en ADS por horas */}
          <ChartSection
            title="Inversion en ADS por horas"
            icon={Clock}
            note={isChannelFiltered ? '(datos agregados)' : undefined}
          >
            <AdsHourlyChart data={adsHourlyData ?? []} isLoading={adsHourlyLoading} />
          </ChartSection>
        </>
      )}
    </Drawer>
  );
}
