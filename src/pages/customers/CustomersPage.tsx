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
import { tooltipContent } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import {
  CustomerScorecard,
  ChannelCustomerCard,
  CohortHeatmap,
  // ChurnRiskTable,    // OCULTO — mantener import comentado
  // PlatformAnalysis,  // OCULTO — mantener import comentado
  RevenueConcentration,
  PostPromoHealth,
  RFMSegmentation,
  CustomerBaseTrend,
  RepeatRateCards,
} from '@/features/customers/components';
import {
  useCustomerMetrics,
  useChannelCustomerMetrics,
  useCustomerCohorts,
  // useChurnRisk,       // OCULTO
  // useMultiPlatform,   // OCULTO
  useRevenueConcentration,
  usePostPromoHealth,
  useRFMAnalysis,
  useRepeatRate,
  useCustomerBaseTrend,
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
  // const churnRiskQuery = useChurnRisk({ limit: 20 });  // OCULTO
  // const multiPlatformQuery = useMultiPlatform();         // OCULTO
  const concentrationQuery = useRevenueConcentration();
  const postPromoQuery = usePostPromoHealth();
  const rfmQuery = useRFMAnalysis();
  const repeatRateQuery = useRepeatRate();
  const baseTrendQuery = useCustomerBaseTrend();

  // Period labels
  const periodLabels = useMemo(() => getPeriodLabelsFromRange(dateRange), [dateRange]);

  const companyText = companyIds.length === 0
    ? 'Todos los negocios'
    : companyIds.length === 1
      ? '1 compañía'
      : `${companyIds.length} compañías`;

  // Core sections block loading together
  const isLoading =
    metricsQuery.isLoading ||
    channelMetricsQuery.isLoading ||
    cohortsQuery.isLoading ||
    concentrationQuery.isLoading ||
    postPromoQuery.isLoading;

  const hasError =
    metricsQuery.error ||
    channelMetricsQuery.error ||
    cohortsQuery.error ||
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
  // const churnRisk = churnRiskQuery.data || [];       // OCULTO
  // const multiPlatform = multiPlatformQuery.data;      // OCULTO
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

      {/* 1. Scorecards */}
      {metrics && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Clientes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <CustomerScorecard
              title="Clientes"
              value={formatNumber(metrics.totalCustomers)}
              change={metrics.totalCustomersChange}
              icon={Users}
              tooltip={tooltipContent(
                'Total de clientes únicos que han realizado al menos un pedido en el período seleccionado.',
                'COUNT(DISTINCT customer_id)',
                'Mide el tamaño de tu base activa. Un crecimiento constante indica buena captación.'
              )}
            />
            <CustomerScorecard
              title="Nuevos"
              value={formatNumber(metrics.newCustomers)}
              change={metrics.newCustomersChange}
              icon={UserPlus}
              tooltip={tooltipContent(
                'Clientes con primer pedido en el período seleccionado.',
                'Clientes sin pedidos previos en los últimos 183 días.',
                'Mide la captación de nuevos usuarios. Clave para el crecimiento de la base.'
              )}
            />
            <CustomerScorecard
              title="Repetidores"
              value={`${metrics.retentionRate.toFixed(1)}%`}
              change={metrics.retentionRateChange}
              icon={RefreshCcw}
              tooltip={tooltipContent(
                'Porcentaje de clientes con más de 1 pedido en el período.',
                'Clientes con >1 pedido / Total clientes × 100',
                'Indicador clave de fidelización. Un % creciente reduce el coste de adquisición efectivo.'
              )}
            />
            <CustomerScorecard
              title="Ped./Cliente"
              value={metrics.avgOrdersPerCustomer.toFixed(1)}
              change={metrics.avgOrdersPerCustomerChange}
              icon={ShoppingCart}
              tooltip={tooltipContent(
                'Frecuencia media de pedidos por cliente.',
                'Total pedidos / Total clientes únicos',
                'A mayor frecuencia, mayor LTV. Es más rentable aumentar frecuencia que captar nuevos clientes.'
              )}
            />
            <CustomerScorecard
              title="Valor por Cliente"
              value={formatCurrency(metrics.avgSpendPerCustomer)}
              change={metrics.avgSpendPerCustomerChange}
              icon={Wallet}
              subtitle="por cliente"
              tooltip={tooltipContent(
                'Ingreso medio generado por cada cliente único.',
                'Ingresos totales / Clientes únicos',
                'Mide el valor unitario del cliente. Combina frecuencia y ticket medio en una sola métrica.'
              )}
            />
            <CustomerScorecard
              title="Ticket"
              value={formatCurrency(metrics.avgTicket)}
              change={metrics.avgTicketChange}
              icon={Receipt}
              tooltip={tooltipContent(
                'Valor medio por pedido.',
                'Ingresos totales / Total pedidos',
                'Palanca de precio directa. Subir ticket vía upsell o cross-sell mejora márgenes sin más pedidos.'
              )}
            />
          </div>
        </section>
      )}

      {/* 2. Segmentación RFM */}
      {rfmQuery.data && rfmQuery.data.segments.length > 0 && (
        <section>
          <RFMSegmentation data={rfmQuery.data} />
        </section>
      )}
      {rfmQuery.isLoading && (
        <section className="flex justify-center py-8">
          <Spinner size="md" />
        </section>
      )}

      {/* 3. Tendencia Base de Clientes */}
      {baseTrendQuery.data && baseTrendQuery.data.length > 0 && (
        <section>
          <CustomerBaseTrend data={baseTrendQuery.data} />
        </section>
      )}
      {baseTrendQuery.isLoading && (
        <section className="flex justify-center py-8">
          <Spinner size="md" />
        </section>
      )}

      {/* 4. Por Canal */}
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

      {/* 5. Tasa de Repetición */}
      {repeatRateQuery.data && (
        <section>
          <RepeatRateCards data={repeatRateQuery.data} />
        </section>
      )}
      {repeatRateQuery.isLoading && (
        <section className="flex justify-center py-8">
          <Spinner size="md" />
        </section>
      )}

      {/* 6. Concentración de Ingresos */}
      {concentration && (concentration.top10Pct > 0 || concentration.top20Pct > 0) && (
        <section>
          <RevenueConcentration data={concentration} />
        </section>
      )}

      {/* 7. Salud Post-Promo */}
      {postPromo && postPromo.total > 0 && (
        <section>
          <PostPromoHealth data={postPromo} />
        </section>
      )}

      {/* 8. Retención por Cohortes */}
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

      {/* 9. Clientes en Riesgo — OCULTO (mantener código) */}
      {/* {churnRisk.length > 0 && (
        <section>
          <ChurnRiskTable data={churnRisk} />
        </section>
      )} */}

      {/* 10. Multi-Plataforma — OCULTO (mantener código) */}
      {/* {multiPlatform && (multiPlatform.glovoOnly > 0 || multiPlatform.ubereatsOnly > 0 || multiPlatform.multiPlatform > 0) && (
        <section>
          <PlatformAnalysis data={multiPlatform} />
        </section>
      )} */}
    </div>
  );
}
