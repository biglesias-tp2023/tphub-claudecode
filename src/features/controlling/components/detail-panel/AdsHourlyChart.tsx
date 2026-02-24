import { useMemo } from 'react';
import { BarChart } from '@/components/charts/rosen/BarChart';
import { formatCurrency } from '@/utils/formatters';
import type { AdsHourlyDistributionRow } from '@/services/crp-portal';

interface AdsHourlyChartProps {
  data: AdsHourlyDistributionRow[];
  isLoading: boolean;
}

export function AdsHourlyChart({ data, isLoading }: AdsHourlyChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Ensure all 24 hours are represented
    const byHour = new Map(data.map((d) => [d.hourOfDay, d]));
    return Array.from({ length: 24 }, (_, h) => {
      const row = byHour.get(h);
      return {
        label: h % 3 === 0 ? `${h}h` : '',
        value: row?.adSpent ?? 0,
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = chartData.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="h-[180px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-xs text-gray-400">Sin datos de ADS por horas</p>
      </div>
    );
  }

  return (
    <div className="h-[180px]">
      <BarChart
        data={chartData}
        defaultColor="#095789"
        barRadius={2}
        xAxisAngle={0}
        xAxisHeight={24}
        margin={{ top: 5, right: 5, left: 35, bottom: 5 }}
        renderTooltip={(item, index) => (
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <p className="font-medium mb-1">{index}:00 - {index}:59</p>
            <p>Inversion: {formatCurrency(item.value)}</p>
          </div>
        )}
      />
    </div>
  );
}
