import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </p>
      {sub && sub !== '—' && (
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

export function HeroKpi({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-center',
        positive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      )}
    >
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          positive ? 'text-emerald-700' : 'text-red-700'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export interface WaterfallLine {
  label: string;
  value: number;
  type: 'income' | 'deduction' | 'subtotal' | 'result';
}

export function WaterfallBreakdown({ lines }: { lines: WaterfallLine[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Desglose del margen
      </h3>
      <div className="space-y-0">
        {lines.map((line, idx) => {
          const isResult = line.type === 'result';
          const isSubtotal = line.type === 'subtotal';
          const isDeduction = line.type === 'deduction';

          const valueColor = isResult
            ? line.value >= 0
              ? 'text-emerald-700 font-bold'
              : 'text-red-700 font-bold'
            : isSubtotal
              ? 'text-gray-900 font-semibold'
              : isDeduction
                ? 'text-red-500'
                : 'text-gray-700';

          const labelColor = isResult || isSubtotal
            ? 'text-gray-900 font-semibold'
            : isDeduction
              ? 'text-gray-500'
              : 'text-gray-700';

          const prefix = isDeduction ? '− ' : isSubtotal ? '= ' : isResult ? '= ' : '';

          return (
            <div key={idx}>
              {isResult && (
                <div className="border-t-2 border-gray-300 my-1.5" />
              )}
              <div
                className={cn(
                  'flex items-center justify-between py-1.5 px-2 rounded',
                  isResult && (line.value >= 0 ? 'bg-emerald-50' : 'bg-red-50'),
                )}
              >
                <span className={cn('text-sm', labelColor)}>
                  {prefix}{line.label}
                </span>
                <span className={cn('text-sm tabular-nums', valueColor)}>
                  {isDeduction && line.value !== 0 ? `−${eur(Math.abs(line.value))}` : eur(line.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const eur = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);

export const pct = (v: number) => `${v.toFixed(1)}%`;

export const INPUT_CLASS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
