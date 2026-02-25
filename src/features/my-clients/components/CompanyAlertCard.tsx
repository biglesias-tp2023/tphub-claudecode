import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart, Star, Megaphone, Ticket } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';
import { AlertCategoryToggle } from './AlertCategoryToggle';
import { AlertChannelSelector } from './AlertChannelSelector';

interface CompanyAlertCardProps {
  companyId: string;
  companyName: string;
  /** Current saved preference (null = defaults) */
  preference: AlertPreferenceInput | null;
  /** Called when any field changes */
  onChange: (pref: AlertPreferenceInput) => void;
  consultantId: string;
  dirty?: boolean;
}

function getDefaults(consultantId: string, companyId: string): AlertPreferenceInput {
  return {
    consultantId,
    companyId,
    ordersEnabled: ALERT_DEFAULTS.ordersEnabled,
    reviewsEnabled: ALERT_DEFAULTS.reviewsEnabled,
    adsEnabled: ALERT_DEFAULTS.adsEnabled,
    promosEnabled: ALERT_DEFAULTS.promosEnabled,
    slackEnabled: ALERT_DEFAULTS.slackEnabled,
    emailEnabled: ALERT_DEFAULTS.emailEnabled,
    ordersThreshold: null,
    reviewsThreshold: null,
    adsRoasThreshold: null,
    promosThreshold: null,
  };
}

function getSummary(pref: AlertPreferenceInput): string {
  const categories: string[] = [];
  if (pref.ordersEnabled) categories.push('Pedidos');
  if (pref.reviewsEnabled) categories.push('Resenas');
  if (pref.adsEnabled) categories.push('Ads');
  if (pref.promosEnabled) categories.push('Promos');
  if (categories.length === 0) return 'Sin alertas';
  return categories.join(', ');
}

function getChannelSummary(pref: AlertPreferenceInput): string {
  const channels: string[] = [];
  if (pref.slackEnabled) channels.push('Slack');
  if (pref.emailEnabled) channels.push('Email');
  if (channels.length === 0) return 'Sin canales';
  return channels.join(', ');
}

export function CompanyAlertCard({
  companyId,
  companyName,
  preference,
  onChange,
  consultantId,
  dirty,
}: CompanyAlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pref = preference ?? getDefaults(consultantId, companyId);

  const update = (partial: Partial<AlertPreferenceInput>) => {
    onChange({ ...pref, ...partial });
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border transition-colors',
      dirty ? 'border-primary-300 shadow-sm' : 'border-gray-200'
    )}>
      {/* Header (collapsed) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-gray-900 truncate">{companyName}</span>
          {dirty && (
            <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded">
              modificado
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-sm text-gray-500 hidden sm:inline">
            {getSummary(pref)} | {getChannelSummary(pref)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
          {/* Categories */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Categorias
            </h4>
            <AlertCategoryToggle
              label="Pedidos"
              icon={<ShoppingCart className="w-4 h-4" />}
              enabled={pref.ordersEnabled ?? true}
              onToggle={(v) => update({ ordersEnabled: v })}
              threshold={pref.ordersThreshold ?? null}
              onThresholdChange={(v) => update({ ordersThreshold: v })}
              defaultThreshold={ALERT_DEFAULTS.ordersThreshold}
              thresholdLabel="Caida"
              thresholdSuffix="%"
            />
            <AlertCategoryToggle
              label="Resenas"
              icon={<Star className="w-4 h-4" />}
              enabled={pref.reviewsEnabled ?? true}
              onToggle={(v) => update({ reviewsEnabled: v })}
              threshold={pref.reviewsThreshold ?? null}
              onThresholdChange={(v) => update({ reviewsThreshold: v })}
              defaultThreshold={ALERT_DEFAULTS.reviewsThreshold}
              thresholdLabel="Min rating"
            />
            <AlertCategoryToggle
              label="Publicidad"
              icon={<Megaphone className="w-4 h-4" />}
              enabled={pref.adsEnabled ?? true}
              onToggle={(v) => update({ adsEnabled: v })}
              threshold={pref.adsRoasThreshold ?? null}
              onThresholdChange={(v) => update({ adsRoasThreshold: v })}
              defaultThreshold={ALERT_DEFAULTS.adsRoasThreshold}
              thresholdLabel="Min ROAS"
              thresholdSuffix="x"
            />
            <AlertCategoryToggle
              label="Promos"
              icon={<Ticket className="w-4 h-4" />}
              enabled={pref.promosEnabled ?? true}
              onToggle={(v) => update({ promosEnabled: v })}
              threshold={pref.promosThreshold ?? null}
              onThresholdChange={(v) => update({ promosThreshold: v })}
              defaultThreshold={ALERT_DEFAULTS.promosThreshold}
              thresholdLabel="Max rate"
              thresholdSuffix="%"
            />
          </div>

          {/* Channels */}
          <div className="pt-2 border-t border-gray-100">
            <AlertChannelSelector
              slackEnabled={pref.slackEnabled ?? true}
              emailEnabled={pref.emailEnabled ?? false}
              onSlackChange={(v) => update({ slackEnabled: v })}
              onEmailChange={(v) => update({ emailEnabled: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
