import { useMemo, useCallback } from 'react';
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
// SCORECARD COMPONENT
// ============================================

interface ScorecardProps {
  scorecard: MarketingScorecard;
  icon: React.ElementType;
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

function Scorecard({ scorecard, icon: Icon }: ScorecardProps) {
  const isPositive = scorecard.change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
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
        <span className="text-xs text-gray-400">vs. periodo anterior</span>
      </div>
    </div>
  );
}

// ============================================
// CHART CONFIG
// ============================================

const chartSeries: AreaSeriesConfig[] = [
  {
    dataKey: 'impressions',
    name: 'Impresiones',
    color: '#095789',
    gradientOpacity: [0.2, 0],
    strokeWidth: 2,
    showDots: false,
  },
  {
    dataKey: 'clicks',
    name: 'Clicks',
    color: '#ffa166',
    gradientOpacity: [0.2, 0],
    strokeWidth: 2,
    showDots: false,
  },
  {
    dataKey: 'orders',
    name: 'Pedidos Ads',
    color: '#10b981',
    gradientOpacity: [0.2, 0],
    strokeWidth: 2,
    showDots: false,
  },
];

// ============================================
// MAIN PAGE
// ============================================

export function MarketingPage() {
  const companyIds = useGlobalFiltersStore((s) => s.companyIds);
  const dateRange = useDashboardFiltersStore((s) => s.dateRange);
  const { data, isLoading, error } = useMarketingData();

  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const companyText =
    companyIds.length === 0
      ? 'Todos los negocios'
      : companyIds.length === 1
        ? '1 compania'
        : `${companyIds.length} companias`;

  // Format chart data — shorten date labels
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
      };
    });
  }, [data?.timeseries]);

  const renderTooltip = useCallback(
    (dataPoint: Record<string, unknown>, xLabel: string) => (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
        <p className="text-xs font-medium text-gray-500 mb-2">{xLabel}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-primary-600" />
              Impresiones
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {formatNumber(Number(dataPoint.impressions) || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-accent-400" />
              Clicks
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {formatNumber(Number(dataPoint.clicks) || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Pedidos Ads
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {formatNumber(Number(dataPoint.orders) || 0)}
            </span>
          </div>
        </div>
      </div>
    ),
    []
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

      {/* Scorecards Row 1 - Volume metrics */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Rendimiento Publicitario
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Scorecard scorecard={scorecards.impressions} icon={Eye} />
          <Scorecard scorecard={scorecards.clicks} icon={MousePointerClick} />
          <Scorecard scorecard={scorecards.adOrders} icon={ShoppingCart} />
          <Scorecard scorecard={scorecards.adSpent} icon={Banknote} />
        </div>
      </section>

      {/* Scorecards Row 2 - Efficiency metrics */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Eficiencia
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Scorecard scorecard={scorecards.roas} icon={TrendingUp} />
          <Scorecard scorecard={scorecards.ctr} icon={Percent} />
          <Scorecard scorecard={scorecards.cpc} icon={CircleDollarSign} />
          <Scorecard scorecard={scorecards.cac} icon={UserPlus} />
        </div>
      </section>

      {/* Timeseries Chart */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Tendencia Diaria
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {chartData.length > 0 ? (
            <div className="h-80">
              <AreaChart
                data={chartData}
                xKey="date"
                series={chartSeries}
                margin={{ top: 10, right: 10, left: 50, bottom: 20 }}
                yTickFormatter={(v) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return String(v);
                }}
                renderTooltip={renderTooltip}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                No hay datos de publicidad para el periodo seleccionado
              </p>
            </div>
          )}
          {/* Legend */}
          {chartData.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-600" />
                <span className="text-xs text-gray-500">Impresiones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-accent-400" />
                <span className="text-xs text-gray-500">Clicks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500">Pedidos Ads</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
