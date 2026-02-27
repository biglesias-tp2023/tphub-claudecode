import { useState, useMemo, useCallback, useRef } from 'react';
import { Check, Clock, Hash, Info, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { ToastContainer } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { useProfile } from '@/stores/authStore';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { useAlertConfig } from '@/features/my-clients/hooks/useAlertConfig';
import type { AlertPreferenceInput } from '@/services/alertPreferences';
import type { AlertFrequency } from '@/features/my-clients/hooks/useAlertConfig';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Deterministic hash ───

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  // Returns 0-1 from integer seed
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  return x - Math.floor(x);
}

// ─── Urgency scoring ───

interface CompanyAlert {
  name: string;
  score: number;
  deviations: { label: string; value: string; threshold: string; deviation: string }[];
}

interface Thresholds {
  orders: number;
  reviews: number;
  adsRoas: number;
  promos: number;
}

function computeUrgencyScore(
  thresholds: Thresholds,
  pref: AlertPreferenceInput,
  companyName: string,
): { score: number; deviations: CompanyAlert['deviations'] } {
  let totalScore = 0;
  const deviations: CompanyAlert['deviations'] = [];

  if (pref.ordersEnabled) {
    const th = pref.ordersThreshold ?? thresholds.orders;
    const r = seededRandom(hashString(companyName + 'orders'));
    const actual = -(Math.abs(th) + Math.floor(r * 20));
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 1.5, 30);
      deviations.push({
        label: 'Pedidos',
        value: `${actual}%`,
        threshold: `${th}%`,
        deviation: `${actual - th}%`,
      });
    }
  }

  if (pref.reviewsEnabled) {
    const th = pref.reviewsThreshold ?? thresholds.reviews;
    const r = seededRandom(hashString(companyName + 'reviews'));
    const actual = th - (0.3 + r * 0.8);
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 8, 25);
      deviations.push({
        label: 'Resenas',
        value: actual.toFixed(1),
        threshold: th.toFixed(1),
        deviation: `-${(th - actual).toFixed(1)}`,
      });
    }
  }

  if (pref.adsEnabled) {
    const th = pref.adsRoasThreshold ?? thresholds.adsRoas;
    const r = seededRandom(hashString(companyName + 'adsRoas'));
    const actual = th - (0.5 + r * 1.5);
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 10, 25);
      deviations.push({
        label: 'Ads ROAS',
        value: `${actual.toFixed(1)}x`,
        threshold: `${th.toFixed(1)}x`,
        deviation: `-${(th - actual).toFixed(1)}x`,
      });
    }
  }

  if (pref.promosEnabled) {
    const th = pref.promosThreshold ?? thresholds.promos;
    const r = seededRandom(hashString(companyName + 'promos'));
    const actual = th + (2 + Math.floor(r * 10));
    if (actual > th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 2, 20);
      deviations.push({
        label: 'Promos',
        value: `${actual}%`,
        threshold: `${th}%`,
        deviation: `+${actual - th}%`,
      });
    }
  }

  return { score: Math.round(totalScore), deviations };
}

function getSeverity(score: number) {
  if (score >= 60) return { label: 'CRITICO', color: 'text-red-700', borderColor: 'border-l-red-500', dotColor: 'bg-red-500', bgColor: 'bg-red-50' };
  if (score >= 30) return { label: 'URGENTE', color: 'text-orange-700', borderColor: 'border-l-orange-500', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50' };
  return { label: 'ATENCION', color: 'text-amber-700', borderColor: 'border-l-amber-500', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50' };
}

// ─── Date helpers ───

function getDateLabel(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]}`;
}

function getNextSendLabel(frequency: AlertFrequency): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...6=Sat
  const days = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  let nextDate: Date;

  if (frequency === 'daily') {
    // Tomorrow
    nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frequency === 'weekdays') {
    // Next weekday (Mon-Fri)
    nextDate = new Date(now);
    if (dayOfWeek === 5) nextDate.setDate(nextDate.getDate() + 3); // Fri → Mon
    else if (dayOfWeek === 6) nextDate.setDate(nextDate.getDate() + 2); // Sat → Mon
    else nextDate.setDate(nextDate.getDate() + 1); // Next day
  } else {
    // Weekly: next Monday
    nextDate = new Date(now);
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    nextDate.setDate(nextDate.getDate() + daysUntilMonday);
  }

  return `${days[nextDate.getDay()]} ${nextDate.getDate()} ${months[nextDate.getMonth()]} · 08:30 CET`;
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return 'Consultor';
  return fullName.split(' ')[0];
}

function getRelativeTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: 'weekdays', label: 'Diaria (L-V)' },
  { value: 'daily', label: 'Diaria (7 dias)' },
  { value: 'weekly', label: 'Semanal (lunes)' },
];

// ─── Component ───

export function AlertsModal({ isOpen, onClose }: AlertsModalProps) {
  const profile = useProfile();
  const consultantId = profile?.id ?? '';
  const consultantName = profile?.fullName ?? 'Consultor';
  const firstName = getFirstName(profile?.fullName ?? null);
  const toast = useToast();

  const { data: allCompanies = [] } = useCompanies();
  const { data: savedPrefs = [] } = useAlertPreferences(consultantId);

  const { config, setConfig } = useAlertConfig(consultantId);

  const [previewTab, setPreviewTab] = useState<'slack' | 'email'>('slack');
  const [sendingTest, setSendingTest] = useState(false);
  const testTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ─── Assigned companies ───
  const assignedCompanies = useMemo(() => {
    const assignedIds = profile?.assignedCompanyIds ?? [];
    if (assignedIds.length === 0) return allCompanies;
    return allCompanies.filter((c) => assignedIds.includes(c.id));
  }, [allCompanies, profile?.assignedCompanyIds]);

  // Build prefs map from saved
  const prefsMap = useMemo(() => {
    const map = new Map<string, AlertPreferenceInput>();
    for (const p of savedPrefs) {
      map.set(p.companyId, {
        consultantId: p.consultantId,
        companyId: p.companyId,
        ordersEnabled: p.ordersEnabled,
        reviewsEnabled: p.reviewsEnabled,
        adsEnabled: p.adsEnabled,
        promosEnabled: p.promosEnabled,
        slackEnabled: p.slackEnabled,
        emailEnabled: p.emailEnabled,
        ordersThreshold: p.ordersThreshold,
        reviewsThreshold: p.reviewsThreshold,
        adsRoasThreshold: p.adsRoasThreshold,
        promosThreshold: p.promosThreshold,
      });
    }
    return map;
  }, [savedPrefs]);

  // ─── Companies under thresholds (deterministic mocks) ───
  const alertCompanies = useMemo(() => {
    const results: CompanyAlert[] = [];
    for (const company of assignedCompanies) {
      const pref = prefsMap.get(company.id);
      if (!pref) continue;
      const isTracking = !!(pref.ordersEnabled || pref.reviewsEnabled || pref.adsEnabled || pref.promosEnabled);
      if (!isTracking) continue;

      const { score, deviations } = computeUrgencyScore(config.thresholds, pref, company.name);
      if (deviations.length > 0) {
        results.push({ name: company.name, score, deviations });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }, [assignedCompanies, prefsMap, config.thresholds]);

  const monitoredCount = useMemo(() => {
    let count = 0;
    for (const company of assignedCompanies) {
      const pref = prefsMap.get(company.id);
      if (pref && (pref.ordersEnabled || pref.reviewsEnabled || pref.adsEnabled || pref.promosEnabled)) {
        count++;
      }
    }
    return count;
  }, [assignedCompanies, prefsMap]);

  // ─── Handlers ───

  const handleToggleEnabled = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, [setConfig]);

  const handleChannelChange = useCallback((channel: 'slack' | 'email') => {
    setConfig((prev) => ({ ...prev, channel }));
  }, [setConfig]);

  const handleFrequencyChange = useCallback((frequency: AlertFrequency) => {
    setConfig((prev) => ({ ...prev, frequency }));
  }, [setConfig]);

  const handleThresholdChange = useCallback((field: keyof typeof config.thresholds, value: number) => {
    setConfig((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [field]: value },
    }));
  }, [setConfig]);

  const handleSendTest = useCallback(() => {
    setSendingTest(true);
    clearTimeout(testTimerRef.current);
    testTimerRef.current = setTimeout(() => {
      setSendingTest(false);
      toast.success(`Prueba enviada a tu ${config.channel === 'slack' ? 'Slack' : 'Email'}`);
    }, 1500);
  }, [config.channel, toast]);

  const dateLabel = getDateLabel();
  const underThresholdCount = alertCompanies.length;
  const savedTimeLabel = getRelativeTime(config.lastSavedAt);
  const isDisabled = !config.enabled;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Alertas" description="Configura tus alertas diarias">
      {/* ─── Status Banner ─── */}
      <div className={cn(
        'rounded-lg border p-4 mb-6 transition-colors',
        config.enabled
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              'relative flex h-3 w-3',
              config.enabled && 'animate-pulse'
            )}>
              <span className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                config.enabled ? 'bg-emerald-400 animate-ping' : 'bg-gray-300'
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-3 w-3',
                config.enabled ? 'bg-emerald-500' : 'bg-gray-400'
              )} />
            </span>
            <span className={cn(
              'text-sm font-semibold',
              config.enabled ? 'text-emerald-800' : 'text-gray-600'
            )}>
              {config.enabled ? 'Alertas activas' : 'Alertas desactivadas'}
            </span>
          </div>

          {/* Toggle switch */}
          <button
            onClick={handleToggleEnabled}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              config.enabled ? 'bg-emerald-500' : 'bg-gray-300'
            )}
            role="switch"
            aria-checked={config.enabled}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>

        {config.enabled && (
          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Proximo envio: {getNextSendLabel(config.frequency)}
            </p>
            <p className="text-xs text-emerald-600">
              {monitoredCount} empresas monitorizadas · {underThresholdCount} bajo umbral
            </p>
          </div>
        )}
      </div>

      {/* ─── Configuration + Preview ─── */}
      <div className={cn(
        'transition-all duration-200',
        isDisabled && 'opacity-40 pointer-events-none select-none'
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left Panel: Configuration ─── */}
          <div className="space-y-5">
            {/* Channel selector */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canal de envio</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChannelChange('slack')}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-full border transition-colors',
                    config.channel === 'slack'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  Slack
                </button>
                <button
                  onClick={() => handleChannelChange('email')}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-full border transition-colors',
                    config.channel === 'email'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  )}
                >
                  Email
                </button>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Frecuencia</h3>
              <select
                value={config.frequency}
                onChange={(e) => handleFrequencyChange(e.target.value as AlertFrequency)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Thresholds */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Umbrales</h3>
              <div className="grid grid-cols-2 gap-3">
                <ThresholdCard label="Pedidos" icon={<Hash className="w-4 h-4" />} value={config.thresholds.orders} suffix="%" onChange={(v) => handleThresholdChange('orders', v)} />
                <ThresholdCard label="Resenas" icon={<span className="text-sm">&#9733;</span>} value={config.thresholds.reviews} suffix="" onChange={(v) => handleThresholdChange('reviews', v)} step={0.1} />
                <ThresholdCard label="Ads ROAS" icon={<span className="text-sm">&#128226;</span>} value={config.thresholds.adsRoas} suffix="x" onChange={(v) => handleThresholdChange('adsRoas', v)} step={0.1} />
                <ThresholdCard label="Promos" icon={<span className="text-sm">&#127915;</span>} value={config.thresholds.promos} suffix="%" onChange={(v) => handleThresholdChange('promos', v)} />
              </div>
            </div>
          </div>

          {/* ─── Right Panel: Preview ─── */}
          <div className="space-y-3">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setPreviewTab('slack')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  previewTab === 'slack'
                    ? 'text-primary-700 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Slack
              </button>
              <button
                onClick={() => setPreviewTab('email')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  previewTab === 'email'
                    ? 'text-primary-700 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Email
              </button>
            </div>

            {/* Preview content */}
            {previewTab === 'slack' ? (
              <SlackPreview firstName={firstName} alertCompanies={alertCompanies} dateLabel={dateLabel} />
            ) : (
              <EmailPreview consultantName={consultantName} alertCompanies={alertCompanies} dateLabel={dateLabel} />
            )}

            {/* Urgency legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critico</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Urgente</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Atencion</span>
            </div>

            {/* Footer note */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Info className="w-3 h-3 shrink-0" />
              Ejemplo con datos ficticios
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {savedTimeLabel ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-gray-500">Guardado {savedTimeLabel}</span>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>

        {/* Send test */}
        <button
          onClick={handleSendTest}
          disabled={sendingTest || isDisabled}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-primary-600 text-white hover:bg-primary-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
          {sendingTest ? 'Enviando...' : 'Enviar prueba'}
        </button>
      </div>

      {/* Toast container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </Modal>
  );
}

// ─── Threshold card ───

function ThresholdCard({
  label,
  icon,
  value,
  suffix,
  onChange,
  step = 1,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Slack Preview ───

function SlackPreview({
  firstName,
  alertCompanies,
  dateLabel,
}: {
  firstName: string;
  alertCompanies: CompanyAlert[];
  dateLabel: string;
}) {
  if (alertCompanies.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-5 text-center">
        <p className="text-gray-400 text-sm">Sin alertas para previsualizar</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-y-auto">
      {/* Bot header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-md bg-primary-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">TP</span>
        </div>
        <div>
          <span className="text-white text-sm font-bold">TPHub Bot</span>
          <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">APP</span>
        </div>
        <span className="text-xs text-gray-500 ml-auto">Hoy a las 08:30</span>
      </div>

      {/* Message */}
      <div className="space-y-3 text-sm">
        <p className="text-gray-300">
          Buenos dias, <span className="text-sky-400 font-medium">@{firstName.toLowerCase()}</span>
        </p>
        <p className="text-gray-400 text-xs">
          Resumen de alertas del {dateLabel} · {alertCompanies.length} clientes bajo umbral
        </p>

        {/* All company cards — no slice limit */}
        {alertCompanies.map((company, idx) => {
          const severity = getSeverity(company.score);
          const slackDot = company.score >= 60 ? '\u{1F534}' : company.score >= 30 ? '\u{1F7E0}' : '\u{1F7E1}';

          return (
            <div
              key={company.name}
              className={cn(
                'border-l-[3px] rounded-r-md bg-gray-800/60 px-3 py-2',
                company.score >= 60 ? 'border-l-red-500' : company.score >= 30 ? 'border-l-orange-500' : 'border-l-amber-500'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{slackDot}</span>
                <span className="text-white font-semibold text-sm">#{idx + 1} {company.name}</span>
                <span className={cn('text-[10px] font-bold ml-auto', severity.color)}>{severity.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {company.deviations.map((d) => (
                  <span key={d.label} className="text-xs text-gray-400">
                    {d.label}: <span className="text-gray-300">{d.value}</span>
                    <span className="text-gray-600"> (umbral {d.threshold})</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <p className="text-sky-400 text-xs hover:underline cursor-pointer mt-2">
          Ver detalles en TPHub &rarr;
        </p>
      </div>
    </div>
  );
}

// ─── Email Preview ───

function EmailPreview({
  consultantName,
  alertCompanies,
  dateLabel,
}: {
  consultantName: string;
  alertCompanies: CompanyAlert[];
  dateLabel: string;
}) {
  const html = useMemo(() => {
    const companyCards = alertCompanies.map((company, idx) => {
      const severity = getSeverity(company.score);
      const borderColor = company.score >= 60 ? '#ef4444' : company.score >= 30 ? '#f97316' : '#f59e0b';
      const bgColor = company.score >= 60 ? '#fef2f2' : company.score >= 30 ? '#fff7ed' : '#fffbeb';
      const labelColor = company.score >= 60 ? '#b91c1c' : company.score >= 30 ? '#c2410c' : '#b45309';

      const kpis = company.deviations
        .map((d) => `<li style="margin:2px 0;font-size:13px;color:#374151">${d.label}: <strong>${d.value}</strong> <span style="color:#9ca3af">(umbral ${d.threshold})</span></li>`)
        .join('');

      return `<div style="border-left:4px solid ${borderColor};background:${bgColor};border-radius:8px;padding:12px 16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong style="font-size:14px;color:#111827">#${idx + 1} ${company.name}</strong>
          <span style="font-size:10px;font-weight:700;color:${labelColor};background:white;padding:2px 8px;border-radius:10px">${severity.label}</span>
        </div>
        <ul style="margin:0;padding:0 0 0 16px">${kpis}</ul>
      </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f3f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#095789;border-radius:12px 12px 0 0;padding:24px;text-align:center">
          <div style="width:48px;height:48px;border-radius:50%;background:white;margin:0 auto 12px;line-height:48px;text-align:center">
            <span style="color:#095789;font-weight:700;font-size:18px">TP</span>
          </div>
          <h1 style="color:white;font-size:18px;margin:0;font-weight:600">Alertas diarias</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${dateLabel}</p>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <div style="padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:20px;font-size:12px;color:#6b7280">
            <strong>De:</strong> TPHub Bot &lt;alertas@thinkpaladar.com&gt;<br/>
            <strong>Para:</strong> ${consultantName}<br/>
            <strong>Asunto:</strong> Resumen de alertas - ${alertCompanies.length} clientes bajo umbral
          </div>
          <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Hola ${consultantName.split(' ')[0]}, estas son las anomalias detectadas:</p>
          ${companyCards || '<p style="color:#9ca3af;font-size:14px;text-align:center;padding:20px 0">Sin alertas</p>'}
          <div style="text-align:center;margin:24px 0 16px">
            <a href="#" style="display:inline-block;background:#095789;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600">Ver en TPHub</a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">ThinkPaladar &mdash; Consultoria de Delivery</p>
        </div>
      </div>
    </body></html>`;
  }, [consultantName, alertCompanies, dateLabel]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <iframe
        title="Vista previa email"
        srcDoc={html}
        className="w-full border-0"
        style={{ height: '400px', pointerEvents: 'none' }}
        sandbox=""
      />
    </div>
  );
}
