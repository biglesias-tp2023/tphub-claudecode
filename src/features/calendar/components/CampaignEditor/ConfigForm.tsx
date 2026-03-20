import { useState } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { getCampaignTypeConfig, type CampaignFieldConfig } from '../../config/platforms';
import { ProductSelector } from './ProductSelector';
import type { CampaignPlatform, CampaignConfig, Restaurant } from '@/types';

interface ConfigFormProps {
  platform: CampaignPlatform;
  campaignType: string;
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  /** Restaurant for fetching products */
  restaurant?: Restaurant | null;
  /** Selected product IDs */
  productIds?: string[];
  /** Callback when product selection changes */
  onProductIdsChange?: (ids: string[]) => void;
}

interface FieldProps {
  field: CampaignFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Full config for compound fields that need sibling values */
  config?: CampaignConfig;
  onConfigChange?: (updates: Record<string, unknown>) => void;
}

// ============================================
// RADIO OPTION BUTTON (reused by several fields)
// ============================================

function RadioOption({
  selected,
  onClick,
  label,
  description,
  recommended,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-start px-4 py-3 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">
          Recomendado
        </span>
      )}
      <span className={`text-sm font-medium ${selected ? 'text-green-800' : 'text-gray-900'}`}>
        {label}
      </span>
      {description && (
        <span className={`text-xs mt-0.5 ${selected ? 'text-green-600' : 'text-gray-500'}`}>
          {description}
        </span>
      )}
    </button>
  );
}

// ============================================
// FIELD COMPONENTS
// ============================================

function AudienceField({ field, value, onChange }: FieldProps) {
  const selected = value as string;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {field.options?.map(opt => (
          <RadioOption
            key={opt.value}
            selected={selected === opt.value}
            onClick={() => onChange(opt.value)}
            label={opt.label}
            description={opt.description}
            recommended={opt.recommended}
          />
        ))}
      </div>
    </div>
  );
}

function DurationPresetField({ field, value, config, onConfigChange }: FieldProps) {
  const selected = value as string;
  const isAds = field.variant === 'ads';
  const isHappyHour = field.variant === 'happy_hour';
  const [showSchedule, setShowSchedule] = useState(
    !!(config?.scheduleStartTime || config?.scheduleEndTime)
  );

  const presets: Array<{ value: string; label: string; description?: string; recommended?: boolean }> = isAds
    ? [
        { value: 'en_curso', label: 'En curso', description: 'Sin fecha de fin' },
        { value: '30_dias', label: '30 dias' },
        { value: '45_dias', label: '45 dias' },
        { value: 'personalizar', label: 'Personalizar' },
      ]
    : [
        { value: '1_año', label: '1 ano', recommended: true },
        { value: '6_meses', label: '6 meses' },
        { value: 'personalizar', label: 'Personalizar' },
      ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {presets.map(p => (
          <RadioOption
            key={p.value}
            selected={selected === p.value}
            onClick={() => onConfigChange?.({ durationPreset: p.value })}
            label={p.label}
            description={p.description}
            recommended={p.recommended}
          />
        ))}
      </div>

      {/* Schedule time (optional for promos, pre-set for happy hour) */}
      <div className="mt-3">
        {!isHappyHour && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showSchedule}
              onChange={(e) => {
                setShowSchedule(e.target.checked);
                if (!e.target.checked) {
                  onConfigChange?.({ scheduleDays: undefined, scheduleStartTime: undefined, scheduleEndTime: undefined });
                }
              }}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Especificar horario del dia
          </label>
        )}

        {(showSchedule || isHappyHour) && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-gray-500">Desde</label>
                <Input
                  type="time"
                  value={config?.scheduleStartTime || (isHappyHour ? '14:00' : '')}
                  onChange={(e) => onConfigChange?.({ scheduleStartTime: e.target.value })}
                  className="w-28"
                />
              </div>
              <span className="text-gray-400 mt-4">—</span>
              <div>
                <label className="text-xs text-gray-500">Hasta</label>
                <Input
                  type="time"
                  value={config?.scheduleEndTime || (isHappyHour ? '17:00' : '')}
                  onChange={(e) => onConfigChange?.({ scheduleEndTime: e.target.value })}
                  className="w-28"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dias activos</label>
              <div className="flex gap-1">
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => {
                  const days = (config?.scheduleDays as string[]) || ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = active ? days.filter(d => d !== day) : [...days, day];
                        onConfigChange?.({ scheduleDays: next });
                      }}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        active
                          ? 'bg-green-100 border-green-400 text-green-800'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WeeklySpendField({ field, value, onChange }: FieldProps) {
  const hasLimit = value !== null && value !== undefined;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
      <div className="flex flex-col gap-2">
        <RadioOption
          selected={!hasLimit}
          onClick={() => onChange(null)}
          label="Sin limite"
          description="La promo se aplica sin tope de gasto semanal"
        />
        <RadioOption
          selected={hasLimit}
          onClick={() => onChange(value || 100)}
          label="Establecer limite semanal"
        />
        {hasLimit && (
          <div className="flex items-center gap-2 ml-6">
            <Input
              type="number"
              value={value as number}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 100)}
              min={1}
              step="1"
              className="w-28"
            />
            <span className="text-sm text-gray-500">€/semana</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AdBudgetField({ field, value, onChange }: FieldProps) {
  const numValue = value as number;
  const presets = field.options || [];
  const isCustom = numValue != null && !presets.some(o => Number(o.value) === numValue);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {presets.map(opt => (
          <RadioOption
            key={opt.value}
            selected={numValue === Number(opt.value) && !isCustom}
            onClick={() => onChange(Number(opt.value))}
            label={opt.label}
            recommended={opt.recommended}
          />
        ))}
        <RadioOption
          selected={isCustom}
          onClick={() => onChange(numValue || 10)}
          label="Personalizado"
        />
      </div>
      {isCustom && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            value={numValue}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            step="1"
            className="w-28"
          />
          <span className="text-sm text-gray-500">€/dia</span>
        </div>
      )}
    </div>
  );
}

function CheckboxField({ field, value, onChange }: FieldProps) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
      />
      <div>
        <span className="text-sm font-medium text-gray-900">{field.label}</span>
        <p className="text-xs text-gray-500">
          Uber Eats ajusta automaticamente el descuento para maximizar pedidos
        </p>
      </div>
    </label>
  );
}

function FlatOffPairsField({ field, value, onChange }: FieldProps) {
  const pairs = field.pairs || [];
  const current = value as { spend: number; save: number } | undefined;
  const isCustom = current != null && !pairs.some(p => p.spend === current.spend && p.save === current.save);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {pairs.map((p, i) => (
          <RadioOption
            key={i}
            selected={!isCustom && current?.spend === p.spend && current?.save === p.save}
            onClick={() => onChange({ spend: p.spend, save: p.save })}
            label={`Gasta ${p.spend} €, ahorra ${p.save} €`}
          />
        ))}
        <RadioOption
          selected={isCustom}
          onClick={() => onChange({ spend: current?.spend || 20, save: current?.save || 5 })}
          label="Personalizado"
        />
      </div>
      {isCustom && (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Gasta</span>
            <Input
              type="number"
              value={current?.spend || ''}
              onChange={(e) => onChange({ spend: Number(e.target.value) || 0, save: current?.save || 0 })}
              min={1}
              className="w-20"
            />
            <span className="text-sm text-gray-500">€</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Ahorra</span>
            <Input
              type="number"
              value={current?.save || ''}
              onChange={(e) => onChange({ spend: current?.spend || 0, save: Number(e.target.value) || 0 })}
              min={1}
              className="w-20"
            />
            <span className="text-sm text-gray-500">€</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PercentRadioField({ field, value, onChange }: FieldProps) {
  const numValue = value as number;
  const options = field.options || [];
  const isCustom = numValue != null && !options.some(o => Number(o.value) === numValue);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <RadioOption
            key={opt.value}
            selected={numValue === Number(opt.value) && !isCustom}
            onClick={() => onChange(Number(opt.value))}
            label={opt.label}
            recommended={opt.recommended}
          />
        ))}
        <RadioOption
          selected={isCustom}
          onClick={() => onChange(numValue || 25)}
          label="Personalizado"
        />
      </div>
      {isCustom && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            value={numValue}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={field.min || 1}
            max={field.max || 100}
            className="w-24"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      )}
    </div>
  );
}

function CurrencyRadioField({ field, value, onChange }: FieldProps) {
  const numValue = value as number;
  const options = field.options || [];
  const isCustom = numValue != null && !options.some(o => Number(o.value) === numValue);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <RadioOption
            key={opt.value}
            selected={numValue === Number(opt.value) && !isCustom}
            onClick={() => onChange(Number(opt.value))}
            label={opt.label}
            recommended={opt.recommended}
          />
        ))}
        <RadioOption
          selected={isCustom}
          onClick={() => onChange(numValue || 10)}
          label="Personalizado"
        />
      </div>
      {isCustom && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            value={numValue}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={field.min || 0}
            step="0.5"
            className="w-24"
          />
          <span className="text-sm text-gray-500">€</span>
        </div>
      )}
    </div>
  );
}

function RadioField({ field, value, onChange }: FieldProps) {
  const selected = value as string;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {field.options?.map(opt => (
          <RadioOption
            key={opt.value}
            selected={selected === opt.value}
            onClick={() => onChange(opt.value)}
            label={opt.label}
            description={opt.description}
            recommended={opt.recommended}
          />
        ))}
      </div>
    </div>
  );
}

function InfoTextField({ field }: { field: CampaignFieldConfig }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800">{field.infoText}</p>
    </div>
  );
}

// ============================================
// GLOVO-SPECIFIC FIELD COMPONENTS
// ============================================

function OrderTargetField({ field, value, onChange }: FieldProps) {
  const numValue = value as number;
  const presets = field.options || [];
  const isCustom = numValue != null && !presets.some(o => Number(o.value) === numValue);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {presets.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(Number(opt.value))}
            className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
              numValue === Number(opt.value) && !isCustom
                ? 'border-amber-500 bg-amber-50 text-amber-800'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(numValue || 10)}
          className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
            isCustom
              ? 'border-amber-500 bg-amber-50 text-amber-800'
              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
          }`}
        >
          Personalizar
        </button>
      </div>
      {isCustom && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            value={numValue}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            max={100}
            className="w-28"
          />
          <span className="text-sm text-gray-500">pedidos</span>
        </div>
      )}
    </div>
  );
}

function PrimeToggleField({ field, value, onChange }: FieldProps) {
  const isActive = value !== false && value !== undefined && value !== null;
  const selectedValue = isActive ? Number(value) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
        <div>
          <span className="text-sm font-medium text-gray-900">{field.label}</span>
          <p className="text-xs text-gray-500">Ofrece un descuento extra a usuarios Glovo Prime</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(isActive ? false : 5)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isActive ? 'bg-amber-500' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isActive ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
      {isActive && field.options && (
        <div className="flex gap-2 ml-4">
          {field.options.map(opt => (
            <RadioOption
              key={opt.value}
              selected={selectedValue === Number(opt.value)}
              onClick={() => onChange(Number(opt.value))}
              label={opt.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DaySelectorField({ field, value, onChange }: FieldProps) {
  const days = (value as string[]) || (field.defaultValue as string[]) || [];
  const allDays = [
    { value: 'mon', label: 'L' }, { value: 'tue', label: 'M' },
    { value: 'wed', label: 'X' }, { value: 'thu', label: 'J' },
    { value: 'fri', label: 'V' }, { value: 'sat', label: 'S' },
    { value: 'sun', label: 'D' },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-1.5">
        {allDays.map(day => {
          const active = days.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => {
                const next = active ? days.filter(d => d !== day.value) : [...days, day.value];
                onChange(next.length > 0 ? next : [day.value]);
              }}
              className={`w-9 h-9 rounded-full text-sm font-medium border-2 transition-all ${
                active
                  ? 'bg-amber-100 border-amber-400 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BudgetLimitField({ field, value, onChange }: FieldProps) {
  const hasLimit = value !== null && value !== undefined;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
      <div className="flex flex-col gap-2">
        <RadioOption
          selected={!hasLimit}
          onClick={() => onChange(null)}
          label="Sin limite de presupuesto"
        />
        <RadioOption
          selected={hasLimit}
          onClick={() => onChange(value || 100)}
          label="Personalizar"
        />
        {hasLimit && (
          <div className="flex items-center gap-2 ml-6">
            <Input
              type="number"
              value={value as number}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 100)}
              min={1}
              step="1"
              className="w-28"
            />
            <span className="text-sm text-gray-500">€</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DateField({ field, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type="date"
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-48"
      />
    </div>
  );
}

// ============================================
// JUST EAT-SPECIFIC FIELD COMPONENTS
// ============================================

function StepperNumberField({ field, value, onChange }: FieldProps) {
  const numValue = (value as number) ?? (field.defaultValue as number) ?? 0;
  const stepVal = field.step || 1;
  const minVal = field.min ?? 0;
  const maxVal = field.max ?? Infinity;

  const decrement = () => {
    const next = Math.max(minVal, numValue - stepVal);
    onChange(Math.round(next * 100) / 100);
  };
  const increment = () => {
    const next = Math.min(maxVal, numValue + stepVal);
    onChange(Math.round(next * 100) / 100);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={decrement}
          disabled={numValue <= minVal}
          className="w-10 h-10 rounded-lg border-2 border-gray-200 bg-white text-gray-600 text-lg font-bold flex items-center justify-center hover:border-orange-400 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
        >
          −
        </button>
        <Input
          type="number"
          value={numValue}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : minVal;
            onChange(Math.max(minVal, Math.min(maxVal, v)));
          }}
          min={minVal}
          max={maxVal !== Infinity ? maxVal : undefined}
          step={stepVal}
          className="w-24 text-center"
        />
        <button
          type="button"
          onClick={increment}
          disabled={numValue >= maxVal}
          className="w-10 h-10 rounded-lg border-2 border-gray-200 bg-white text-gray-600 text-lg font-bold flex items-center justify-center hover:border-orange-400 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
        >
          +
        </button>
        {field.suffix && (
          <span className="text-sm text-gray-500 ml-1">{field.suffix}</span>
        )}
      </div>
    </div>
  );
}

function ScheduleDaysField({ field, value, onChange, config, onConfigChange }: FieldProps) {
  const selected = (value as string) || 'every_day';
  const customDays = (config?.jeCustomDays as string[]) || [];
  const allDayOptions = [
    { value: 'mon', label: 'Lunes' }, { value: 'tue', label: 'Martes' },
    { value: 'wed', label: 'Miercoles' }, { value: 'thu', label: 'Jueves' },
    { value: 'fri', label: 'Viernes' }, { value: 'sat', label: 'Sabado' },
    { value: 'sun', label: 'Domingo' },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {field.options?.map(opt => (
          <RadioOption
            key={opt.value}
            selected={selected === opt.value}
            onClick={() => onChange(opt.value)}
            label={opt.label}
          />
        ))}
      </div>
      {selected === 'custom' && (
        <div className="flex flex-wrap gap-1.5 mt-2 p-3 bg-gray-50 rounded-lg">
          {allDayOptions.map(day => {
            const active = customDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  const next = active
                    ? customDays.filter(d => d !== day.value)
                    : [...customDays, day.value];
                  onConfigChange?.({ jeCustomDays: next.length > 0 ? next : [day.value] });
                }}
                className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors ${
                  active
                    ? 'bg-orange-100 border-orange-400 text-orange-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleHoursField({ field, value, onChange, config, onConfigChange }: FieldProps) {
  const selected = (value as string) || 'all_hours';

  // Generate 30-min intervals
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {field.options?.map(opt => (
          <RadioOption
            key={opt.value}
            selected={selected === opt.value}
            onClick={() => onChange(opt.value)}
            label={opt.label}
          />
        ))}
      </div>
      {selected === 'selected_hours' && (
        <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="text-xs text-gray-500">Desde</label>
            <select
              value={(config?.jeHoursStart as string) || '11:00'}
              onChange={(e) => onConfigChange?.({ jeHoursStart: e.target.value })}
              className="block w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <span className="text-gray-400 mt-4">—</span>
          <div>
            <label className="text-xs text-gray-500">Hasta</label>
            <select
              value={(config?.jeHoursEnd as string) || '23:00'}
              onChange={(e) => onConfigChange?.({ jeHoursEnd: e.target.value })}
              className="block w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function RadioWithCustomInputField({ field, value, onChange, config, onConfigChange }: FieldProps) {
  const selected = value as string;
  const isCustomValue = selected === 'custom';
  const customKey = `${field.key}_custom`;
  const customValue = config?.[customKey] as number | undefined;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {field.options?.map(opt => (
          <RadioOption
            key={opt.value}
            selected={selected === opt.value}
            onClick={() => onChange(opt.value)}
            label={opt.label}
            description={opt.description}
            recommended={opt.recommended}
          />
        ))}
      </div>
      {isCustomValue && field.customInput && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            value={customValue ?? ''}
            onChange={(e) => onConfigChange?.({ [customKey]: e.target.value ? Number(e.target.value) : undefined })}
            min={field.customInput.min}
            step={field.customInput.step}
            placeholder={field.customInput.placeholder}
            className="w-28"
          />
          {field.customInput.suffix && (
            <span className="text-sm text-gray-500">{field.customInput.suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN CONFIGFIELD SWITCH
// ============================================

function ConfigField({ field, value, onChange, config, onConfigChange }: FieldProps) {
  switch (field.type) {
    case 'audience':
      return <AudienceField field={field} value={value} onChange={onChange} />;

    case 'duration_preset':
      return <DurationPresetField field={field} value={value} onChange={onChange} config={config} onConfigChange={onConfigChange} />;

    case 'weekly_spend':
      return <WeeklySpendField field={field} value={value} onChange={onChange} />;

    case 'ad_budget':
      return <AdBudgetField field={field} value={value} onChange={onChange} />;

    case 'checkbox':
      return <CheckboxField field={field} value={value} onChange={onChange} />;

    case 'flat_off_pairs':
      return <FlatOffPairsField field={field} value={value} onChange={onChange} />;

    case 'percent_radio':
      return <PercentRadioField field={field} value={value} onChange={onChange} />;

    case 'currency_radio':
      return <CurrencyRadioField field={field} value={value} onChange={onChange} />;

    case 'radio':
      if (field.customInput) {
        return <RadioWithCustomInputField field={field} value={value} onChange={onChange} config={config} onConfigChange={onConfigChange} />;
      }
      return <RadioField field={field} value={value} onChange={onChange} />;

    case 'info_text':
      return <InfoTextField field={field} />;

    // Glovo-specific field types
    case 'order_target':
      return <OrderTargetField field={field} value={value} onChange={onChange} />;

    case 'prime_toggle':
      return <PrimeToggleField field={field} value={value} onChange={onChange} />;

    case 'day_selector':
      return <DaySelectorField field={field} value={value} onChange={onChange} />;

    case 'budget_limit':
      return <BudgetLimitField field={field} value={value} onChange={onChange} />;

    case 'date':
      return <DateField field={field} value={value} onChange={onChange} />;

    // Just Eat-specific field types
    case 'stepper_number':
      return <StepperNumberField field={field} value={value} onChange={onChange} />;

    case 'schedule_days':
      return <ScheduleDaysField field={field} value={value} onChange={onChange} config={config} onConfigChange={onConfigChange} />;

    case 'schedule_hours':
      return <ScheduleHoursField field={field} value={value} onChange={onChange} config={config} onConfigChange={onConfigChange} />;

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value as number || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              className="w-32"
            />
            {field.suffix && (
              <span className="text-sm text-gray-500">{field.suffix}</span>
            )}
          </div>
        </div>
      );

    case 'percent': {
      const minVal = field.min || 5;
      const maxVal = field.max || 50;
      const step = 5;
      const options: number[] = [];
      for (let i = minVal; i <= maxVal; i += step) {
        options.push(i);
      }

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={value as number || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Seleccionar</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}%</option>
            ))}
          </select>
        </div>
      );
    }

    case 'currency':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value as number || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
              min={field.min || 0}
              step="0.01"
              placeholder={field.placeholder}
              className="w-32"
            />
            <span className="text-sm text-gray-500">EUR</span>
          </div>
        </div>
      );

    case 'time':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Input
            type="time"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-32"
          />
        </div>
      );

    case 'keywords':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Input
            type="text"
            value={(value as string[] || []).join(', ')}
            onChange={(e) => {
              const keywords = e.target.value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
              onChange(keywords);
            }}
            placeholder="pizza, hamburguesa, comida rapida"
            className="w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Separa las palabras clave con comas
          </p>
        </div>
      );

    case 'target_customers': {
      const minVal = field.min || 3;
      const maxVal = field.max || 15;
      const options: number[] = [];
      for (let i = minVal; i <= maxVal; i++) {
        options.push(i);
      }

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={value as number || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Seleccionar target</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt} nuevos clientes/dia</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Selecciona cuantos nuevos clientes quieres conseguir por dia
          </p>
        </div>
      );
    }

    case 'product':
    case 'products':
      // Product selection is handled separately by ProductSelector component
      return null;

    default:
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <Input
            type="text"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

export function ConfigForm({
  platform,
  campaignType,
  config,
  onChange,
  restaurant,
  productIds = [],
  onProductIdsChange,
}: ConfigFormProps) {
  const typeConfig = getCampaignTypeConfig(platform, campaignType);

  if (!typeConfig) {
    return (
      <div className="text-center py-8 text-gray-500">
        Tipo de campaña no reconocido
      </div>
    );
  }

  // Filter out product fields (handled with ProductSelector)
  const configFields = typeConfig.fields.filter(f => f.type !== 'product' && f.type !== 'products');
  const productFields = typeConfig.fields.filter(f => f.type === 'product' || f.type === 'products');

  const handleFieldChange = (key: string, value: unknown) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  const handleMultiFieldChange = (updates: Record<string, unknown>) => {
    onChange({
      ...config,
      ...updates,
    });
  };

  // Check if this is a flash offer (has fixed 30% discount)
  const isFlashOffer = campaignType === 'flash_offer' && platform === 'glovo';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configuracion de {typeConfig.label}
        </h3>
        <p className="text-sm text-gray-500">{typeConfig.description}</p>
      </div>

      {/* Flash offer fixed discount info */}
      {isFlashOffer && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-amber-700">30%</span>
            <span className="text-sm font-medium text-amber-700">descuento</span>
          </div>
          <p className="text-sm text-amber-600">
            El descuento del 30% para nuevos clientes viene configurado por defecto en las Ofertas Flash de Glovo.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {configFields.map((field, idx) => {
          // Dependency: skip field if dependsOn condition not met
          if (field.dependsOn && field.showWhen) {
            const siblingValue = config[field.dependsOn as keyof CampaignConfig];
            if (siblingValue !== field.showWhen) return null;
          }

          // For radio timeSlot=custom: show time pickers inline
          const showTimeSlotPickers = field.key === 'timeSlot' && config.timeSlot === 'custom';

          return (
            <div key={`${field.key}-${idx}`}>
              <ConfigField
                field={field}
                value={config[field.key as keyof CampaignConfig]}
                onChange={(value) => handleFieldChange(field.key, value)}
                config={config}
                onConfigChange={handleMultiFieldChange}
              />
              {showTimeSlotPickers && (
                <div className="flex items-center gap-3 mt-2 ml-4">
                  <div>
                    <label className="text-xs text-gray-500">Desde</label>
                    <Input
                      type="time"
                      value={(config.timeSlotStart as string) || ''}
                      onChange={(e) => handleFieldChange('timeSlotStart', e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <span className="text-gray-400 mt-4">—</span>
                  <div>
                    <label className="text-xs text-gray-500">Hasta</label>
                    <Input
                      type="time"
                      value={(config.timeSlotEnd as string) || ''}
                      onChange={(e) => handleFieldChange('timeSlotEnd', e.target.value)}
                      className="w-28"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product selection */}
      {productFields.length > 0 && restaurant && onProductIdsChange && (
        <div className="border-t border-gray-200 pt-6">
          {productFields.map(field => (
            <ProductSelector
              key={field.key}
              companyId={restaurant.companyId}
              platform={platform}
              multiple={field.type === 'products'}
              selectedIds={productIds}
              onChange={onProductIdsChange}
              addressId={restaurant.id}
              label={field.label}
              required={field.required}
            />
          ))}
        </div>
      )}

      {/* Warning if no restaurant selected */}
      {productFields.length > 0 && !restaurant && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Selecciona un establecimiento para ver los productos disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
