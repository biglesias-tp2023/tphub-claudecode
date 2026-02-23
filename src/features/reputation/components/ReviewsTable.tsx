import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { ThumbsUp, ThumbsDown, Star, ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from 'lucide-react';
import { CHANNELS } from '@/constants/channels';
import { getTagClasses } from '../utils/tagCategories';
import type { Review } from '../hooks/useReputationData';
import type { ChannelId } from '@/types';

const PAGE_SIZE_OPTIONS = [15, 50, 75, 100] as const;

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

  // Reset to page 1 when data or pageSize changes
  useEffect(() => { setPage(1); }, [data, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, data.length);
  const pageData = useMemo(() => data.slice(startIdx, endIdx), [data, startIdx, endIdx]);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 overflow-hidden', className)}>
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
            Mostrando {startIdx + 1}&ndash;{endIdx} de {(totalInPeriod || data.length).toLocaleString('es-ES')} reseñas
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
