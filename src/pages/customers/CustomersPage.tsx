import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  RefreshCcw,
  Clock,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { DashboardFilters } from '@/features/dashboard';
import {
  CustomerScorecard,
  ChannelCustomerCard,
  CohortHeatmap,
  SpendHistogram,
  ChurnRiskTable,
  PlatformAnalysis,
} from '@/features/customers/components';
import {
  useCustomerMetrics,
  useChannelCustomerMetrics,
  useCustomerCohorts,
  useChurnRisk,
  useSpendDistribution,
  useMultiPlatform,
} from '@/features/customers/hooks';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, getPeriodLabelsFromRange } from '@/utils/formatters';
import { cn } from '@/utils/cn';

type CohortGranularity = 'week' | 'month';

export function CustomersPage() {
  const { companyIds } = useGlobalFiltersStore();
  const { dateRange } = useDashboardFiltersStore();
  const [cohortGranularity, setCohortGranularity] = useState<CohortGranularity>('month');

  // Fetch all customer data
  const metricsQuery = useCustomerMetrics();
  const channelMetricsQuery = useChannelCustomerMetrics();
  const cohortsQuery = useCustomerCohorts({ granularity: cohortGranularity });
  const churnRiskQuery = useChurnRisk({ limit: 20 });
  const spendDistributionQuery = useSpendDistribution();
  const multiPlatformQuery = useMultiPlatform();

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
    spendDistributionQuery.isLoading ||
    multiPlatformQuery.isLoading;

  const hasError =
    metricsQuery.error ||
    channelMetricsQuery.error ||
    cohortsQuery.error ||
    churnRiskQuery.error ||
    spendDistributionQuery.error ||
    multiPlatformQuery.error;

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
  const spendDistribution = spendDistributionQuery.data;
  const multiPlatform = multiPlatformQuery.data;

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
            />
            <CustomerScorecard
              title="Nuevos"
              value={formatNumber(metrics.newCustomers)}
              change={metrics.newCustomersChange}
              icon={UserPlus}
            />
            <CustomerScorecard
              title="Repetidores"
              value={`${metrics.retentionRate.toFixed(1)}%`}
              change={metrics.retentionRateChange}
              icon={RefreshCcw}
            />
            <CustomerScorecard
              title="Frecuencia"
              value={`${metrics.avgFrequencyDays.toFixed(0)} días`}
              change={metrics.avgFrequencyDaysChange}
              icon={Clock}
              subtitle="entre pedidos"
            />
            <CustomerScorecard
              title="CLV Est."
              value={formatCurrency(metrics.estimatedCLV)}
              change={metrics.estimatedCLVChange}
              icon={DollarSign}
              subtitle="anualizado"
            />
            <CustomerScorecard
              title="Ticket"
              value={formatCurrency(metrics.avgTicket)}
              change={metrics.avgTicketChange}
              icon={Receipt}
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
                avgCLV={channel.avgCLV}
                avgTicket={channel.avgTicket}
                avgOrdersPerCustomer={channel.avgOrdersPerCustomer}
              />
            ))}
          </div>
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

      {/* Spend Distribution */}
      {spendDistribution && spendDistribution.segments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Distribución de Gasto</h2>
          <SpendHistogram data={spendDistribution} />
        </section>
      )}

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
