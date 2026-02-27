import { Settings, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';

interface GlobalThresholds {
  orders: number;
  reviews: number;
  adsRoas: number;
  promos: number;
}

interface CompanyAlertCardProps {
  companyId: string;
  companyName: string;
  consultantId: string;
  pref: AlertPreferenceInput;
  isTracking: boolean;
  expanded: boolean;
  globalThresholds: GlobalThresholds;
  onToggle: () => void;
  onExpandToggle: () => void;
  onPrefChange: (pref: AlertPreferenceInput) => void;
}

const CATEGORIES = [
  { key: 'orders' as const, enabledKey: 'ordersEnabled' as const, thresholdKey: 'ordersThreshold' as const, label: 'Pedidos', suffix: '%', globalKey: 'orders' as const },
  { key: 'reviews' as const, enabledKey: 'reviewsEnabled' as const, thresholdKey: 'reviewsThreshold' as const, label: 'Resenas', suffix: '', globalKey: 'reviews' as const },
  { key: 'ads' as const, enabledKey: 'adsEnabled' as const, thresholdKey: 'adsRoasThreshold' as const, label: 'Ads', suffix: 'x', globalKey: 'adsRoas' as const },
  { key: 'promos' as const, enabledKey: 'promosEnabled' as const, thresholdKey: 'promosThreshold' as const, label: 'Promos', suffix: '%', globalKey: 'promos' as const },
] as const;

export function CompanyAlertCard({
  companyName,
  pref,
  isTracking,
  expanded,
  globalThresholds,
  onToggle,
  onExpandToggle,
  onPrefChange,
}: CompanyAlertCardProps) {

  const updatePref = (partial: Partial<AlertPreferenceInput>) => {
    onPrefChange({ ...pref, ...partial });
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 transition-all',
      expanded && 'ring-1 ring-primary-200'
    )}>
      {/* Compact row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Glow dot */}
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            isTracking
              ? 'bg-green-500 animate-pulse-glow'
              : 'bg-red-500'
          )}
        />

        {/* Company name */}
        <span className="font-medium text-gray-900 truncate flex-1 min-w-0">
          {companyName}
        </span>

        {/* Ajustar button */}
        <button
          onClick={onExpandToggle}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors shrink-0',
            expanded
              ? 'text-primary-700 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          )}
        >
          {expanded ? <X className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
        </button>

        {/* Toggle switch */}
        <button
          role="switch"
          aria-checked={isTracking}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            isTracking ? 'bg-primary-600' : 'bg-gray-300'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              isTracking ? 'translate-x-[18px]' : 'translate-x-[2px]'
            )}
          />
        </button>
      </div>

      {/* Expanded: inline category checkboxes + thresholds */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {CATEGORIES.map((cat) => {
              const enabled = pref[cat.enabledKey] ?? ALERT_DEFAULTS[cat.enabledKey];
              const threshold = pref[cat.thresholdKey];
              const globalVal = globalThresholds[cat.globalKey];
              const isCustom = threshold !== null && threshold !== undefined;

              return (
                <label key={cat.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => updatePref({ [cat.enabledKey]: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                  />
                  <span className={cn('min-w-[60px]', enabled ? 'text-gray-700' : 'text-gray-400')}>
                    {cat.label}
                  </span>
                  <input
                    type="number"
                    value={threshold ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updatePref({ [cat.thresholdKey]: val === '' ? null : Number(val) });
                    }}
                    placeholder={String(globalVal)}
                    disabled={!enabled}
                    className={cn(
                      'w-16 px-1.5 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
                      enabled ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-300 bg-gray-50'
                    )}
                  />
                  <span className="text-xs text-gray-400">{cat.suffix}</span>
                  {isCustom && (
                    <span className="text-[10px] text-primary-500">custom</span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Umbrales globales · editar para personalizar
          </p>
        </div>
      )}
    </div>
  );
}

export type { GlobalThresholds };
