import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Props as LegendProps } from 'recharts/types/component/DefaultLegendContent';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { ChannelStats } from '@/features/dashboard/hooks/useDashboardData';

interface ChannelDistributionChartProps {
  data: ChannelStats[];
}

// Transform data for Recharts compatibility
interface PieDataItem {
  channel: string;
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieDataItem }>;
}

// Tooltip component defined outside render to avoid re-creation
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
      <p className="font-medium text-gray-900 mb-1">{item.name}</p>
      <p className="text-sm text-gray-600">
        Ingresos: {formatCurrency(item.revenue)}
      </p>
      <p className="text-sm text-gray-600">
        Pedidos: {formatNumber(item.orders)}
      </p>
      <p className="text-sm text-gray-600">
        {item.percentage}% del total
      </p>
    </div>
  );
}

// Legend render function defined outside render
function renderLegend(props: LegendProps) {
  const { payload } = props;
  if (!payload) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      {payload.map((entry) => {
        const item = entry.payload as PieDataItem;
        return (
          <div key={item.channel} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(item.revenue)}
              </span>
              <span className="text-xs text-gray-500 w-10 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Donut chart showing revenue distribution by delivery channel.
 */
export function ChannelDistributionChart({ data }: ChannelDistributionChartProps) {
  // Transform data for Recharts
  const pieData: PieDataItem[] = data.map((item) => ({
    ...item,
    channel: item.channel,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="40%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="revenue"
          nameKey="name"
        >
          {pieData.map((entry) => (
            <Cell key={entry.channel} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}
