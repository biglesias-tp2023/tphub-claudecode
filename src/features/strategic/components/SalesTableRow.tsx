/**
 * SalesTableRow - Editable table row sub-component for SalesProjection
 *
 * Internal sub-component -- not part of the public barrel export.
 *
 * @module features/strategic/components/SalesTableRow
 */
import { cn } from '@/utils/cn';
import { fmt } from './salesProjectionTypes';
import type { MonthInfo } from './salesProjectionTypes';
import type { SalesChannel, GridChannelMonthData } from '@/types';

interface SalesTableRowProps {
  label: string;
  logoUrl: string;
  months: MonthInfo[];
  values: GridChannelMonthData;
  channel: SalesChannel;
  onChange?: (month: string, val: string) => void;
  total: number;
  variant: 'target' | 'actual';
  readOnly?: boolean;
}

/** Fila de tabla editable */
export function SalesTableRow({
  label, logoUrl, months, values, channel, onChange, total, variant, readOnly,
}: SalesTableRowProps) {
  const isActual = variant === 'actual';

  return (
    <tr className={cn(isActual && 'bg-emerald-50/30')}>
      <td className="py-1.5 pr-2">
        <div className="flex items-center gap-1.5">
          <img src={logoUrl} alt={label} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          <span className="text-xs text-gray-600 whitespace-nowrap">{label}</span>
          {isActual && <span className="text-[9px] text-emerald-600 font-medium">(real)</span>}
        </div>
      </td>
      {months.map((m) => (
        <td key={m.key} className={cn('py-0.5 px-0.5', m.isCurrent && 'bg-primary-50')}>
          {readOnly ? (
            <div className={cn('w-full text-center text-xs py-1.5 px-1 tabular-nums', isActual ? 'text-emerald-700 font-medium' : 'text-gray-700')}>
              {fmt(values[m.key]?.[channel] || 0)}
            </div>
          ) : (
            <input
              type="number"
              value={values[m.key]?.[channel] || ''}
              onChange={(e) => onChange?.(m.key, e.target.value)}
              placeholder="0"
              className={cn(
                'w-full text-center text-xs py-1.5 px-0.5 border rounded tabular-nums focus:outline-none focus:ring-1',
                isActual ? 'border-emerald-200 focus:ring-emerald-300 bg-white' : 'border-gray-200 focus:ring-primary-300 bg-white',
                m.isCurrent && 'ring-1 ring-primary-300'
              )}
            />
          )}
        </td>
      ))}
      <td className="py-1.5 pl-2 text-right">
        <span className={cn('text-xs font-semibold tabular-nums', isActual ? 'text-emerald-600' : 'text-gray-800')}>
          {fmt(total)}€
        </span>
      </td>
    </tr>
  );
}
