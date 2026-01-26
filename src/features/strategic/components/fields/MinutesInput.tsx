/**
 * MinutesInput - Input de minutos con actual → objetivo
 *
 * Usado para: Tiempos de preparación, Tiempo espera repartidor
 */
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PercentageRangeData } from '@/types';

// ============================================
// TYPES
// ============================================

interface MinutesInputProps {
  value: PercentageRangeData;
  onChange: (value: PercentageRangeData) => void;
  label?: string;
  description?: string;
}

// ============================================
// COMPONENT
// ============================================

export function MinutesInput({
  value,
  onChange,
  label = 'Tiempo objetivo',
  description,
}: MinutesInputProps) {
  const reduction = value.currentValue - value.targetValue;
  const isReduction = reduction > 0;
  const reductionPercent = value.currentValue > 0
    ? ((reduction / value.currentValue) * 100).toFixed(0)
    : '0';

  return (
    <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-sky-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="flex items-center justify-center gap-4">
        {/* Current Value */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5 text-center">
            Actual
          </label>
          <div className="relative">
            <input
              type="number"
              value={value.currentValue || ''}
              onChange={(e) => onChange({ ...value, currentValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              className="w-full text-center text-2xl font-bold py-3 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
              min
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 pt-5">
          <ArrowRight className="w-6 h-6 text-sky-500" />
          {isReduction && (
            <span className="text-xs font-medium text-green-600">
              -{reduction} min
            </span>
          )}
        </div>

        {/* Target Value */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5 text-center">
            Objetivo
          </label>
          <div className="relative">
            <input
              type="number"
              value={value.targetValue || ''}
              onChange={(e) => onChange({ ...value, targetValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              className={cn(
                'w-full text-center text-2xl font-bold py-3 px-4 border rounded-xl focus:outline-none focus:ring-2 bg-white',
                isReduction
                  ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400 text-green-700'
                  : 'border-gray-200 focus:ring-sky-500/20 focus:border-sky-400'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
              min
            </span>
          </div>
        </div>
      </div>

      {/* Reduction indicator */}
      {isReduction && (
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            <span className="font-semibold">-{reductionPercent}%</span> de reducción
            <span className="text-gray-600 ml-1">({reduction} minutos menos)</span>
          </p>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      )}
    </div>
  );
}
