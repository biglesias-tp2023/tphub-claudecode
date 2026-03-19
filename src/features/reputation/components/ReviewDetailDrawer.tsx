import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Package, MapPin, Copy, Check, Loader2, Tag, User, ChevronDown, ChevronUp } from 'lucide-react';
import { StarRating } from '@/components/common';
import { cn } from '@/utils/cn';
import { Drawer } from '@/components/ui';
import { Button } from '@/components/ui';
import { CHANNELS } from '@/constants/channels';
import { getTagClasses } from '../utils/tagCategories';
import { useOrderLines, useOrderCustomerInfo, useCustomerProfile } from '../hooks/useOrderLines';
import type { Review } from '../hooks/useReputationData';
import type { ChannelId } from '@/types';

interface ReviewDetailDrawerProps {
  review: Review | null;
  isOpen: boolean;
  onClose: () => void;
}

function RatingDisplay({ rating, channel }: { rating: number; channel: ChannelId }) {
  if (channel === 'glovo') {
    if (rating >= 4) {
      return <ThumbsUp className="w-6 h-6 text-green-500" />;
    }
    return <ThumbsDown className="w-6 h-6 text-red-500" />;
  }

  return <StarRating rating={rating} />;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
      title={`Copiar ${label}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function formatFullDate(dateStr: string, timeStr: string): string {
  const date = new Date(`${dateStr}T${timeStr}`);
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}, ${timeStr}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function ReviewDetailDrawer({ review, isOpen, onClose }: ReviewDetailDrawerProps) {
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [customerExpanded, setCustomerExpanded] = useState(false);

  // Fetch order lines when drawer is open
  const { data: orderLines, isLoading: linesLoading } = useOrderLines(
    isOpen ? review?.orderId : undefined,
    isOpen ? review?.companyId : undefined
  );

  // Fetch customer info when drawer is open
  const { data: customerInfo } = useOrderCustomerInfo(
    isOpen ? review?.orderId : undefined
  );

  // Fetch customer profile only when expanded
  const { data: customerProfile, isLoading: profileLoading } = useCustomerProfile(
    customerExpanded ? customerInfo?.customerId : null
  );

  const handleCopyOrderId = useCallback(() => {
    if (!review) return;
    navigator.clipboard.writeText(review.orderId).then(() => {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    });
  }, [review]);

  if (!review) return <Drawer isOpen={isOpen} onClose={onClose}><div /></Drawer>;

  const channel = CHANNELS[review.channel];
  const linesTotal = orderLines?.reduce((sum, l) => sum + l.totalPrice, 0) ?? 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del pedido"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleCopyOrderId}>
            {copiedOrderId ? (
              <><Check className="w-4 h-4" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copiar Order ID</>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-6">
        {/* Cabecera: logo + rating + fecha */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={channel.logoUrl}
              alt={channel.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">{channel.name}</span>
              <p className="text-xs text-gray-500">
                {formatFullDate(review.date, review.time)}
              </p>
            </div>
          </div>
          <RatingDisplay rating={review.rating} channel={review.channel} />
        </div>

        {/* Sección: Resumen del Pedido */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Resumen del pedido
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* AOV */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">AOV</p>
              {review.orderAmount != null && review.orderAmount > 0 ? (
                <p className="text-lg font-semibold text-gray-900">
                  {review.orderAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                </p>
              ) : (
                <p className="text-lg text-gray-300">&mdash;</p>
              )}
            </div>

            {/* Tiempo de Entrega */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">T. Entrega</p>
              {review.deliveryTime != null ? (
                <p
                  className={cn(
                    'text-lg font-semibold',
                    review.deliveryTime <= 30
                      ? 'text-green-600'
                      : review.deliveryTime <= 45
                        ? 'text-amber-600'
                        : 'text-red-600'
                  )}
                >
                  {review.deliveryTime} min
                </p>
              ) : (
                <p className="text-lg text-gray-300">&mdash;</p>
              )}
            </div>

            {/* Reembolso */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Reembolso</p>
              {review.refundAmount != null && review.refundAmount > 0 ? (
                <p className="text-lg font-semibold text-amber-600">
                  -{review.refundAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                </p>
              ) : (
                <p className="text-sm text-gray-400">Sin reembolso</p>
              )}
            </div>
          </div>
        </section>

        {/* Sección: Cliente */}
        {customerInfo?.customerId && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Cliente
            </h3>
            {/* Row: full ID + badge + pedidos asociados clickable */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-mono text-xs text-gray-700 truncate">{customerInfo.customerId}</span>
                <CopyButton text={customerInfo.customerId} label="Eater ID" />
                {customerInfo.isNewCustomer ? (
                  <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">
                    Nuevo
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full shrink-0">
                    Recurrente
                  </span>
                )}
              </div>
              <button
                onClick={() => setCustomerExpanded(!customerExpanded)}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium shrink-0 ml-2"
              >
                {customerProfile ? `${customerProfile.totalOrders} pedidos` : 'Pedidos'}
                {customerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Expandable: customer profile */}
            {customerExpanded && (
              <div className="mt-3 bg-gray-50 rounded-lg overflow-hidden">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                ) : customerProfile ? (
                  <>
                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-px bg-gray-100">
                      <div className="bg-gray-50 p-2.5 text-center">
                        <p className="text-[10px] text-gray-400">Pedidos</p>
                        <p className="text-sm font-semibold text-gray-900">{customerProfile.totalOrders}</p>
                      </div>
                      <div className="bg-gray-50 p-2.5 text-center">
                        <p className="text-[10px] text-gray-400">Gasto total</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {customerProfile.totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} &euro;
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2.5 text-center">
                        <p className="text-[10px] text-gray-400">Ticket medio</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {customerProfile.avgTicket.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2.5 text-center">
                        <p className="text-[10px] text-gray-400">Reembolsos</p>
                        <p className={cn(
                          'text-sm font-semibold',
                          customerProfile.totalRefunds > 0 ? 'text-amber-600' : 'text-gray-900'
                        )}>
                          {customerProfile.totalRefunds > 0
                            ? `${customerProfile.totalRefunds.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                            : '0'}
                        </p>
                      </div>
                    </div>

                    {/* Order history list */}
                    {customerProfile.orders.length > 0 && (
                      <div className="px-3 py-2">
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Historial
                        </h4>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                          {customerProfile.orders.map((order) => (
                            <div
                              key={order.orderId}
                              className={cn(
                                'flex items-center justify-between py-1.5 px-2 rounded text-xs',
                                order.orderId === review.orderId ? 'bg-primary-50' : 'hover:bg-white'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {order.channel && (
                                  <img
                                    src={CHANNELS[order.channel as ChannelId]?.logoUrl}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-full shrink-0"
                                  />
                                )}
                                <span className="text-gray-500">{formatShortDate(order.date)}</span>
                                <span className="font-mono text-[10px] text-gray-300 truncate">{order.orderId}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="font-medium text-gray-700">
                                  {order.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                                </span>
                                {order.refund && (
                                  <span className="text-amber-600 text-[10px] font-medium">
                                    -{order.refund.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </section>
        )}

        {/* Sección: Reseña y Comentario */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Reseña y comentario
          </h3>

          {/* Rating visual */}
          <div className="mb-3">
            <RatingDisplay rating={review.rating} channel={review.channel} />
          </div>

          {/* Comentario */}
          {review.comment ? (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-200">
              <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">Sin comentario del cliente</p>
          )}

          {/* Tags */}
          <div className="mt-3">
            {review.tags && review.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-block text-xs rounded-full px-2.5 py-1 ${getTagClasses(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">Sin tags asignados</p>
            )}
          </div>
        </section>

        {/* Sección: Productos del pedido */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Productos del pedido
          </h3>
          {linesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : orderLines && orderLines.length > 0 ? (
            <div className="space-y-1.5">
              {orderLines.map((line, idx) => (
                <div
                  key={`${line.productId}-${idx}`}
                  className="flex items-start justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 truncate">{line.productName}</span>
                      {line.promotion && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                          <Tag className="w-2.5 h-2.5" />
                          Promo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {line.quantity} x {line.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-700 shrink-0 ml-3">
                    {line.totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                  </span>
                </div>
              ))}
              {/* Total */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100 px-3">
                <span className="text-xs font-medium text-gray-500">Total productos</span>
                <span className="text-sm font-semibold text-gray-900">
                  {linesTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/50 rounded-lg p-4 flex items-center gap-3 text-gray-400">
              <Package className="w-5 h-5 shrink-0" />
              <p className="text-sm">Sin datos de productos para este pedido</p>
            </div>
          )}
        </section>

        {/* Sección: Zona / Dirección (placeholder) */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Zona / Dirección
          </h3>
          <div className="bg-gray-50/50 rounded-lg p-4 flex items-center gap-3 text-gray-400">
            <MapPin className="w-5 h-5 shrink-0" />
            <p className="text-sm">Información de zona disponible próximamente</p>
          </div>
        </section>

        {/* IDs discretos */}
        <div className="pt-2 border-t border-gray-100 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Order ID:</span>
            <span className="font-mono text-xs text-gray-400 truncate">{review.orderId}</span>
            <CopyButton text={review.orderId} label="Order ID" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Review ID:</span>
            <span className="font-mono text-xs text-gray-400 truncate">{review.id}</span>
            <CopyButton text={review.id} label="Review ID" />
          </div>
          {customerInfo?.customerId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Eater ID:</span>
              <span className="font-mono text-xs text-gray-400 truncate">{customerInfo.customerId}</span>
              <CopyButton text={customerInfo.customerId} label="Eater ID" />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
