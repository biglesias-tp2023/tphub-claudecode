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
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer/Drawer';
import type { HierarchyRow } from '../hooks/useControllingData';
import type { WeekMetrics, WeekSegmentData } from '../hooks/useWeeklyRevenue';
import { useDetailPanelData } from '../hooks/useDetailPanelData';
import {
  RevenueByChannelChart,
  AdsRateRoasChart,
  PromosRateOrganicChart,
  PromoVsOrganicChart,
  CustomerSegmentsChart,
} from './detail-panel';

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
}

function ChartSection({ title, icon: Icon, children, placeholder }: ChartSectionProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
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

interface DetailPanelProps {
  row: HierarchyRow | null;
  weeklyMetrics: Map<string, WeekMetrics[]>;
  weeklySegments: Map<string, WeekSegmentData[]>;
  onClose: () => void;
}

export function DetailPanel({ row, weeklyMetrics, weeklySegments, onClose }: DetailPanelProps) {
  const { data, segments } = useDetailPanelData({
    rowId: row?.id ?? null,
    weeklyMetrics,
    weeklySegments,
  });

  if (!row) return null;

  const Icon = LEVEL_ICONS[row.level];
  const levelLabel = LEVEL_LABELS[row.level];
  const hasData = data && data.length > 0;

  const headerContent = (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {levelLabel}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{row.name}</h2>
          {row.subtitle && (
            <p className="text-xs text-gray-500 truncate">{row.subtitle}</p>
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        Ultimas 8 semanas completas (lun-dom)
      </p>
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
            <RevenueByChannelChart data={data} />
          </ChartSection>

          {/* Chart 2: Segmentacion Clientes */}
          <ChartSection title="Segmentacion Clientes" icon={Users}>
            <CustomerSegmentsChart data={segments ?? []} />
          </ChartSection>

          {/* Chart 3: Tasa ADS + ROAS */}
          <ChartSection title="Tasa ADS + ROAS" icon={Megaphone}>
            <AdsRateRoasChart data={data} />
          </ChartSection>

          {/* Chart 4: Tasa Promos + Organico */}
          <ChartSection title="Tasa Promos + Organico" icon={Tag}>
            <PromosRateOrganicChart data={data} />
          </ChartSection>

          {/* Chart 5: Venta Promo vs Organica */}
          <ChartSection title="Venta Promo vs Organica" icon={BarChart3}>
            <PromoVsOrganicChart data={data} />
          </ChartSection>

          {/* Chart 6: Heatmap Gasto ADS - Placeholder */}
          <ChartSection title="Heatmap Gasto ADS" icon={Clock} placeholder />
        </>
      )}
    </Drawer>
  );
}
