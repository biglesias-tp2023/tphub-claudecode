import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MarginCalculatorFieldProps {
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  companyCommissions: { glovo: number | null; ubereats: number | null };
}

export function MarginCalculatorField({
  fieldData,
  onFieldChange,
  disabled,
  companyCommissions,
}: MarginCalculatorFieldProps) {
  const feeGlovo = companyCommissions.glovo != null
    ? Math.round(companyCommissions.glovo * 100)
    : null;
  const feeUbereats = companyCommissions.ubereats != null
    ? Math.round(companyCommissions.ubereats * 100)
    : null;

  const feeJusteat = (fieldData.commission_justeat as number) ?? 0;
  const investmentAds = (fieldData.investment_ads as number) ?? 0;
  const investmentPromos = (fieldData.investment_promos as number) ?? 0;

  const activeFees = useMemo(
    () =>
      [
        { name: 'Glovo', value: feeGlovo },
        { name: 'UberEats', value: feeUbereats },
        { name: 'JustEat', value: feeJusteat },
      ].filter((f) => f.value != null && f.value > 0),
    [feeGlovo, feeUbereats, feeJusteat]
  );

  const avgFee =
    activeFees.length > 0
      ? activeFees.reduce((a, b) => a + b.value!, 0) / activeFees.length
      : 0;

  const margin = useMemo(
    () => Math.round((100 - avgFee - investmentAds - investmentPromos) * 100) / 100,
    [avgFee, investmentAds, investmentPromos]
  );

  const marginColor =
    margin >= 20
      ? 'text-green-700 bg-green-50 border-green-200'
      : margin >= 10
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">
        Comisiones y Margen
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Fee Glovo - locked */}
        <LockedBox label="Fee Glovo" value={feeGlovo} />

        {/* Fee UberEats - locked */}
        <LockedBox label="Fee UberEats" value={feeUbereats} />

        {/* Fee JustEat - editable */}
        <EditableBox
          label="Fee JustEat"
          value={feeJusteat}
          onChange={(v) => onFieldChange('commission_justeat', v)}
          disabled={disabled}
        />

        {/* Inv. ADS % - editable */}
        <EditableBox
          label="Inv. ADS %"
          value={investmentAds}
          onChange={(v) => onFieldChange('investment_ads', v)}
          disabled={disabled}
        />

        {/* Inv. Promos % - editable */}
        <EditableBox
          label="Inv. Promos %"
          value={investmentPromos}
          onChange={(v) => onFieldChange('investment_promos', v)}
          disabled={disabled}
        />

        {/* = Margen - calculated */}
        <div
          className={cn(
            'rounded-lg border p-3 text-center',
            marginColor
          )}
        >
          <span className="block text-xs font-medium mb-1 opacity-70">
            = Margen
          </span>
          <span className="text-xl font-bold tabular-nums">
            {margin}%
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {'ℹ️ '}
        {activeFees.length > 0
          ? `Comisión media de ${activeFees.length} plataforma${activeFees.length > 1 ? 's' : ''} activa${activeFees.length > 1 ? 's' : ''} (${activeFees.map((f) => `${f.name} ${f.value}%`).join(', ')}) = ${Math.round(avgFee * 100) / 100}%`
          : 'Sin plataformas activas'}
      </p>
    </div>
  );
}

function LockedBox({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center relative">
      <Lock className="w-3 h-3 text-gray-400 absolute top-2 right-2" />
      <span className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </span>
      <span className="text-xl font-bold text-gray-700 tabular-nums">
        {value != null ? `${value}%` : '—'}
      </span>
    </div>
  );
}

function EditableBox({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <span className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? 0 : parseFloat(v));
          }}
          disabled={disabled}
          step="any"
          className={cn(
            'w-full text-center text-xl font-bold rounded-md border px-2 py-1 tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            disabled
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-900'
          )}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          %
        </span>
      </div>
    </div>
  );
}
