import { DonutChart } from '@/components/charts/rosen/DonutChart';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { ChannelStats } from '@/features/dashboard/hooks/useDashboardData';
import type { DonutChartDataItem } from '@/components/charts/rosen/types';

interface ChannelDistributionChartProps {
  data: ChannelStats[];
}

/**
 * Donut chart showing revenue distribution by delivery channel.
 */
export function ChannelDistributionChart({ data }: ChannelDistributionChartProps) {
  const pieData: DonutChartDataItem[] = data.map((item) => ({
    label: item.name,
    value: item.revenue,
    color: item.color,
    channel: item.channel,
    revenue: item.revenue,
    orders: item.orders,
    percentage: item.percentage,
  }));

  return (
    <DonutChart
      data={pieData}
      valueKey="revenue"
      innerRadiusRatio={0.6}
      outerRadiusRatio={0.9}
      paddingAngle={0.02}
      centerY={0.4}
      renderTooltip={(item) => (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-1">{item.label}</p>
          <p className="text-sm text-gray-600">
            Ingresos: {formatCurrency(item.revenue as number)}
          </p>
          <p className="text-sm text-gray-600">
            Pedidos: {formatNumber(item.orders as number)}
          </p>
          <p className="text-sm text-gray-600">
            {item.percentage}% del total
          </p>
        </div>
      )}
      renderLegend={(items) => (
        <div className="flex flex-col gap-2 mt-4 px-4">
          {items.map((item) => (
            <div key={item.channel as string} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.revenue as number)}
                </span>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
}
