import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { ChannelId } from '@/types';

interface ChannelCustomerCardProps {
  channelId: ChannelId;
  channelName: string;
  totalCustomers: number;
  newCustomers: number;
  newCustomersPercentage: number;
  avgCLV: number;
  avgTicket: number;
  avgOrdersPerCustomer: number;
}

const CHANNEL_STYLES: Record<ChannelId, { bg: string; border: string; accent: string }> = {
  glovo: { bg: 'bg-amber-50/50', border: 'border-amber-100', accent: 'bg-amber-400' },
  ubereats: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', accent: 'bg-emerald-500' },
  justeat: { bg: 'bg-orange-50/50', border: 'border-orange-100', accent: 'bg-orange-400' },
};

export function ChannelCustomerCard({
  channelId,
  channelName,
  totalCustomers,
  newCustomers,
  newCustomersPercentage,
  avgCLV,
  avgTicket,
  avgOrdersPerCustomer,
}: ChannelCustomerCardProps) {
  const styles = CHANNEL_STYLES[channelId];

  return (
    <div className={cn('rounded-xl border p-5', styles.bg, styles.border)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn('w-3 h-3 rounded-full', styles.accent)} />
        <span className="font-semibold text-gray-900">{channelName}</span>
      </div>

      <div className="mb-5">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatNumber(totalCustomers)}</p>
        <span className="text-sm text-gray-500">clientes</span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-200/60">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nuevos</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(newCustomers)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{newCustomersPercentage.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">CLV</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(avgCLV)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/60">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ticket</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(avgTicket)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ped./Cliente</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{avgOrdersPerCustomer.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}
