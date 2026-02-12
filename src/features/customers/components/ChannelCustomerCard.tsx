import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { CHANNELS } from '@/constants/channels';
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
  /** Customers with more than 1 order */
  returningCustomers: number;
  /** Percentage of customers with more than 1 order */
  repetitionRate: number;
}

const CHANNEL_STYLES: Record<ChannelId, { bg: string; border: string }> = {
  glovo: { bg: 'bg-amber-50/50', border: 'border-amber-100' },
  ubereats: { bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
  justeat: { bg: 'bg-orange-50/50', border: 'border-orange-100' },
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
  returningCustomers,
  repetitionRate,
}: ChannelCustomerCardProps) {
  const styles = CHANNEL_STYLES[channelId];

  return (
    <div className={cn('rounded-xl border p-5', styles.bg, styles.border)}>
      <div className="flex items-center gap-3 mb-4">
        <img
          src={CHANNELS[channelId].logoUrl}
          alt={channelName}
          className="w-7 h-7 rounded-full object-cover"
        />
        <span className="text-lg font-semibold text-gray-900">{channelName}</span>
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
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Repetidores</p>
            <span
              className="cursor-help text-gray-300"
              title="% de clientes que han hecho más de 1 pedido"
            >
              <Info className="w-3 h-3" />
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(returningCustomers)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{repetitionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-200/60">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">CLV</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(avgCLV)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ticket</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(avgTicket)}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200/60">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ped./Cliente</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{avgOrdersPerCustomer.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}
