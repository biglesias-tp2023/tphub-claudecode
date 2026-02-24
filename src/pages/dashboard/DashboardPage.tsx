import { useSessionState } from '@/hooks/useSessionState';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { RevenueChart, ChannelDistributionChart, RecentOrdersTable } from '@/components/charts';
import { DashboardFilters, useDashboardData } from '@/features/dashboard';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { formatCurrency, formatNumber, formatPercentage, getPresetLabel } from '@/utils/formatters';

// ============================================
// METRIC CARD COMPONENT
// ============================================

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  format: 'currency' | 'number';
  isLoading?: boolean;
}

function MetricCard({ title, value, change, icon: Icon, format, isLoading }: MetricCardProps) {
  const isPositive = change >= 0;
  const formattedValue = format === 'currency' ? formatCurrency(value) : formatNumber(value);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-24">
            <Spinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-success-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-error-500" />
              )}
              <span
                className={isPositive ? 'text-success-600 text-sm' : 'text-error-600 text-sm'}
              >
                {formatPercentage(Math.abs(change), 1, false)}
              </span>
              <span className="text-gray-500 text-sm">vs período anterior</span>
            </div>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <Icon className="w-6 h-6 text-primary-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================

export function DashboardPage() {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset, channelIds } = useDashboardFiltersStore();
  const { data, isLoading, error } = useDashboardData();

  const [showByChannel, setShowByChannel] = useSessionState('tphub-dashboard-showByChannel', false);

  const companyText = companyIds.length === 0
    ? 'Todos los negocios'
    : companyIds.length === 1
      ? 'Compañía Demo'
      : `${companyIds.length} compañías`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {companyText}
            {' '}&bull;{' '}
            {getPresetLabel(datePreset)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={channelIds.length === 0 ? 'primary' : 'default'}>
            {channelIds.length === 0 ? 'Todos los canales' : `${channelIds.length} canales`}
          </Badge>
        </div>
      </div>

      {/* Dashboard Filters */}
      <DashboardFilters />

      {/* Error state */}
      {error && (
        <Card>
          <CardContent>
            <div className="text-center text-error-600 py-8">
              Error al cargar los datos. Por favor, intenta de nuevo.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos totales"
          value={data?.metrics.totalRevenue ?? 0}
          change={data?.metrics.revenueChange ?? 0}
          icon={DollarSign}
          format="currency"
          isLoading={isLoading}
        />
        <MetricCard
          title="Pedidos"
          value={data?.metrics.totalOrders ?? 0}
          change={data?.metrics.ordersChange ?? 0}
          icon={ShoppingBag}
          format="number"
          isLoading={isLoading}
        />
        <MetricCard
          title="Ticket medio"
          value={data?.metrics.averageTicket ?? 0}
          change={data?.metrics.ticketChange ?? 0}
          icon={BarChart3}
          format="currency"
          isLoading={isLoading}
        />
        <MetricCard
          title="Nuevos clientes"
          value={data?.metrics.newCustomers ?? 0}
          change={data?.metrics.customersChange ?? 0}
          icon={Users}
          format="number"
          isLoading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Ingresos por día</CardTitle>
            <button
              onClick={() => setShowByChannel(!showByChannel)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showByChannel ? 'Ver total' : 'Ver por canal'}
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : data?.dailyRevenue ? (
              <div className="h-64">
                <RevenueChart data={data.dailyRevenue} showByChannel={showByChannel} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Channel Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : data?.channelStats ? (
              <div className="h-64">
                <ChannelDistributionChart data={data.channelStats} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : data?.recentOrders ? (
            <RecentOrdersTable orders={data.recentOrders} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
