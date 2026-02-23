import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { ThumbsUp, ThumbsDown, Star, ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, X } from 'lucide-react';
import { CHANNELS } from '@/constants/channels';
import { getTagClasses, getTagCategory, type TagCategory } from '../utils/tagCategories';
import type { Review } from '../hooks/useReputationData';
import type { ChannelId } from '@/types';

const PAGE_SIZE_OPTIONS = [15, 50, 75, 100] as const;

type SentimentFilter = 'all' | 'positive' | 'negative';
type CommentFilter = 'all' | 'with' | 'without';
type RefundFilter = 'all' | 'with' | 'without';
const FILTER_SELECT = 'text-xs h-7 rounded-md border px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-primary-500';
const FILTER_ACTIVE = 'border-primary-300 bg-primary-50 text-primary-700';
const FILTER_DEFAULT = 'border-gray-200 bg-white text-gray-600';

function isPositive(review: Review): boolean {
  if (review.channel === 'glovo') return review.rating >= 4;
  return review.rating >= 4;
}

function isNegative(review: Review): boolean {
  if (review.channel === 'glovo') return review.rating < 4;
  return review.rating <= 2;
}

interface ReviewsTableProps {
  data: Review[];
  totalInPeriod?: number;
  className?: string;
  onRowClick?: (review: Review) => void;
}

function RatingDisplay({ rating, channel }: { rating: number; channel: ChannelId }) {
  if (channel === 'glovo') {
    if (rating >= 4) {
      return <ThumbsUp className="w-5 h-5 text-green-500" />;
    }
    return <ThumbsDown className="w-5 h-5 text-red-500" />;
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-4 h-4',
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

function truncateId(id: string, maxLen = 12): string {
  if (id.length <= maxLen) return id;
  return id.slice(0, maxLen) + '...';
}

export function ReviewsTable({ data, totalInPeriod, className, onRowClick }: ReviewsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filter state
  const [tagFilter, setTagFilter] = useState<TagCategory | 'all'>('all');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [refundFilter, setRefundFilter] = useState<RefundFilter>('all');
  const [deliveryMin, setDeliveryMin] = useState('');
  const [deliveryMax, setDeliveryMax] = useState('');

  const hasActiveFilters = tagFilter !== 'all' || sentiment !== 'all' || commentFilter !== 'all' || refundFilter !== 'all' || deliveryMin !== '' || deliveryMax !== '';

  const clearAllFilters = () => {
    setTagFilter('all');
    setSentiment('all');
    setCommentFilter('all');
    setRefundFilter('all');
    setDeliveryMin('');
    setDeliveryMax('');
  };

  // Apply filters
  const filteredData = useMemo(() => {
    let result = data;

    // Tag category filter
    if (tagFilter !== 'all') {
      result = result.filter((r) =>
        r.tags?.some((tag) => getTagCategory(tag) === tagFilter)
      );
    }

    // Sentiment filter
    if (sentiment === 'positive') {
      result = result.filter(isPositive);
    } else if (sentiment === 'negative') {
      result = result.filter(isNegative);
    }

    // Comment filter
    if (commentFilter === 'with') {
      result = result.filter((r) => r.comment && r.comment.trim().length > 0);
    } else if (commentFilter === 'without') {
      result = result.filter((r) => !r.comment || r.comment.trim().length === 0);
    }

    // Refund filter
    if (refundFilter === 'with') {
      result = result.filter((r) => r.refundAmount != null && r.refundAmount > 0);
    } else if (refundFilter === 'without') {
      result = result.filter((r) => r.refundAmount == null || r.refundAmount === 0);
    }

    // Delivery time range
    const minTime = deliveryMin !== '' ? Number(deliveryMin) : null;
    const maxTime = deliveryMax !== '' ? Number(deliveryMax) : null;
    if (minTime !== null || maxTime !== null) {
      result = result.filter((r) => {
        if (r.deliveryTime == null) return false;
        if (minTime !== null && r.deliveryTime < minTime) return false;
        if (maxTime !== null && r.deliveryTime > maxTime) return false;
        return true;
      });
    }

    return result;
  }, [data, tagFilter, sentiment, commentFilter, refundFilter, deliveryMin, deliveryMax]);

  // Reset to page 1 when filtered data or pageSize changes
  useEffect(() => { setPage(1); }, [filteredData, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredData.length);
  const pageData = useMemo(() => filteredData.slice(startIdx, endIdx), [filteredData, startIdx, endIdx]);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 overflow-hidden', className)}>
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value as TagCategory | 'all')}
          className={cn(FILTER_SELECT, tagFilter !== 'all' ? FILTER_ACTIVE : FILTER_DEFAULT)}
        >
          <option value="all">Tags: Todos</option>
          <option value="producto">Producto</option>
          <option value="servicio">Servicio</option>
          <option value="packaging">Packaging</option>
          <option value="precio">Precio</option>
          <option value="cantidad">Cantidad</option>
        </select>

        <select
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value as SentimentFilter)}
          className={cn(FILTER_SELECT, sentiment !== 'all' ? FILTER_ACTIVE : FILTER_DEFAULT)}
        >
          <option value="all">Valoración: Todas</option>
          <option value="positive">Positiva</option>
          <option value="negative">Negativa</option>
        </select>

        <select
          value={commentFilter}
          onChange={(e) => setCommentFilter(e.target.value as CommentFilter)}
          className={cn(FILTER_SELECT, commentFilter !== 'all' ? FILTER_ACTIVE : FILTER_DEFAULT)}
        >
          <option value="all">Comentarios: Todos</option>
          <option value="with">Con comentario</option>
          <option value="without">Sin comentario</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">T. Entrega</span>
          <input
            type="number"
            placeholder="Min"
            value={deliveryMin}
            onChange={(e) => setDeliveryMin(e.target.value)}
            className="w-14 h-7 text-xs rounded-md border border-gray-200 px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-gray-400">&ndash;</span>
          <input
            type="number"
            placeholder="Max"
            value={deliveryMax}
            onChange={(e) => setDeliveryMax(e.target.value)}
            className="w-14 h-7 text-xs rounded-md border border-gray-200 px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-gray-400">min</span>
        </div>

        <select
          value={refundFilter}
          onChange={(e) => setRefundFilter(e.target.value as RefundFilter)}
          className={cn(FILTER_SELECT, refundFilter !== 'all' ? FILTER_ACTIVE : FILTER_DEFAULT)}
        >
          <option value="all">Reembolso: Todos</option>
          <option value="with">Con reembolso</option>
          <option value="without">Sin reembolso</option>
        </select>

        {hasActiveFilters && (
          <>
            <button
              onClick={clearAllFilters}
              className="text-xs h-7 px-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
            <span className="text-xs text-gray-400">
              {filteredData.length} de {data.length}
            </span>
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">App</th>
              <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">AOV</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Fecha</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Hora</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Rating</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Comentario</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Tags</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">T. Entrega</th>
              <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">Reembolso</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Order ID</th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">Review ID</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((review) => {
              const channel = CHANNELS[review.channel];

              return (
                <tr
                  key={review.id}
                  onClick={() => onRowClick?.(review)}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  <td className="px-4 py-3">
                    <img
                      src={channel.logoUrl}
                      alt={channel.name}
                      className="w-6 h-6 rounded-full object-cover"
                      title={channel.name}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap">
                    {review.orderAmount != null && review.orderAmount > 0 ? (
                      <span className="text-gray-900 font-semibold">
                        {review.orderAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;&euro;
                      </span>
                    ) : (
                      <span className="italic text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(review.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {review.time}
                  </td>
                  <td className="px-4 py-3">
                    <RatingDisplay rating={review.rating} channel={review.channel} />
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                    {review.comment
                      ? <span className="text-gray-500">{review.comment}</span>
                      : <span className="italic text-gray-300">Sin comentario</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {review.tags && review.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-block text-xs rounded px-1.5 py-0.5 ${getTagClasses(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm italic text-gray-300">Sin tags</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {review.deliveryTime != null
                      ? (
                        <span className={review.deliveryTime > 35 ? 'text-red-500 font-medium' : 'text-gray-500'}>
                          {review.deliveryTime} min
                        </span>
                      )
                      : <span className="italic text-gray-300">&mdash;</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap">
                    {review.refundAmount != null && review.refundAmount > 0 ? (
                      <span className="text-amber-600 font-medium">
                        -{review.refundAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;&euro;
                      </span>
                    ) : (
                      <span className="italic text-gray-300">0,00&nbsp;&euro;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">
                    {truncateId(review.orderId)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">
                    {truncateId(review.id)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-gray-50/50 px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Primera página"
          >
            <ChevronFirst className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 tabular-nums">
            {page}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Última página"
          >
            <ChevronLast className="w-4 h-4" />
          </button>

          <span className="ml-2 text-sm text-gray-500">
            Mostrando {filteredData.length > 0 ? startIdx + 1 : 0}&ndash;{endIdx} de {filteredData.length.toLocaleString('es-ES')} reseñas
            {totalInPeriod != null && totalInPeriod > data.length && !hasActiveFilters && (
              <span className="text-gray-400"> (de {totalInPeriod.toLocaleString('es-ES')} en periodo)</span>
            )}
          </span>
        </div>

        {/* Right: Page size selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-gray-500 whitespace-nowrap">
            Filas por página
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 pr-7 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
