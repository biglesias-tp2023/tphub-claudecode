import { cn } from '@/utils/cn';
import type { ChannelRating } from '../hooks/useReputationData';
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { CHANNELS } from '@/constants/channels';
import { StarRating } from '@/components/common';

interface ChannelRatingCardProps {
  data: ChannelRating;
  className?: string;
}

export function ChannelRatingCard({ data, className }: ChannelRatingCardProps) {
  const isPercent = data.ratingType === 'percent';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-6',
        className
      )}
    >
      {/* Header with channel logo and delivery time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <img
            src={CHANNELS[data.channel].logoUrl}
            alt={data.name}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="font-medium text-gray-900">{data.name}</span>
        </div>
        {data.avgDeliveryTime != null && data.avgDeliveryTime > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{data.avgDeliveryTime.toFixed(1)} min</span>
          </div>
        )}
      </div>

      {/* Main rating */}
      <div className="text-center mb-3">
        <div className="text-5xl font-bold text-gray-900">
          {isPercent ? `${data.rating}%` : data.rating.toFixed(1)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          ({data.totalReviews} valoraciones)
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{isPercent ? '0%' : '1.0'}</span>
          <span>{isPercent ? '100%' : '5.0'}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: data.color,
              width: isPercent
                ? `${data.rating}%`
                : `${((data.rating - 1) / 4) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Rating details */}
      {isPercent ? (
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-green-600">
            <ThumbsUp className="w-4 h-4" />
            <span>{data.positivePercent}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-500">
            <ThumbsDown className="w-4 h-4" />
            <span>{data.negativePercent}%</span>
          </div>
        </div>
      ) : (
        <StarRating rating={data.rating} className="flex items-center justify-center gap-0.5" />
      )}
    </div>
  );
}
