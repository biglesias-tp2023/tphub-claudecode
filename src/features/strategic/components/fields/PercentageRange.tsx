/**
 * PercentageRange - De X% a Y%
 *
 * Usado para: Mejorar Margen, OpenTime, Incentivar reseñas
 */
import { ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PercentageRangeData } from '@/types';

// ============================================
// TYPES
// ============================================

interface PercentageRangeProps {
  value: PercentageRangeData;
  onChange: (value: PercentageRangeData) => void;
  label?: string;
  description?: string;
  currentLabel?: string;
  targetLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

export function PercentageRange({
  value,
  onChange,
  label = 'Objetivo de porcentaje',
  description,
  currentLabel = 'Actual',
  targetLabel = 'Objetivo',
}: PercentageRangeProps) {
  const improvement = value.targetValue - value.currentValue;
  const improvementPercent = value.currentValue > 0
    ? ((improvement / value.currentValue) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="flex items-center justify-center gap-4">
        {/* Current Value */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5 text-center">
            {currentLabel}
          </label>
          <div className="relative">
            <input
              type="number"
              value={value.currentValue || ''}
              onChange={(e) => onChange({ ...value, currentValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              step="0.1"
              min="0"
              max="100"
              className="w-full text-center text-2xl font-bold py-3 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-gray-400 font-medium">
              %
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 pt-5">
          <ArrowRight className="w-6 h-6 text-green-500" />
          {improvement > 0 && (
            <span className="text-xs font-medium text-green-600">
              +{improvement.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Target Value */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5 text-center">
            {targetLabel}
          </label>
          <div className="relative">
            <input
              type="number"
              value={value.targetValue || ''}
              onChange={(e) => onChange({ ...value, targetValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              step="0.1"
              min="0"
              max="100"
              className={cn(
                'w-full text-center text-2xl font-bold py-3 px-4 border rounded-xl focus:outline-none focus:ring-2 bg-white',
                improvement > 0
                  ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400 text-green-700'
                  : 'border-gray-200 focus:ring-green-500/20 focus:border-green-400'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-gray-400 font-medium">
              %
            </span>
          </div>
        </div>
      </div>

      {/* Improvement indicator */}
      {improvement > 0 && (
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            <span className="font-semibold">+{improvementPercent}%</span> de mejora relativa
          </p>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      )}
    </div>
  );
}
