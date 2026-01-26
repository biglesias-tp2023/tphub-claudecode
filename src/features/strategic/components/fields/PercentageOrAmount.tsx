/**
 * PercentageOrAmount - Toggle entre % / € / uds
 *
 * Usado para: Labor, Reducir incidencias, Pedidos cancelados
 */
import { ArrowRight, ToggleLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PercentageRangeData, ObjectiveUnit } from '@/types';

// ============================================
// TYPES
// ============================================

interface PercentageOrAmountProps {
  value: PercentageRangeData;
  onChange: (value: PercentageRangeData) => void;
  selectedUnit: ObjectiveUnit;
  onUnitChange: (unit: ObjectiveUnit) => void;
  allowedUnits: ObjectiveUnit[];
  label?: string;
  description?: string;
}

// ============================================
// HELPERS
// ============================================

const UNIT_LABELS: Record<ObjectiveUnit, string> = {
  '%': '%',
  'EUR': '€',
  'uds': 'uds',
  'min': 'min',
  'stars': '⭐',
  'email': '',
  'none': '',
};

const UNIT_NAMES: Record<ObjectiveUnit, string> = {
  '%': 'Porcentaje',
  'EUR': 'Euros',
  'uds': 'Unidades',
  'min': 'Minutos',
  'stars': 'Estrellas',
  'email': 'Email',
  'none': 'Sin unidad',
};

// ============================================
// COMPONENT
// ============================================

export function PercentageOrAmount({
  value,
  onChange,
  selectedUnit,
  onUnitChange,
  allowedUnits,
  label = 'Objetivo',
  description,
}: PercentageOrAmountProps) {
  const improvement = value.currentValue - value.targetValue; // For reduction goals
  const isReduction = improvement > 0;

  return (
    <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ToggleLeft className="w-5 h-5 text-violet-600" />
          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
          {allowedUnits.map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => onUnitChange(unit)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                selectedUnit === unit
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {UNIT_NAMES[unit]}
            </button>
          ))}
        </div>
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
              step={selectedUnit === '%' ? '0.1' : '1'}
              min="0"
              className="w-full text-center text-2xl font-bold py-3 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-medium">
              {UNIT_LABELS[selectedUnit]}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 pt-5">
          <ArrowRight className="w-6 h-6 text-violet-500" />
          {isReduction && (
            <span className="text-xs font-medium text-green-600">
              -{improvement.toFixed(selectedUnit === '%' ? 1 : 0)}{UNIT_LABELS[selectedUnit]}
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
              step={selectedUnit === '%' ? '0.1' : '1'}
              min="0"
              className={cn(
                'w-full text-center text-2xl font-bold py-3 px-4 border rounded-xl focus:outline-none focus:ring-2 bg-white',
                isReduction
                  ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400 text-green-700'
                  : 'border-gray-200 focus:ring-violet-500/20 focus:border-violet-400'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-medium">
              {UNIT_LABELS[selectedUnit]}
            </span>
          </div>
        </div>
      </div>

      {/* Reduction indicator */}
      {isReduction && (
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            Reducción de <span className="font-semibold">{improvement.toFixed(selectedUnit === '%' ? 1 : 0)}{UNIT_LABELS[selectedUnit]}</span>
          </p>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      )}
    </div>
  );
}
