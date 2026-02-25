/**
 * SalesScorecard - Scorecard and tooltip row sub-components for SalesProjection
 *
 * Internal sub-component -- not part of the public barrel export.
 *
 * @module features/strategic/components/SalesScorecard
 */
import { cn } from '@/utils/cn';
import { fmtK, fmt } from './salesProjectionTypes';

// ============================================
// Scorecard
// ============================================

interface ScorecardProps {
  label: string;
  value: number;
  actual: number;
  color: string;
  showActual: boolean;
  isLoading?: boolean;
  isRealData?: boolean;
  isInvestment?: boolean;
}

/** Scorecard individual con objetivo y real */
export function Scorecard({
  label, value, actual, color, showActual, isLoading = false, isRealData = false, isInvestment = false
}: ScorecardProps) {
  const diff = actual > 0 && value > 0
    ? ((actual / value - 1) * 100).toFixed(0)
    : null;

  const isPositive = diff ? parseFloat(diff) >= 0 : false;
  const diffText = isInvestment
    ? (isPositive ? `+${diff}% sobre obj` : `${Math.abs(parseFloat(diff || '0'))}% bajo obj`)
    : (isPositive ? `+${diff}% vs obj` : `${diff}% vs obj`);
  const diffColor = isInvestment
    ? (isPositive ? 'text-red-500' : 'text-emerald-600')
    : (isPositive ? 'text-emerald-600' : 'text-amber-600');

  const hasActual = showActual && actual > 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        {isRealData && hasActual && (
          <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            Real
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        {isLoading ? (
          <span className="text-xl text-gray-400 animate-pulse">cargando...</span>
        ) : hasActual ? (
          <>
            <p className={cn('text-xl font-bold tabular-nums', color)}>{fmtK(actual)}€</p>
            <p className="text-sm font-medium tabular-nums text-gray-400">/ {fmtK(value)}€</p>
          </>
        ) : (
          <p className={cn('text-xl font-bold tabular-nums', color)}>{fmtK(value)}€</p>
        )}
      </div>
      {!isLoading && hasActual && diff && (
        <p className={cn('text-[10px] mt-0.5', diffColor)}>{diffText}</p>
      )}
    </div>
  );
}

// ============================================
// Row (tooltip helper)
// ============================================

interface RowProps {
  label: string;
  value: number;
  color: string;
}

/** Row used inside chart tooltip */
export function Row({ label, value, color }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-gray-500">{label}</span>
      <span className={cn('font-medium tabular-nums', color)}>{fmt(value)}€</span>
    </div>
  );
}
