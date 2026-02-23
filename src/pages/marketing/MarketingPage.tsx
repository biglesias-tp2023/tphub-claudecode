import { useState, useMemo, useCallback } from 'react';
import {
  Eye,
  MousePointerClick,
  ShoppingCart,
  Banknote,
  TrendingUp,
  Percent,
  CircleDollarSign,
  UserPlus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { DashboardFilters } from '@/features/dashboard';
import { useMarketingData, type MarketingScorecard } from '@/features/marketing/hooks';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import type { AreaSeriesConfig } from '@/components/charts/rosen/types';
import { cn } from '@/utils/cn';

// ============================================
// KPI CONFIGURATION
// ============================================

type KpiId = 'impressions' | 'clicks' | 'adOrders' | 'adSpent' | 'roas' | 'ctr' | 'cpc' | 'cac';
type KpiType = 'volume' | 'efficiency';

interface KpiConfig {
  id: KpiId;
  icon: React.ElementType;
  color: string;
  type: KpiType;
  chartDataKey: string;
}

const KPI_CONFIG: KpiConfig[] = [
  // Volume (solid lines)
  { id: 'impressions', icon: Eye, color: '#095789', type: 'volume', chartDataKey: 'impressions' },
  { id: 'clicks', icon: MousePointerClick, color: '#ffa166', type: 'volume', chartDataKey: 'clicks' },
  { id: 'adOrders', icon: ShoppingCart, color: '#10b981', type: 'volume', chartDataKey: 'orders' },
  { id: 'adSpent', icon: Banknote, color: '#6366f1', type: 'volume', chartDataKey: 'adSpent' },
  // Efficiency (dashed lines, right Y-axis)
  { id: 'roas', icon: TrendingUp, color: '#8b5cf6', type: 'efficiency', chartDataKey: 'roas' },
  { id: 'ctr', icon: Percent, color: '#ec4899', type: 'efficiency', chartDataKey: 'ctr' },
  { id: 'cpc', icon: CircleDollarSign, color: '#f59e0b', type: 'efficiency', chartDataKey: 'cpc' },
  { id: 'cac', icon: UserPlus, color: '#14b8a6', type: 'efficiency', chartDataKey: 'cac' },
];

const MAX_SELECTED = 4;

// ============================================
// SCORECARD COMPONENT
// ============================================

interface ScorecardProps {
  scorecard: MarketingScorecard;
  config: KpiConfig;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}

function formatScorecardValue(scorecard: MarketingScorecard): string {
  switch (scorecard.format) {
    case 'currency':
      return formatCurrency(scorecard.value);
    case 'percent':
      return `${scorecard.value.toFixed(2)}%`;
    case 'ratio':
      return `${scorecard.value.toFixed(2)}x`;
    case 'number':
    default:
      return formatNumber(scorecard.value);
  }
}

function Scorecard({ scorecard, config, isSelected, onToggle, disabled }: ScorecardProps) {
  const isPositive = scorecard.change >= 0;
  const Icon = config.icon;

  return (
    <button
      onClick={onToggle}
      disabled={disabled && !isSelected}
      className={cn(
        'relative bg-white rounded-xl border p-4 text-left transition-all overflow-hidden',
        isSelected
          ? 'border-gray-200 shadow-sm'
          : 'border-gray-100 hover:border-gray-200',
        disabled && !isSelected && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Color left border when selected */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: config.color }}
        />
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {scorecard.label}
        </span>
      </div>
      <p className="text-xl font-bold text-gray-900 tabular-nums">
        {formatScorecardValue(scorecard)}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : ''}
          {scorecard.change.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-400">vs. anterior</span>
      </div>
    </button>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export function MarketingPage() {
  const companyIds = useGlobalFiltersStore((s) => s.companyIds);
  const dateRange = useDashboardFiltersStore((s) => s.dateRange);
  const { data, isLoading, error, timeseriesLoading } = useMarketingData();

  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const [selectedKpis, setSelectedKpis] = useState<Set<KpiId>>(
    () => new Set(['impressions'])
  );

  const toggleKpi = useCallback((kpiId: KpiId) => {
    setSelectedKpis((prev) => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        next.delete(kpiId);
      } else if (next.size < MAX_SELECTED) {
        next.add(kpiId);
      }
      return next;
    });
  }, []);

  const companyText =
    companyIds.length === 0
      ? 'Todos los negocios'
      : companyIds.length === 1
        ? '1 compania'
        : `${companyIds.length} companias`;

  // Build chart data with derived efficiency metrics
  const chartData = useMemo(() => {
    if (!data?.timeseries) return [];
    return data.timeseries.map((row) => {
      const d = new Date(row.day + 'T00:00:00');
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return {
        date: label,
        impressions: row.impressions,
        clicks: row.clicks,
        orders: row.orders,
        adSpent: row.adSpent,
        adRevenue: row.adRevenue,
        // Derived efficiency metrics
        roas: row.adSpent > 0 ? row.adRevenue / row.adSpent : 0,
        ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
        cpc: row.clicks > 0 ? row.adSpent / row.clicks : 0,
        cac: row.orders > 0 ? row.adSpent / row.orders : 0,
      };
    });
  }, [data?.timeseries]);

  // Build dynamic chart series from selection
  const chartSeries = useMemo((): AreaSeriesConfig[] => {
    return KPI_CONFIG
      .filter((kpi) => selectedKpis.has(kpi.id))
      .map((kpi) => ({
        dataKey: kpi.chartDataKey,
        name: data?.scorecards[kpi.id]?.label || kpi.id,
        color: kpi.color,
        gradientOpacity: [0.15, 0] as [number, number],
        strokeWidth: 2,
        showDots: false,
        ...(kpi.type === 'efficiency' && {
          strokeDasharray: '6 3',
          yAxisId: 'right' as const,
          gradientOpacity: [0, 0] as [number, number],
        }),
      }));
  }, [selectedKpis, data?.scorecards]);

  // Check if any efficiency metric is selected (for right axis)
  const hasRightAxis = chartSeries.some((s) => s.yAxisId === 'right');

  // Dynamic tooltip
  const renderTooltip = useCallback(
    (dataPoint: Record<string, unknown>, xLabel: string) => {
      const selected = KPI_CONFIG.filter((kpi) => selectedKpis.has(kpi.id));
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-xs font-medium text-gray-500 mb-2">{xLabel}</p>
          <div className="space-y-1.5">
            {selected.map((kpi) => {
              const raw = Number(dataPoint[kpi.chartDataKey]) || 0;
              const scorecard = data?.scorecards[kpi.id];
              let formatted: string;
              if (scorecard?.format === 'currency') formatted = formatCurrency(raw);
              else if (scorecard?.format === 'percent') formatted = `${raw.toFixed(2)}%`;
              else if (scorecard?.format === 'ratio') formatted = `${raw.toFixed(2)}x`;
              else formatted = formatNumber(raw);

              return (
                <div key={kpi.id} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: kpi.color }}
                    />
                    {scorecard?.label || kpi.id}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{formatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [selectedKpis, data?.scorecards]
  );

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
        <p className="text-red-600">Error al cargar los datos de marketing</p>
      </div>
    );
  }

  const { scorecards } = data;
  const volumeKpis = KPI_CONFIG.filter((k) => k.type === 'volume');
  const efficiencyKpis = KPI_CONFIG.filter((k) => k.type === 'efficiency');
  const atLimit = selectedKpis.size >= MAX_SELECTED;

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Marketing</h1>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-accent-400">
            Beta
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {companyText}
          <span className="mx-2">&middot;</span>
          <span className="font-medium text-gray-700">{periodLabels.current}</span>
          <span className="italic text-gray-400 ml-1.5">
            vs. {periodLabels.comparison}
          </span>
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters excludeChannels={['justeat']} />

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 -mb-3">
        Clica sobre una métrica para verla representada en la gráfica
      </p>

      {/* Scorecards Row 1 - Volume */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Rendimiento Publicitario
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {volumeKpis.map((kpi) => (
            <Scorecard
              key={kpi.id}
              scorecard={scorecards[kpi.id]}
              config={kpi}
              isSelected={selectedKpis.has(kpi.id)}
              onToggle={() => toggleKpi(kpi.id)}
              disabled={atLimit}
            />
          ))}
        </div>
      </section>

      {/* Scorecards Row 2 - Efficiency */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Eficiencia
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {efficiencyKpis.map((kpi) => (
            <Scorecard
              key={kpi.id}
              scorecard={scorecards[kpi.id]}
              config={kpi}
              isSelected={selectedKpis.has(kpi.id)}
              onToggle={() => toggleKpi(kpi.id)}
              disabled={atLimit}
            />
          ))}
        </div>
      </section>

      {/* Timeseries Chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Tendencia Diaria
          </h2>
          <span className="text-xs text-gray-400">
            {selectedKpis.size} de {MAX_SELECTED} métricas seleccionadas
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {timeseriesLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : chartData.length > 0 && chartSeries.length > 0 ? (
            <div className="h-80">
              <AreaChart
                data={chartData}
                xKey="date"
                series={chartSeries}
                margin={{ top: 10, right: hasRightAxis ? 50 : 10, left: 50, bottom: 20 }}
                yTickFormatter={(v) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return String(Math.round(v));
                }}
                rightYTickFormatter={(v) => {
                  // Right axis shows %, x, or € depending on what's selected
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  if (v % 1 !== 0) return v.toFixed(1);
                  return String(v);
                }}
                renderTooltip={renderTooltip}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {chartSeries.length === 0
                  ? 'Selecciona una métrica para ver la tendencia'
                  : 'No hay datos de publicidad para el periodo seleccionado'}
              </p>
            </div>
          )}
          {/* Legend */}
          {chartData.length > 0 && chartSeries.length > 0 && (
            <div className="flex items-center justify-center gap-5 mt-4 flex-wrap">
              {KPI_CONFIG.filter((kpi) => selectedKpis.has(kpi.id)).map((kpi) => (
                <div key={kpi.id} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0.5 flex-shrink-0"
                    style={{
                      backgroundColor: kpi.color,
                      ...(kpi.type === 'efficiency' && {
                        backgroundImage: `repeating-linear-gradient(90deg, ${kpi.color} 0px, ${kpi.color} 4px, transparent 4px, transparent 7px)`,
                        backgroundColor: 'transparent',
                      }),
                    }}
                  />
                  <span className="text-xs text-gray-500">
                    {scorecards[kpi.id]?.label || kpi.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
