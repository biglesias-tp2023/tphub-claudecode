import type { ReactNode } from 'react';

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

export const eur = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);

export const pct = (v: number) => `${v.toFixed(1)}%`;

export const INPUT_CLASS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
