import { useState, useRef, useEffect } from 'react';
import { X, User, ShoppingBag, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { useCustomerProfile } from '../hooks/useOrderLines';
import { CHANNELS } from '@/constants/channels';
import { cn } from '@/utils/cn';
import type { ChannelId } from '@/types';

interface CustomerProfilePopoverProps {
  customerId: string;
  isNew: boolean;
  trigger: React.ReactNode;
}

export function CustomerProfilePopover({ customerId, isNew, trigger }: CustomerProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: profile, isLoading } = useCustomerProfile(isOpen ? customerId : null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 hover:text-primary-600 transition-colors cursor-pointer"
      >
        {trigger}
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">
                {customerId.slice(0, 12)}...
              </span>
              {isNew ? (
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Nuevo
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">
                  Recurrente
                </span>
              )}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : profile ? (
            <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <KpiCard
                  icon={<ShoppingBag className="w-3.5 h-3.5" />}
                  label="Pedidos"
                  value={String(profile.totalOrders)}
                />
                <KpiCard
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Gasto total"
                  value={`${profile.totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                />
                <KpiCard
                  icon={<ShoppingBag className="w-3.5 h-3.5" />}
                  label="Ticket medio"
                  value={`${profile.avgTicket.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                />
                <KpiCard
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Primer pedido"
                  value={profile.firstOrderDate ? formatShortDate(profile.firstOrderDate) : '—'}
                />
              </div>

              {/* Order history */}
              {profile.orders.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Historial de pedidos
                  </h4>
                  <div className="space-y-1">
                    {profile.orders.slice(0, 15).map((order) => (
                      <div
                        key={order.orderId}
                        className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          {order.channel && (
                            <img
                              src={CHANNELS[order.channel as ChannelId]?.logoUrl}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          <span className="text-gray-500">{formatShortDate(order.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">
                            {order.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                          {order.refund && (
                            <span className="text-amber-600 text-[10px]">
                              -{order.refund.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {profile.orders.length > 15 && (
                      <p className="text-[10px] text-gray-400 text-center pt-1">
                        +{profile.orders.length - 15} pedidos más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className={cn('text-sm font-semibold text-gray-900 truncate')}>{value}</p>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
