/**
 * RatingByChannel - Ratings por canal con diferentes métricas
 *
 * - Glovo: % de reseñas positivas (thumbs up binario)
 * - UberEats: Estrellas 1-5
 * - JustEat: Estrellas 1-5
 *
 * Usado para: Subir ratings
 */
import { ArrowRight, Star, ThumbsUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { RatingByChannelData } from '@/types';

// ============================================
// TYPES
// ============================================

interface RatingByChannelProps {
  value: RatingByChannelData;
  onChange: (value: RatingByChannelData) => void;
  label?: string;
  description?: string;
}

// ============================================
// CONSTANTS
// ============================================

const CHANNEL_CONFIG = {
  glovo: {
    label: 'Glovo',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    icon: ThumbsUp,
    unit: '%',
    unitLabel: '% positivas',
    min: 0,
    max: 100,
    step: 1,
  },
  ubereats: {
    label: 'UberEats',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: Star,
    unit: '⭐',
    unitLabel: 'estrellas',
    min: 1,
    max: 5,
    step: 0.1,
  },
  justeat: {
    label: 'JustEat',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    icon: Star,
    unit: '⭐',
    unitLabel: 'estrellas',
    min: 1,
    max: 5,
    step: 0.1,
  },
};

// ============================================
// COMPONENT
// ============================================

export function RatingByChannel({
  value,
  onChange,
  label = 'Objetivos de Rating por Canal',
  description,
}: RatingByChannelProps) {
  const updateChannel = (
    channel: 'glovo' | 'ubereats' | 'justeat',
    field: 'current' | 'target',
    newValue: number
  ) => {
    onChange({
      ...value,
      [channel]: {
        ...value[channel],
        [field]: newValue,
      },
    });
  };

  return (
    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="space-y-4">
        {(Object.keys(CHANNEL_CONFIG) as Array<keyof typeof CHANNEL_CONFIG>).map((channelId) => {
          const config = CHANNEL_CONFIG[channelId];
          const channelValue = value[channelId];
          const Icon = config.icon;
          const improvement = channelValue.target - channelValue.current;
          const hasImprovement = improvement > 0;

          return (
            <div
              key={channelId}
              className={cn(
                'p-3 rounded-lg border',
                config.bgColor,
                config.borderColor
              )}
            >
              {/* Channel header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('w-3 h-3 rounded-full', config.color)} />
                <span className={cn('text-sm font-semibold', config.textColor)}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500">
                  ({config.unitLabel})
                </span>
              </div>

              {/* Inputs */}
              <div className="flex items-center gap-3">
                {/* Current */}
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 text-center">
                    Actual
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={channelValue.current || ''}
                      onChange={(e) => updateChannel(channelId, 'current', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="w-full text-center text-xl font-bold py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {config.unit}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-0.5 pt-4">
                  <ArrowRight className={cn('w-5 h-5', config.textColor)} />
                  {hasImprovement && (
                    <span className="text-[10px] font-medium text-green-600">
                      +{improvement.toFixed(channelId === 'glovo' ? 0 : 1)}{config.unit}
                    </span>
                  )}
                </div>

                {/* Target */}
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 text-center">
                    Objetivo
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={channelValue.target || ''}
                      onChange={(e) => updateChannel(channelId, 'target', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className={cn(
                        'w-full text-center text-xl font-bold py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 bg-white',
                        hasImprovement
                          ? 'border-green-300 focus:ring-green-500/20 text-green-700'
                          : 'border-gray-200 focus:ring-amber-500/20'
                      )}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {config.unit}
                    </span>
                  </div>
                </div>

                {/* Visual indicator */}
                <div className="w-10 flex justify-center pt-4">
                  <Icon className={cn('w-5 h-5', hasImprovement ? 'text-green-500' : 'text-gray-300')} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      )}
    </div>
  );
}
