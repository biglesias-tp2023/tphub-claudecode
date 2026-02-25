import { Info } from 'lucide-react';
import { MetricTooltip, tooltipContent } from '@/components/common';
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
  avgTicket: number;
  avgOrdersPerCustomer: number;
  returningCustomers: number;
  repetitionRate: number;
  netRevenuePerCustomer: number;
  promoOrdersPercentage: number;
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
  avgTicket,
  avgOrdersPerCustomer,
  returningCustomers,
  repetitionRate,
  netRevenuePerCustomer,
  promoOrdersPercentage,
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
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Nuevos</p>
            <MetricTooltip
              content={tooltipContent(
                'Clientes que hacen su primer pedido en este canal durante el período seleccionado.',
                'COUNT(DISTINCT customer_id) WHERE flg_customer_new = true',
                'Mide la capacidad de captación del canal. Un % alto indica buen alcance de nuevos usuarios.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(newCustomers)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{newCustomersPercentage.toFixed(1)}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Repetidores</p>
            <MetricTooltip
              content={tooltipContent(
                'Clientes que han hecho más de 1 pedido en este canal.',
                'Clientes con >1 pedido / Total clientes × 100',
                'Una tasa alta indica buena fidelización en el canal. Comparar entre canales revela cuál retiene mejor.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(returningCustomers)}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">{repetitionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-200/60">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Net Rev/Cli</p>
            <MetricTooltip
              content={tooltipContent(
                'Ingreso neto medio por cliente en este canal.',
                '(Ventas totales - Reembolsos) / Clientes únicos',
                'Mide el valor real que aporta cada cliente descontando devoluciones. Más fiable que el ticket medio.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(netRevenuePerCustomer)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ticket</p>
            <MetricTooltip
              content={tooltipContent(
                'Importe medio por pedido en este canal.',
                'Ingresos totales del canal / Número total de pedidos',
                'Palanca de precio directa. Comparar entre canales revela dónde los clientes gastan más por pedido.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(avgTicket)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/60">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ped./Cliente</p>
            <MetricTooltip
              content={tooltipContent(
                'Media de pedidos por cliente en este canal durante el período.',
                'Total pedidos / Total clientes únicos',
                'A mayor frecuencia, mayor LTV del canal. Útil para priorizar inversión en retención.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{avgOrdersPerCustomer.toFixed(1)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">% con Promo</p>
            <MetricTooltip
              content={tooltipContent(
                'Porcentaje de pedidos que usaron alguna promoción.',
                'Pedidos con amt_promotions > 0 / Total pedidos × 100',
                'Un % alto puede indicar dependencia de promos. Comparar con la tasa de repetición para evaluar calidad.'
              )}
            >
              <Info className="w-3 h-3" />
            </MetricTooltip>
          </div>
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{promoOrdersPercentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
