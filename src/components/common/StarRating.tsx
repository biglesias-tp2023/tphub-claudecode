import { useId } from 'react';

interface StarRatingProps {
  rating: number;
  size?: number;
  className?: string;
}

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

export function StarRating({ rating, size = 20, className }: StarRatingProps) {
  const uid = useId();
  const full = Math.floor(rating);
  const decimal = rating - full;

  return (
    <div className={className ?? 'flex gap-0.5'}>
      {[1, 2, 3, 4, 5].map((pos) => {
        const fillPercent =
          pos <= full ? 100 : pos === full + 1 && decimal > 0 ? decimal * 100 : 0;
        const gradientId = `star-${uid}-${pos}`;
        const hasColor = fillPercent > 0;

        return (
          <svg key={pos} viewBox="0 0 24 24" width={size} height={size}>
            <defs>
              <linearGradient id={gradientId}>
                <stop offset={`${fillPercent}%`} stopColor="#FACC15" />
                <stop offset={`${fillPercent}%`} stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <polygon
              points={STAR_POINTS}
              fill={`url(#${gradientId})`}
              stroke={hasColor ? '#FACC15' : '#E5E7EB'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
