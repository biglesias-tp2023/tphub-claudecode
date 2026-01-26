import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatters';
import type { RecentOrder } from '@/features/dashboard/hooks/useDashboardData';
import type { ChannelId } from '@/types';

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

const CHANNEL_BADGES: Record<ChannelId, { label: string; className: string }> = {
  glovo: { label: 'Glovo', className: 'bg-amber-100 text-amber-800' },
  ubereats: { label: 'Uber Eats', className: 'bg-green-100 text-green-800' },
  justeat: { label: 'Just Eat', className: 'bg-orange-100 text-orange-800' },
};

const STATUS_BADGES: Record<RecentOrder['status'], { label: string; variant: 'success' | 'error' | 'warning' }> = {
  delivered: { label: 'Entregado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'error' },
  pending: { label: 'Pendiente', variant: 'warning' },
};

/**
 * Table showing recent orders with channel, restaurant, and status.
 */
export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No hay pedidos recientes
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pedido
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Canal
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Restaurante
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hace
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => {
            const channelBadge = CHANNEL_BADGES[order.channel];
            const statusBadge = STATUS_BADGES[order.status];

            return (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-gray-900">
                    {order.externalId}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${channelBadge.className}`}>
                    {channelBadge.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-900">{order.restaurant}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(order.total)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={statusBadge.variant} size="sm">
                    {statusBadge.label}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(order.createdAt, { locale: es, addSuffix: false })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
