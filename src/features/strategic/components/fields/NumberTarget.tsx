/**
 * NumberTarget - Valor numérico objetivo simple
 *
 * Usado para: Añadir combos, modificadores, upsellings, etc.
 */
import { Target, Hash } from 'lucide-react';
import { cn } from '@/utils/cn';

// ============================================
// TYPES
// ============================================

interface NumberTargetProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  description?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

// ============================================
// COMPONENT
// ============================================

export function NumberTarget({
  value,
  onChange,
  label = 'Cantidad objetivo',
  description,
  unit = 'uds',
  min = 0,
  max,
  step = 1,
  placeholder = '0',
}: NumberTargetProps) {
  return (
    <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-amber-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-[200px]">
          <div className="relative">
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className="w-full text-center text-4xl font-bold py-4 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-medium">
              {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Visual representation */}
      {value > 0 && value <= 10 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {Array.from({ length: Math.min(value, 10) }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-amber-100 text-amber-600'
              )}
            >
              <Hash className="w-4 h-4" />
            </div>
          ))}
        </div>
      )}

      {value > 10 && (
        <div className="mt-4 p-3 bg-amber-100 rounded-lg">
          <p className="text-sm text-amber-700 text-center font-medium">
            Objetivo: {value} {unit}
          </p>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-3 text-center">{description}</p>
      )}
    </div>
  );
}
