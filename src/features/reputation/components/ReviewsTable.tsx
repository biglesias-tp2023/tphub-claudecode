import { cn } from '@/utils/cn';
import { Clock, AlertTriangle, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { Review, ReviewTag } from '../hooks/useReputationData';
import type { ChannelId } from '@/types';

const CHANNEL_CONFIG: Record<ChannelId, { name: string; color: string }> = {
  glovo: { name: 'Glovo', color: '#FFC244' },
  ubereats: { name: 'Uber Eats', color: '#06C167' },
  justeat: { name: 'Just Eat', color: '#FF8000' },
};

interface ReviewsTableProps {
  data: Review[];
  className?: string;
}

const TAG_STYLES: Record<ReviewTag, { bg: string; text: string; border: string }> = {
  POSITIVE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  NOT_FRESH: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  MISSING_OR_MISTAKEN_ITEMS: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  SPEED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  PACKAGING_QUALITY: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  TASTED_BAD: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  TEMPERATURE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  QUALITY: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

function formatTag(tag: ReviewTag): string {
  return tag.replace(/_/g, '_');
}

function RatingDisplay({ rating }: { rating: Review['rating'] }) {
  if (rating === 'thumbsUp') {
    return <ThumbsUp className="w-5 h-5 text-green-500" />;
  }
  if (rating === 'thumbsDown') {
    return <ThumbsDown className="w-5 h-5 text-red-500" />;
  }
  // Stars rating
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

export function ReviewsTable({ data, className }: ReviewsTableProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                App
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Order ID
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Fecha
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Hora
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Value
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Delivery
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Review Tag
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Products
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Rating
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">
                Comment
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((review) => {
              const tagStyle = TAG_STYLES[review.tag];
              const visibleProducts = review.products.slice(0, 2);
              const extraCount = review.products.length - 2;

              const channelInfo = CHANNEL_CONFIG[review.channel];

              return (
                <tr
                  key={review.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: channelInfo.color }}
                      />
                      <span className="text-sm text-gray-900">{channelInfo.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {review.orderId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(review.orderDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {review.orderTime}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(review.value)}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-sm',
                        review.isDelayed ? 'text-red-500' : 'text-gray-600'
                      )}
                    >
                      {review.isDelayed ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>{review.deliveryTime} min</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded border',
                        tagStyle.bg,
                        tagStyle.text,
                        tagStyle.border
                      )}
                    >
                      {formatTag(review.tag)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {visibleProducts.map((product, i) => (
                        <span
                          key={i}
                          className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {product}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RatingDisplay rating={review.rating} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                    {review.comment || (
                      <span className="italic text-gray-400">no comment</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-500 border-t border-gray-200">
        Reporte generado automáticamente &bull; Datos de Glovo & Uber Eats Partner Portal
      </div>
    </div>
  );
}
