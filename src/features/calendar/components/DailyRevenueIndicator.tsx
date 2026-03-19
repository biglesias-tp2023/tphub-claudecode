/**
 * Daily Revenue Indicator
 *
 * Tiny per-channel revenue badges for calendar day cells.
 * Shows colored dot + EUR amount for each channel with data.
 */

import { memo } from 'react';
import { cn } from '@/utils/cn';
import type { DailyChannelRevenue } from '@/services/crp-portal/dailyRevenue';

interface DailyRevenueIndicatorProps {
  revenue: DailyChannelRevenue;
  isPast?: boolean;
}

const CHANNEL_CONFIG = {
  glovo: { color: 'bg-amber-400', label: 'Glovo' },
  ubereats: { color: 'bg-green-600', label: 'UberEats' },
  justeat: { color: 'bg-red-500', label: 'JustEat' },
} as const;

function formatRevenue(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return Math.round(amount).toString();
}

export const DailyRevenueIndicator = memo(function DailyRevenueIndicator({
  revenue,
  isPast = false,
}: DailyRevenueIndicatorProps) {
  const channels = (['glovo', 'ubereats', 'justeat'] as const).filter(
    ch => revenue[ch] > 0
  );

  if (channels.length === 0) return null;

  return (
    <div className={cn(
      'flex flex-wrap gap-x-1.5 gap-y-0.5',
      isPast && 'opacity-60'
    )}>
      {channels.map(ch => (
        <span
          key={ch}
          className="flex items-center gap-0.5 text-[10px] text-gray-600 leading-none"
          title={`${CHANNEL_CONFIG[ch].label}: ${revenue[ch].toFixed(2)}€`}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', CHANNEL_CONFIG[ch].color)} />
          <span>{formatRevenue(revenue[ch])}€</span>
        </span>
      ))}
    </div>
  );
});
