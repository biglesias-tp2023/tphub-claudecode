import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import { formatCurrency } from '@/utils/formatters';
import type { DailyRevenue } from '@/features/dashboard/hooks/useDashboardData';
import type { AreaSeriesConfig } from '@/components/charts/rosen/types';

interface RevenueChartProps {
  data: DailyRevenue[];
  showByChannel?: boolean;
}

const CHANNEL_COLORS = {
  glovo: '#FFC244',
  ubereats: '#06C167',
  justeat: '#FF8000',
};

const SINGLE_SERIES: AreaSeriesConfig[] = [
  {
    dataKey: 'revenue',
    name: 'Ingresos',
    color: '#3B82F6',
    gradientOpacity: [0.3, 0],
    strokeWidth: 2,
    showDots: false,
  },
];

const CHANNEL_SERIES: AreaSeriesConfig[] = [
  {
    dataKey: 'glovo',
    name: 'Glovo',
    color: CHANNEL_COLORS.glovo,
    gradientOpacity: [0.3, 0],
    strokeWidth: 2,
    stackId: 'channels',
    showDots: false,
  },
  {
    dataKey: 'ubereats',
    name: 'Uber Eats',
    color: CHANNEL_COLORS.ubereats,
    gradientOpacity: [0.3, 0],
    strokeWidth: 2,
    stackId: 'channels',
    showDots: false,
  },
  {
    dataKey: 'justeat',
    name: 'Just Eat',
    color: CHANNEL_COLORS.justeat,
    gradientOpacity: [0.3, 0],
    strokeWidth: 2,
    stackId: 'channels',
    showDots: false,
  },
];

/**
 * Area chart showing revenue over time.
 * Can display total revenue or breakdown by channel.
 */
export function RevenueChart({ data, showByChannel = false }: RevenueChartProps) {
  const chartData = useMemo(
    () => data.map((d) => ({
      ...d,
      dateFormatted: format(parseISO(d.date), 'd MMM', { locale: es }),
    })),
    [data],
  );

  const series = showByChannel ? CHANNEL_SERIES : SINGLE_SERIES;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <AreaChart
          data={chartData}
          xKey="dateFormatted"
          series={series}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          yTickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          renderTooltip={(dataPoint, xLabel) => (
            <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
              <p className="font-medium text-gray-900 mb-2">{xLabel}</p>
              {series.map((s) => {
                const val = Number(dataPoint[s.dataKey]) || 0;
                if (val === 0) return null;
                return (
                  <p key={s.dataKey} className="text-sm" style={{ color: s.color }}>
                    {s.name}: {formatCurrency(val)}
                  </p>
                );
              })}
            </div>
          )}
        />
      </div>
      {showByChannel && (
        <div className="flex items-center justify-center gap-4 mt-2" style={{ fontSize: 12 }}>
          {CHANNEL_SERIES.map((s) => (
            <div key={s.dataKey} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
