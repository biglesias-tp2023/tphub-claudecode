/**
 * SalesProjection - Componente de proyección de ventas
 *
 * SOLID Principles:
 * - S: Componente principal orquesta subcomponentes especializados
 * - O: Extensible vía props y composición
 * - D: Depende de abstracciones (tipos) no implementaciones
 *
 * @module features/strategic/components/SalesProjection
 */
import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, Eye, EyeOff, Megaphone, Percent,
  Calendar, Edit3, ChevronDown, Settings2,
} from 'lucide-react';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import type { AreaSeriesConfig, ReferenceLineConfig } from '@/components/charts/rosen/types';
import { cn } from '@/utils/cn';
import { ExportButtons, type ExportFormat } from '@/components/common';
import {
  exportSalesProjectionToPDF,
  exportSalesProjectionToExcel,
  exportSalesProjectionToCSV,
  type SalesProjectionExportData,
} from '@/utils/export';
import type {
  SalesChannel, SalesProjectionConfig,
  GridChannelMonthData, InvestmentConfig,
} from '@/types';

// ============================================
// TYPES
// ============================================

/** Real sales data from CRP Portal (filtered by brand/restaurant) */
interface RealSalesData {
  totalRevenue: number;
  totalPromos: number;
  totalAds?: number;  // Not available in order data, optional
  byChannel?: {
    glovo: { revenue: number; promos: number };
    ubereats: { revenue: number; promos: number };
    justeat: { revenue: number; promos: number };
  };
}

interface SalesProjectionProps {
  config: SalesProjectionConfig;
  targetRevenue: GridChannelMonthData;
  actualRevenue: GridChannelMonthData;
  actualAds: GridChannelMonthData;
  actualPromos: GridChannelMonthData;
  onTargetChange?: (data: GridChannelMonthData) => void;
  onActualRevenueChange?: (data: GridChannelMonthData) => void;
  onActualAdsChange?: (data: GridChannelMonthData) => void;
  onActualPromosChange?: (data: GridChannelMonthData) => void;
  onEditConfig?: () => void;
  restaurantName?: string;
  /** Real sales data from CRP Portal (filtered by selected brand/restaurant) */
  realSalesData?: RealSalesData;
  /** Loading state for real sales data */
  isLoadingRealData?: boolean;
  /** Real revenue by month×channel from CRP Portal for grid rows */
  realRevenueByMonth?: GridChannelMonthData;
}

interface MonthInfo {
  key: string;
  label: string;
  isCurrent: boolean;
}

type TabType = 'revenue' | 'ads' | 'promos';

// ============================================
// CONSTANTS
// ============================================

const CHANNELS: { id: SalesChannel; name: string; color: string; logo: string }[] = [
  { id: 'glovo', name: 'Glovo', color: '#FFC244', logo: '/images/channels/glovo.png' },
  { id: 'ubereats', name: 'UberEats', color: '#06C167', logo: '/images/channels/ubereats.png' },
  { id: 'justeat', name: 'JustEat', color: '#FF8000', logo: '/images/channels/justeat.webp' },
];

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ============================================
// UTILS (Pure functions)
// ============================================

/** Genera array de meses desde config */
function getMonthsFromConfig(config: SalesProjectionConfig): MonthInfo[] {
  const months: MonthInfo[] = [];
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: `${MONTH_NAMES[current.getMonth()]} ${String(current.getFullYear()).slice(-2)}`,
      isCurrent: key === currentKey,
    });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/** Formatea número con separador de miles */
const fmt = (n: number): string => (!n || isNaN(n)) ? '0' : n.toLocaleString('es-ES');

/** Formatea número en K */
const fmtK = (n: number): string => {
  if (!n || isNaN(n)) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
};

/** Calcula inversión basada en porcentaje */
const calcInvestment = (revenue: number, percent: number): number => Math.round((revenue * percent) / 100);

/** Obtiene % de inversión por canal */
const getPercent = (config: InvestmentConfig | number, ch: SalesChannel): number =>
  typeof config === 'number' ? config : config[ch] || 0;

// ============================================
// SUBCOMPONENTS
// ============================================

/** Scorecard individual con objetivo y real */
function Scorecard({
  label, value, actual, color, showActual, isLoading = false, isRealData = false
}: {
  label: string;
  value: number;
  actual: number;
  color: string;
  showActual: boolean;
  isLoading?: boolean;
  isRealData?: boolean;
}) {
  const diff = actual > 0 && value > 0
    ? ((actual / value - 1) * 100).toFixed(0)
    : null;

  const isPositive = diff ? parseFloat(diff) >= 0 : false;
  const isInvestment = label !== 'Ventas';
  const diffText = isInvestment
    ? (isPositive ? `+${diff}% sobre obj` : `${Math.abs(parseFloat(diff || '0'))}% bajo obj`)
    : (isPositive ? `+${diff}% vs obj` : `${diff}% vs obj`);
  const diffColor = isInvestment
    ? (isPositive ? 'text-red-500' : 'text-emerald-600')
    : (isPositive ? 'text-emerald-600' : 'text-amber-600');

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        {isRealData && (
          <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            Real
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className={cn('text-xl font-bold tabular-nums', color)}>{fmtK(value)}€</p>
        {isLoading ? (
          <span className="text-sm text-gray-400 animate-pulse">cargando...</span>
        ) : showActual && actual > 0 && (
          <p className={cn('text-sm font-medium tabular-nums', color.replace('600', '500'))}>/ {fmtK(actual)}€</p>
        )}
      </div>
      {!isLoading && showActual && actual > 0 && diff && (
        <p className={cn('text-[10px] mt-0.5', diffColor)}>{diffText}</p>
      )}
    </div>
  );
}


function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-gray-500">{label}</span>
      <span className={cn('font-medium tabular-nums', color)}>{fmt(value)}€</span>
    </div>
  );
}

/** Fila de tabla editable */
function TableRow({
  label, logoUrl, months, values, channel, onChange, total, variant, readOnly,
}: {
  label: string;
  logoUrl: string;
  months: MonthInfo[];
  values: GridChannelMonthData;
  channel: SalesChannel;
  onChange?: (month: string, val: string) => void;
  total: number;
  variant: 'target' | 'actual';
  readOnly?: boolean;
}) {
  const isActual = variant === 'actual';

  return (
    <tr className={cn(isActual && 'bg-emerald-50/30')}>
      <td className="py-1.5 pr-2">
        <div className="flex items-center gap-1.5">
          <img src={logoUrl} alt={label} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
          {isActual && <span className="text-[9px] text-emerald-600 font-medium">(real)</span>}
        </div>
      </td>
      {months.map((m) => (
        <td key={m.key} className={cn('py-0.5 px-0.5', m.isCurrent && 'bg-primary-50')}>
          {readOnly ? (
            <div className={cn('w-full text-center text-xs py-1.5 px-1 tabular-nums', isActual ? 'text-emerald-700 font-medium' : 'text-gray-700')}>
              {fmt(values[m.key]?.[channel] || 0)}
            </div>
          ) : (
            <input
              type="number"
              value={values[m.key]?.[channel] || ''}
              onChange={(e) => onChange?.(m.key, e.target.value)}
              placeholder="0"
              className={cn(
                'w-full text-center text-xs py-1.5 px-0.5 border rounded tabular-nums focus:outline-none focus:ring-1',
                isActual ? 'border-emerald-200 focus:ring-emerald-300 bg-white' : 'border-gray-200 focus:ring-primary-300 bg-white',
                m.isCurrent && 'ring-1 ring-primary-300'
              )}
            />
          )}
        </td>
      ))}
      <td className="py-1.5 pl-2 text-right">
        <span className={cn('text-xs font-semibold tabular-nums', isActual ? 'text-emerald-600' : 'text-gray-800')}>
          {fmt(total)}€
        </span>
      </td>
    </tr>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SalesProjection({
  config, targetRevenue, actualRevenue, actualAds, actualPromos,
  onTargetChange, onActualRevenueChange, onActualAdsChange, onActualPromosChange, onEditConfig,
  restaurantName = 'Restaurante',
  realSalesData,
  isLoadingRealData = false,
  realRevenueByMonth,
}: SalesProjectionProps) {
  const [showActual, setShowActual] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [showTable, setShowTable] = useState(false);

  const months = useMemo(() => getMonthsFromConfig(config), [config]);
  const { activeChannels } = config;

  // Use CRP Portal data for actual revenue when available, fallback to localStorage
  const hasRealRevenue = !!realRevenueByMonth && Object.keys(realRevenueByMonth).length > 0;
  const effectiveActualRevenue = hasRealRevenue ? realRevenueByMonth! : actualRevenue;

  // Memoized calculations
  const calculations = useMemo(() => {
    const getMonthTotal = (data: GridChannelMonthData, key: string) =>
      activeChannels.reduce((sum, ch) => sum + (data[key]?.[ch] || 0), 0);

    const getChannelTotal = (data: GridChannelMonthData, ch: SalesChannel) =>
      months.reduce((sum, m) => sum + (data[m.key]?.[ch] || 0), 0);

    const grandTarget = months.reduce((sum, m) => sum + getMonthTotal(targetRevenue, m.key), 0);
    const grandActual = months.reduce((sum, m) => sum + getMonthTotal(effectiveActualRevenue, m.key), 0);

    const calcTargetAds = (key: string, ch: SalesChannel) =>
      calcInvestment(targetRevenue[key]?.[ch] || 0, getPercent(config.maxAdsPercent, ch));
    const calcTargetPromos = (key: string, ch: SalesChannel) =>
      calcInvestment(targetRevenue[key]?.[ch] || 0, getPercent(config.maxPromosPercent, ch));

    const totalTargetAds = months.reduce((sum, m) =>
      sum + activeChannels.reduce((chSum, ch) => chSum + calcTargetAds(m.key, ch), 0), 0);
    const totalTargetPromos = months.reduce((sum, m) =>
      sum + activeChannels.reduce((chSum, ch) => chSum + calcTargetPromos(m.key, ch), 0), 0);
    const totalActualAds = months.reduce((sum, m) => sum + getMonthTotal(actualAds, m.key), 0);
    const totalActualPromos = months.reduce((sum, m) => sum + getMonthTotal(actualPromos, m.key), 0);

    return {
      getMonthTotal, getChannelTotal, grandTarget, grandActual,
      calcTargetAds, calcTargetPromos, totalTargetAds, totalTargetPromos, totalActualAds, totalActualPromos,
    };
  }, [months, activeChannels, targetRevenue, effectiveActualRevenue, actualAds, actualPromos, config]);

  // Chart data
  const chartData = useMemo(() => months.map((m) => ({
    month: m.label,
    targetRevenue: calculations.getMonthTotal(targetRevenue, m.key),
    actualRevenue: calculations.getMonthTotal(effectiveActualRevenue, m.key),
    targetAds: activeChannels.reduce((sum, ch) => sum + calculations.calcTargetAds(m.key, ch), 0),
    actualAds: calculations.getMonthTotal(actualAds, m.key),
    targetPromos: activeChannels.reduce((sum, ch) => sum + calculations.calcTargetPromos(m.key, ch), 0),
    actualPromos: calculations.getMonthTotal(actualPromos, m.key),
    isCurrent: m.isCurrent,
  })), [months, targetRevenue, effectiveActualRevenue, actualAds, actualPromos, activeChannels, calculations]);

  const currentMonthIndex = months.findIndex((m) => m.isCurrent);
  const daysRemaining = useMemo(() => {
    const diff = new Date(config.endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [config.endDate]);

  // Update handlers
  const updateData = useCallback((
    current: GridChannelMonthData,
    setter: ((data: GridChannelMonthData) => void) | undefined,
    month: string, ch: SalesChannel, val: string
  ) => {
    if (!setter) return;
    const newData = { ...current };
    if (!newData[month]) newData[month] = { glovo: 0, ubereats: 0, justeat: 0 };
    newData[month] = { ...newData[month], [ch]: parseFloat(val) || 0 };
    setter(newData);
  }, []);

  const updateTarget = (m: string, ch: SalesChannel, v: string) => updateData(targetRevenue, onTargetChange, m, ch, v);
  const updateActualRevenue = (m: string, ch: SalesChannel, v: string) => updateData(actualRevenue, onActualRevenueChange, m, ch, v);
  const updateActualAds = (m: string, ch: SalesChannel, v: string) => updateData(actualAds, onActualAdsChange, m, ch, v);
  const updateActualPromos = (m: string, ch: SalesChannel, v: string) => updateData(actualPromos, onActualPromosChange, m, ch, v);

  // Export handler
  const handleExport = useCallback((format: ExportFormat) => {
    const targetAdsData: GridChannelMonthData = {};
    const targetPromosData: GridChannelMonthData = {};

    months.forEach((m) => {
      targetAdsData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
      targetPromosData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
      activeChannels.forEach((ch) => {
        targetAdsData[m.key][ch] = calculations.calcTargetAds(m.key, ch);
        targetPromosData[m.key][ch] = calculations.calcTargetPromos(m.key, ch);
      });
    });

    const exportData: SalesProjectionExportData = {
      title: restaurantName,
      dateRange: `${config.startDate} - ${config.endDate}`,
      channels: activeChannels,
      months: months.map((m) => ({ key: m.key, label: m.label })),
      targetRevenue: targetRevenue as unknown as Record<string, Record<string, number>>,
      actualRevenue: actualRevenue as unknown as Record<string, Record<string, number>>,
      targetAds: targetAdsData as unknown as Record<string, Record<string, number>>,
      actualAds: actualAds as unknown as Record<string, Record<string, number>>,
      targetPromos: targetPromosData as unknown as Record<string, Record<string, number>>,
      actualPromos: actualPromos as unknown as Record<string, Record<string, number>>,
    };

    switch (format) {
      case 'pdf':
        exportSalesProjectionToPDF(exportData);
        break;
      case 'excel':
        exportSalesProjectionToExcel(exportData);
        break;
      case 'csv':
        exportSalesProjectionToCSV(exportData);
        break;
    }
  }, [months, activeChannels, calculations, config, restaurantName, targetRevenue, actualRevenue, actualAds, actualPromos]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Proyección de ventas</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{config.startDate} → {config.endDate}</span>
              {daysRemaining <= 60 && daysRemaining > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">{daysRemaining}d restantes</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
            {activeChannels.map((ch) => {
              const channel = CHANNELS.find((c) => c.id === ch);
              return channel ? (
                <img key={ch} src={channel.logo} alt={channel.name} className="w-4 h-4 rounded-full object-cover" />
              ) : null;
            })}
          </div>
          <ExportButtons onExport={handleExport} size="sm" />
          <button
            onClick={() => setShowActual(!showActual)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              showActual ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            )}
          >
            {showActual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showActual ? 'Real visible' : 'Ver real'}
          </button>
          {onEditConfig && (
            <button onClick={onEditConfig} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scorecards - Use real data when available, fallback to manual entry */}
      <div className="grid grid-cols-3 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100">
        <Scorecard
          label="Ventas"
          value={calculations.grandTarget}
          actual={realSalesData?.totalRevenue ?? calculations.grandActual}
          color="text-primary-600"
          showActual={showActual}
          isLoading={isLoadingRealData}
          isRealData={!!realSalesData?.totalRevenue}
        />
        <Scorecard
          label="ADS"
          value={calculations.totalTargetAds}
          actual={realSalesData?.totalAds ?? calculations.totalActualAds}
          color="text-amber-600"
          showActual={showActual}
          isLoading={isLoadingRealData}
          isRealData={!!realSalesData?.totalAds}
        />
        <Scorecard
          label="Promos"
          value={calculations.totalTargetPromos}
          actual={realSalesData?.totalPromos ?? calculations.totalActualPromos}
          color="text-purple-600"
          showActual={showActual}
          isLoading={isLoadingRealData}
          isRealData={!!realSalesData?.totalPromos}
        />
      </div>

      {/* Chart */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="h-48">
          <AreaChart
            data={chartData}
            xKey="month"
            series={[
              { dataKey: 'targetRevenue', name: 'Objetivo', color: '#095789', gradientOpacity: [0.15, 0], strokeWidth: 2 },
              ...(showActual ? [{ dataKey: 'actualRevenue', name: 'Real', color: '#10B981', gradientOpacity: [0.15, 0] as [number, number], strokeWidth: 2 }] : []),
            ] satisfies AreaSeriesConfig[]}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            gridVertical={false}
            tickFontSize={10}
            tickColor="#9CA3AF"
            yTickFormatter={fmtK}
            referenceLines={currentMonthIndex >= 0 ? [{
              x: months[currentMonthIndex].label,
              stroke: '#6366F1',
              strokeDasharray: '4 4',
              label: 'Hoy',
              labelColor: '#6366F1',
            } satisfies ReferenceLineConfig] : []}
            renderTooltip={(dataPoint, xLabel) => {
              const d = dataPoint as Record<string, number>;
              return (
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg rounded-xl border border-gray-100 text-xs">
                  <p className="font-semibold text-gray-900 mb-2">{xLabel}</p>
                  <div className="space-y-1.5">
                    <Row label="Ventas objetivo" value={d.targetRevenue} color="text-primary-600" />
                    {d.actualRevenue > 0 && <Row label="Ventas real" value={d.actualRevenue} color="text-emerald-600" />}
                    <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                      <Row label="ADS objetivo" value={d.targetAds} color="text-amber-600" />
                      {d.actualAds > 0 && <Row label="ADS real" value={d.actualAds} color="text-amber-500" />}
                    </div>
                    <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                      <Row label="Promos objetivo" value={d.targetPromos} color="text-purple-600" />
                      {d.actualPromos > 0 && <Row label="Promos real" value={d.actualPromos} color="text-purple-500" />}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-[10px]">
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary-500 rounded" /><span className="text-gray-500">Objetivo ventas</span></div>
          {showActual && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" /><span className="text-gray-500">Real acumulado</span></div>}
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-dashed border-indigo-400 rounded" /><span className="text-gray-500">Fecha actual</span></div>
        </div>
      </div>

      {/* Collapsible Table */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Ajustar objetivos</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showTable && 'rotate-180')} />
        </button>

        {showTable && (
          <>
            <div className="flex items-center gap-1 px-5 py-2 border-t border-gray-100 bg-gray-50">
              {[
                { id: 'revenue', label: 'Facturación', icon: TrendingUp },
                { id: 'ads', label: 'ADS', icon: Megaphone },
                { id: 'promos', label: 'Promos', icon: Percent },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-gray-400 font-medium py-2 w-24">Canal</th>
                    {months.map((m) => (
                      <th key={m.key} className={cn('text-center text-[10px] font-medium py-2 min-w-[60px]', m.isCurrent ? 'text-primary-600 bg-primary-50 rounded-t-lg' : 'text-gray-400')}>
                        {m.label}
                        {m.isCurrent && <span className="block text-[8px] text-primary-500">HOY</span>}
                      </th>
                    ))}
                    <th className="text-right text-[10px] text-gray-400 font-medium py-2 w-20">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeTab === 'revenue' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <TableRow
                            key={`target-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={targetRevenue}
                            channel={ch}
                            onChange={(m, v) => updateTarget(m, ch, v)}
                            total={calculations.getChannelTotal(targetRevenue, ch)}
                            variant="target"
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <TableRow
                            key={`actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={effectiveActualRevenue}
                            channel={ch}
                            onChange={hasRealRevenue ? undefined : (m, v) => updateActualRevenue(m, ch, v)}
                            total={calculations.getChannelTotal(effectiveActualRevenue, ch)}
                            variant="actual"
                            readOnly={hasRealRevenue}
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => (
                          <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                            <span className="text-xs font-bold text-primary-600 tabular-nums">{fmt(calculations.getMonthTotal(targetRevenue, m.key))}€</span>
                            {showActual && calculations.grandActual > 0 && (
                              <span className="block text-[10px] font-medium text-emerald-600 tabular-nums">{fmt(calculations.getMonthTotal(effectiveActualRevenue, m.key))}€</span>
                            )}
                          </td>
                        ))}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-primary-700 tabular-nums">{fmt(calculations.grandTarget)}€</span>
                          {showActual && calculations.grandActual > 0 && (
                            <span className="block text-xs font-semibold text-emerald-600 tabular-nums">{fmt(calculations.grandActual)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'ads' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        const targetData: GridChannelMonthData = {};
                        months.forEach((m) => {
                          if (!targetData[m.key]) targetData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
                          targetData[m.key][ch] = calculations.calcTargetAds(m.key, ch);
                        });
                        const total = months.reduce((sum, m) => sum + calculations.calcTargetAds(m.key, ch), 0);
                        return (
                          <TableRow
                            key={`ads-${ch}`}
                            label={`${channel?.name} (${getPercent(config.maxAdsPercent, ch)}%)`}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={targetData}
                            channel={ch}
                            total={total}
                            variant="target"
                            readOnly
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <TableRow
                            key={`ads-actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={actualAds}
                            channel={ch}
                            onChange={(m, v) => updateActualAds(m, ch, v)}
                            total={calculations.getChannelTotal(actualAds, ch)}
                            variant="actual"
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => {
                          const monthTargetAds = activeChannels.reduce((sum, ch) => sum + calculations.calcTargetAds(m.key, ch), 0);
                          return (
                            <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                              <span className="text-xs font-bold text-amber-600 tabular-nums">{fmt(monthTargetAds)}€</span>
                              {showActual && calculations.totalActualAds > 0 && (
                                <span className="block text-[10px] font-medium text-amber-500 tabular-nums">{fmt(calculations.getMonthTotal(actualAds, m.key))}€</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-amber-700 tabular-nums">{fmt(calculations.totalTargetAds)}€</span>
                          {showActual && calculations.totalActualAds > 0 && (
                            <span className="block text-xs font-semibold text-amber-500 tabular-nums">{fmt(calculations.totalActualAds)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'promos' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        const targetData: GridChannelMonthData = {};
                        months.forEach((m) => {
                          if (!targetData[m.key]) targetData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
                          targetData[m.key][ch] = calculations.calcTargetPromos(m.key, ch);
                        });
                        const total = months.reduce((sum, m) => sum + calculations.calcTargetPromos(m.key, ch), 0);
                        return (
                          <TableRow
                            key={`promos-${ch}`}
                            label={`${channel?.name} (${getPercent(config.maxPromosPercent, ch)}%)`}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={targetData}
                            channel={ch}
                            total={total}
                            variant="target"
                            readOnly
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <TableRow
                            key={`promos-actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/channels/glovo.png'}
                            months={months}
                            values={actualPromos}
                            channel={ch}
                            onChange={(m, v) => updateActualPromos(m, ch, v)}
                            total={calculations.getChannelTotal(actualPromos, ch)}
                            variant="actual"
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => {
                          const monthTargetPromos = activeChannels.reduce((sum, ch) => sum + calculations.calcTargetPromos(m.key, ch), 0);
                          return (
                            <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                              <span className="text-xs font-bold text-purple-600 tabular-nums">{fmt(monthTargetPromos)}€</span>
                              {showActual && calculations.totalActualPromos > 0 && (
                                <span className="block text-[10px] font-medium text-purple-500 tabular-nums">{fmt(calculations.getMonthTotal(actualPromos, m.key))}€</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-purple-700 tabular-nums">{fmt(calculations.totalTargetPromos)}€</span>
                          {showActual && calculations.totalActualPromos > 0 && (
                            <span className="block text-xs font-semibold text-purple-500 tabular-nums">{fmt(calculations.totalActualPromos)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
