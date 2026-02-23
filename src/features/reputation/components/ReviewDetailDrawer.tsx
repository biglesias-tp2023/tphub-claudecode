import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Star, Package, MapPin, Copy, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Drawer } from '@/components/ui';
import { Button } from '@/components/ui';
import { CHANNELS } from '@/constants/channels';
import { getTagClasses } from '../utils/tagCategories';
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

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-5 h-5',
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  );
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

export function ReviewDetailDrawer({ review, isOpen, onClose }: ReviewDetailDrawerProps) {
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const handleCopyOrderId = useCallback(() => {
    if (!review) return;
    navigator.clipboard.writeText(review.orderId).then(() => {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    });
  }, [review]);

  if (!review) return <Drawer isOpen={isOpen} onClose={onClose}><div /></Drawer>;

  const channel = CHANNELS[review.channel];

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

        {/* Sección: Productos (placeholder) */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Productos del pedido
          </h3>
          <div className="bg-gray-50/50 rounded-lg p-4 flex items-center gap-3 text-gray-400">
            <Package className="w-5 h-5 shrink-0" />
            <p className="text-sm">Detalle de productos disponible próximamente</p>
          </div>
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
        </div>
      </div>
    </Drawer>
  );
}
