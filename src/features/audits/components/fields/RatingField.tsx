import { cn } from '@/utils/cn';
import type { MysteryShopperField } from '../../config/mysteryShopperSchema';

interface RatingFieldProps {
  field: MysteryShopperField;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * NPS-style rating field with numbered buttons (0-10 or 1-10)
 */
export function RatingField({ field, value, onChange, disabled }: RatingFieldProps) {
  const min = field.min ?? 0;
  const max = field.max ?? 10;
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Color coding for NPS-style ratings
  const getButtonColor = (score: number, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50';
    }

    // For 0-10 scale (NPS style)
    if (max === 10 && min === 0) {
      if (score <= 6) return 'bg-red-500 border-red-500 text-white'; // Detractors
      if (score <= 8) return 'bg-amber-500 border-amber-500 text-white'; // Passives
      return 'bg-green-500 border-green-500 text-white'; // Promoters
    }

    // For 1-10 scale
    if (max === 10 && min === 1) {
      if (score <= 4) return 'bg-red-500 border-red-500 text-white';
      if (score <= 6) return 'bg-amber-500 border-amber-500 text-white';
      if (score <= 8) return 'bg-blue-500 border-blue-500 text-white';
      return 'bg-green-500 border-green-500 text-white';
    }

    // Default primary color
    return 'bg-primary-500 border-primary-500 text-white';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {/* Rating buttons */}
      <div className="flex flex-wrap gap-1.5">
        {range.map((score) => {
          const isSelected = value === score;

          return (
            <button
              key={score}
              type="button"
              onClick={() => !disabled && onChange(score)}
              disabled={disabled}
              className={cn(
                'w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1',
                getButtonColor(score, isSelected),
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {score}
            </button>
          );
        })}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>{min === 0 ? 'Nada probable' : 'Muy malo'}</span>
        <span>{min === 0 ? 'Muy probable' : 'Excelente'}</span>
      </div>

      {/* Selected value display */}
      {value !== null && value !== undefined && (
        <p className="text-sm text-gray-600">
          Puntuación seleccionada: <span className="font-semibold">{value}</span>
        </p>
      )}
    </div>
  );
}
