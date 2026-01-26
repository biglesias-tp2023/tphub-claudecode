import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import type { DailyRevenue } from '@/features/dashboard/hooks/useDashboardData';

interface RevenueChartProps {
  data: DailyRevenue[];
  showByChannel?: boolean;
}

const CHANNEL_COLORS = {
  glovo: '#FFC244',
  ubereats: '#06C167',
  justeat: '#FF8000',
};

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

// Tooltip component defined outside render to avoid re-creation
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
      <p className="font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/**
 * Area chart showing revenue over time.
 * Can display total revenue or breakdown by channel.
 */
export function RevenueChart({ data, showByChannel = false }: RevenueChartProps) {
  // Format data for display
  const chartData = data.map((d) => ({
    ...d,
    dateFormatted: format(parseISO(d.date), 'd MMM', { locale: es }),
  }));

  if (showByChannel) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGlovo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHANNEL_COLORS.glovo} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHANNEL_COLORS.glovo} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUbereats" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHANNEL_COLORS.ubereats} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHANNEL_COLORS.ubereats} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorJusteat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHANNEL_COLORS.justeat} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHANNEL_COLORS.justeat} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="dateFormatted"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="glovo"
            name="Glovo"
            stackId="1"
            stroke={CHANNEL_COLORS.glovo}
            fill="url(#colorGlovo)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="ubereats"
            name="Uber Eats"
            stackId="1"
            stroke={CHANNEL_COLORS.ubereats}
            fill="url(#colorUbereats)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="justeat"
            name="Just Eat"
            stackId="1"
            stroke={CHANNEL_COLORS.justeat}
            fill="url(#colorJusteat)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="dateFormatted"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Ingresos"
          stroke="#3B82F6"
          fill="url(#colorRevenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
