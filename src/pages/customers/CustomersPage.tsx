import { useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import {
  Users,
  UserPlus,
  RefreshCcw,
  ShoppingCart,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { DashboardFilters } from '@/features/dashboard';
import {
  CustomerScorecard,
  ChannelCustomerCard,
  CohortHeatmap,
  ChurnRiskTable,
  PlatformAnalysis,
  RevenueConcentration,
  PostPromoHealth,
} from '@/features/customers/components';
import {
  useCustomerMetrics,
  useChannelCustomerMetrics,
  useCustomerCohorts,
  useChurnRisk,
  useMultiPlatform,
  useRevenueConcentration,
  usePostPromoHealth,
} from '@/features/customers/hooks';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
import { cn } from '@/utils/cn';

type CohortGranularity = 'week' | 'month';

export function CustomersPage() {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange } = useDashboardFiltersStore();
  const [cohortGranularity, setCohortGranularity] = useSessionState<CohortGranularity>('tphub-customers-cohortGranularity', 'month');

  // Fetch all customer data
  const metricsQuery = useCustomerMetrics();
  const channelMetricsQuery = useChannelCustomerMetrics();
  const cohortsQuery = useCustomerCohorts({ granularity: cohortGranularity });
  const churnRiskQuery = useChurnRisk({ limit: 20 });
  const multiPlatformQuery = useMultiPlatform();
  const concentrationQuery = useRevenueConcentration();
  const postPromoQuery = usePostPromoHealth();

  // Period labels
  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const companyText = companyIds.length === 0
    ? 'Todos los negocios'
    : companyIds.length === 1
      ? '1 compañía'
      : `${companyIds.length} compañías`;

  const isLoading =
    metricsQuery.isLoading ||
    channelMetricsQuery.isLoading ||
    cohortsQuery.isLoading ||
    churnRiskQuery.isLoading ||
    multiPlatformQuery.isLoading ||
    concentrationQuery.isLoading ||
    postPromoQuery.isLoading;

  const hasError =
    metricsQuery.error ||
    channelMetricsQuery.error ||
    cohortsQuery.error ||
    churnRiskQuery.error ||
    multiPlatformQuery.error ||
    concentrationQuery.error ||
    postPromoQuery.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-600">Error al cargar los datos de clientes</p>
      </div>
    );
  }

  const metrics = metricsQuery.data;
  const channelMetrics = channelMetricsQuery.data || [];
  const cohorts = cohortsQuery.data || [];
  const churnRisk = churnRiskQuery.data || [];
  const multiPlatform = multiPlatformQuery.data;
  const concentration = concentrationQuery.data;
  const postPromo = postPromoQuery.data;

  // Filter out channels with no data
  const activeChannelMetrics = channelMetrics.filter((ch) => ch.totalCustomers > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Análisis de Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {companyText}
            <span className="mx-2">·</span>
            <span className="font-medium text-gray-700">{periodLabels.current}</span>
            <span className="italic text-gray-400 ml-1.5">vs. {periodLabels.comparison}</span>
          </p>
        </div>
      </div>

      {/* Filters - exclude Just Eat since no data available */}
      <DashboardFilters excludeChannels={['justeat']} />

      {/* Scorecards */}
      {metrics && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Clientes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <CustomerScorecard
              title="Clientes"
              value={formatNumber(metrics.totalCustomers)}
              change={metrics.totalCustomersChange}
              icon={Users}
              tooltip="Total de clientes únicos en el período"
            />
            <CustomerScorecard
              title="Nuevos"
              value={formatNumber(metrics.newCustomers)}
              change={metrics.newCustomersChange}
              icon={UserPlus}
              tooltip="Clientes que hacen su primer pedido en el período"
            />
            <CustomerScorecard
              title="Repetidores"
              value={`${metrics.retentionRate.toFixed(1)}%`}
              change={metrics.retentionRateChange}
              icon={RefreshCcw}
              tooltip="% de clientes con más de 1 pedido / total clientes"
            />
            <CustomerScorecard
              title="Ped./Cliente"
              value={metrics.avgOrdersPerCustomer.toFixed(1)}
              change={metrics.avgOrdersPerCustomerChange}
              icon={ShoppingCart}
              tooltip="Pedidos promedio por cliente en el período"
            />
            <CustomerScorecard
              title="Gasto Medio"
              value={formatCurrency(metrics.avgSpendPerCustomer)}
              change={metrics.avgSpendPerCustomerChange}
              icon={Wallet}
              subtitle="por cliente"
              tooltip="Gasto total acumulado / número de clientes"
            />
            <CustomerScorecard
              title="Ticket"
              value={formatCurrency(metrics.avgTicket)}
              change={metrics.avgTicketChange}
              icon={Receipt}
              tooltip="Valor promedio por pedido"
            />
          </div>
        </section>
      )}

      {/* Channel breakdown */}
      {activeChannelMetrics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Por Canal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeChannelMetrics.map((channel) => (
              <ChannelCustomerCard
                key={channel.channelId}
                channelId={channel.channelId}
                channelName={channel.channelName}
                totalCustomers={channel.totalCustomers}
                newCustomers={channel.newCustomers}
                newCustomersPercentage={channel.newCustomersPercentage}
                avgTicket={channel.avgTicket}
                avgOrdersPerCustomer={channel.avgOrdersPerCustomer}
                returningCustomers={channel.returningCustomers}
                repetitionRate={channel.repetitionRate}
                netRevenuePerCustomer={channel.netRevenuePerCustomer}
                promoOrdersPercentage={channel.promoOrdersPercentage}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-1">
            Los clientes que usan múltiples plataformas aparecen en cada canal
          </p>
        </section>
      )}

      {/* Post-Promo Health */}
      {postPromo && postPromo.total > 0 && (
        <section>
          <PostPromoHealth data={postPromo} />
        </section>
      )}

      {/* Revenue Concentration */}
      {concentration && (concentration.top10Pct > 0 || concentration.top20Pct > 0) && (
        <section>
          <RevenueConcentration data={concentration} />
        </section>
      )}

      {/* Cohort Retention */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Retención por Cohortes</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setCohortGranularity('week')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                cohortGranularity === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setCohortGranularity('month')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                cohortGranularity === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              )}
            >
              Mes
            </button>
          </div>
        </div>
        <CohortHeatmap data={cohorts} granularity={cohortGranularity} />
      </section>

      {/* Churn Risk */}
      {churnRisk.length > 0 && (
        <section>
          <ChurnRiskTable data={churnRisk} />
        </section>
      )}

      {/* Multi-platform Analysis */}
      {multiPlatform && (multiPlatform.glovoOnly > 0 || multiPlatform.ubereatsOnly > 0 || multiPlatform.multiPlatform > 0) && (
        <section>
          <PlatformAnalysis data={multiPlatform} />
        </section>
      )}
    </div>
  );
}
