import { Sparkline } from '@/components/charts/Sparkline';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { ChannelId } from '@/types';
import type { ChannelMetrics } from '@/features/controlling';

export const CHANNEL_STYLES: Record<ChannelId, { bg: string; border: string; sparkline: string }> = {
  glovo: { bg: 'bg-amber-50/50', border: 'border-amber-100', sparkline: '#d97706' },
  ubereats: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', sparkline: '#059669' },
  justeat: { bg: 'bg-orange-50/50', border: 'border-orange-100', sparkline: '#ea580c' },
};

export const CHANNEL_LOGOS: Record<ChannelId, string> = {
  glovo: '/images/channels/glovo.png',
  ubereats: '/images/channels/ubereats.png',
  justeat: '/images/channels/justeat.webp',
};

interface ChannelCardProps {
  data: ChannelMetrics;
  weeklyData?: number[];
  weeklyLoading?: boolean;
}

export function ChannelCard({ data, weeklyData, weeklyLoading }: ChannelCardProps) {
  const isPositive = data.revenueChange >= 0;
  const styles = CHANNEL_STYLES[data.channel];

  return (
    <div className={cn('rounded-xl border p-5', styles.bg, styles.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={CHANNEL_LOGOS[data.channel]}
            alt={data.name}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-lg font-semibold text-gray-900">{data.name}</span>
        </div>
        <span className="text-sm text-gray-500 tabular-nums">{data.percentage.toFixed(1)}%</span>
      </div>

      {/* Main metric + sparkline */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(data.revenue)}</p>
          <span className={cn(
            'text-sm font-medium tabular-nums',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {isPositive ? '\u2197' : '\u2198'} {isPositive ? '+' : ''}{data.revenueChange.toFixed(1)}%
          </span>
        </div>
        <div>
          {weeklyLoading ? (
            <div className="w-[120px] h-[36px] bg-white/50 rounded animate-pulse" />
          ) : (
            <Sparkline
              data={weeklyData || []}
              width={120}
              height={36}
              color={styles.sparkline}
              areaOpacity={0.12}
            />
          )}
        </div>
      </div>

      {/* Stats grid - Top row */}
      <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-200/60">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Pedidos</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(data.pedidos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.pedidosPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ticket</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{data.ticketMedio.toFixed(1)}\u20AC</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Open</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{data.openTime.toFixed(0)}%</p>
        </div>
      </div>

      {/* Stats grid - Bottom row */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/60">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ads</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.ads)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.adsPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Promos</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.promos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.promosPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Reemb.</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(data.reembolsos)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{data.reembolsosPercentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
