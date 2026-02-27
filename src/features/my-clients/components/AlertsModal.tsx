import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Clock, Hash, ShieldAlert, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { cn } from '@/utils/cn';
import { useProfile } from '@/stores/authStore';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
  useBulkUpsertAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';
import type { GlobalThresholds } from './CompanyAlertCard';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Urgency scoring ───

interface CompanyAlert {
  name: string;
  score: number;
  deviations: { label: string; value: string; threshold: string; deviation: string }[];
}

function computeUrgencyScore(
  thresholds: GlobalThresholds,
  pref: AlertPreferenceInput,
): { score: number; deviations: CompanyAlert['deviations'] } {
  // Mock deviations — in production these come from real data
  const mockDeviations: Record<string, { actual: number; weight: number; format: (v: number) => string; thresholdFmt: (v: number) => string }> = {
    orders: {
      actual: -(Math.abs(thresholds.orders) + Math.floor(Math.random() * 20)),
      weight: 30,
      format: (v) => `${v}%`,
      thresholdFmt: (v) => `${v}%`,
    },
    reviews: {
      actual: thresholds.reviews - (0.3 + Math.random() * 0.8),
      weight: 25,
      format: (v) => v.toFixed(1),
      thresholdFmt: (v) => v.toFixed(1),
    },
    adsRoas: {
      actual: thresholds.adsRoas - (0.5 + Math.random() * 1.5),
      weight: 25,
      format: (v) => `${v.toFixed(1)}x`,
      thresholdFmt: (v) => `${v.toFixed(1)}x`,
    },
    promos: {
      actual: thresholds.promos + (2 + Math.floor(Math.random() * 10)),
      weight: 20,
      format: (v) => `${v}%`,
      thresholdFmt: (v) => `${v}%`,
    },
  };

  let totalScore = 0;
  const deviations: CompanyAlert['deviations'] = [];

  if (pref.ordersEnabled) {
    const th = pref.ordersThreshold ?? thresholds.orders;
    const actual = mockDeviations.orders.actual;
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 1.5, mockDeviations.orders.weight);
      deviations.push({
        label: 'Pedidos',
        value: mockDeviations.orders.format(actual),
        threshold: mockDeviations.orders.thresholdFmt(th),
        deviation: mockDeviations.orders.format(actual - th),
      });
    }
  }

  if (pref.reviewsEnabled) {
    const th = pref.reviewsThreshold ?? thresholds.reviews;
    const actual = mockDeviations.reviews.actual;
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 8, mockDeviations.reviews.weight);
      deviations.push({
        label: 'Resenas',
        value: mockDeviations.reviews.format(actual),
        threshold: mockDeviations.reviews.thresholdFmt(th),
        deviation: `-${(th - actual).toFixed(1)}`,
      });
    }
  }

  if (pref.adsEnabled) {
    const th = pref.adsRoasThreshold ?? thresholds.adsRoas;
    const actual = mockDeviations.adsRoas.actual;
    if (actual < th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 10, mockDeviations.adsRoas.weight);
      deviations.push({
        label: 'Ads ROAS',
        value: mockDeviations.adsRoas.format(actual),
        threshold: mockDeviations.adsRoas.thresholdFmt(th),
        deviation: `-${(th - actual).toFixed(1)}x`,
      });
    }
  }

  if (pref.promosEnabled) {
    const th = pref.promosThreshold ?? thresholds.promos;
    const actual = mockDeviations.promos.actual;
    if (actual > th) {
      const dev = Math.abs(actual - th);
      totalScore += Math.min(dev * 2, mockDeviations.promos.weight);
      deviations.push({
        label: 'Promos',
        value: mockDeviations.promos.format(actual),
        threshold: mockDeviations.promos.thresholdFmt(th),
        deviation: `+${actual - th}%`,
      });
    }
  }

  return { score: Math.round(totalScore), deviations };
}

function getSeverity(score: number): { label: string; color: string; borderColor: string; dotColor: string; bgColor: string } {
  if (score >= 60) return { label: 'CRITICO', color: 'text-red-700', borderColor: 'border-l-red-500', dotColor: 'bg-red-500', bgColor: 'bg-red-50' };
  if (score >= 30) return { label: 'URGENTE', color: 'text-orange-700', borderColor: 'border-l-orange-500', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50' };
  return { label: 'ATENCION', color: 'text-amber-700', borderColor: 'border-l-amber-500', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50' };
}

// ─── Date helper ───

function getDateLabel(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]}`;
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return 'Consultor';
  return fullName.split(' ')[0];
}

// ─── Debounce constant ───
const DEBOUNCE_MS = 800;

// ─── Component ───

export function AlertsModal({ isOpen, onClose }: AlertsModalProps) {
  const profile = useProfile();
  const consultantId = profile?.id ?? '';
  const consultantName = profile?.fullName ?? 'Consultor';
  const firstName = getFirstName(profile?.fullName ?? null);

  const { data: allCompanies = [] } = useCompanies();
  const { data: savedPrefs = [] } = useAlertPreferences(consultantId);
  const bulkUpsert = useBulkUpsertAlertPreferences();

  // ─── Local state ───
  const [globalChannel, setGlobalChannel] = useState<'slack' | 'email'>('slack');
  const [globalThresholds, setGlobalThresholds] = useState<GlobalThresholds>({
    orders: ALERT_DEFAULTS.ordersThreshold,
    reviews: ALERT_DEFAULTS.reviewsThreshold,
    adsRoas: ALERT_DEFAULTS.adsRoasThreshold,
    promos: ALERT_DEFAULTS.promosThreshold,
  });
  const [previewTab, setPreviewTab] = useState<'slack' | 'email'>('slack');

  // Seed random once per open so urgency scores are stable
  const [seed] = useState(() => Math.random());

  // Initialize from saved prefs
  const initialized = useRef(false);
  useEffect(() => {
    if (!isOpen || initialized.current || savedPrefs.length === 0) return;
    const first = savedPrefs[0];
    setGlobalChannel(first.slackEnabled ? 'slack' : 'email');
    initialized.current = true;
  }, [isOpen, savedPrefs]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) initialized.current = false;
  }, [isOpen]);

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

  // ─── Companies under thresholds (with urgency) ───
  const alertCompanies = useMemo(() => {
    // Use seed to make random deterministic per modal open
    let rng = seed;
    const nextRandom = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };

    const results: CompanyAlert[] = [];

    for (const company of assignedCompanies) {
      const pref = prefsMap.get(company.id);
      if (!pref) continue;
      const isTracking = !!(pref.ordersEnabled || pref.reviewsEnabled || pref.adsEnabled || pref.promosEnabled);
      if (!isTracking) continue;

      // Override Math.random temporarily for deterministic scores
      const origRandom = Math.random;
      Math.random = nextRandom;
      const { score, deviations } = computeUrgencyScore(globalThresholds, pref);
      Math.random = origRandom;

      if (deviations.length > 0) {
        results.push({ name: company.name, score, deviations });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [assignedCompanies, prefsMap, globalThresholds, seed]);

  // ─── Auto-save thresholds ───
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveThresholds = useCallback(async () => {
    const edits: AlertPreferenceInput[] = [];
    for (const [, pref] of prefsMap) {
      // Only update channel, thresholds stay as-is (they use global fallback)
      edits.push({
        ...pref,
        slackEnabled: globalChannel === 'slack',
        emailEnabled: globalChannel === 'email',
      });
    }
    if (edits.length > 0) {
      try { await bulkUpsert.mutateAsync(edits); } catch { /* silent */ }
    }
  }, [prefsMap, globalChannel, bulkUpsert]);

  const handleChannelChange = useCallback((channel: 'slack' | 'email') => {
    setGlobalChannel(channel);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveThresholds, DEBOUNCE_MS);
  }, [saveThresholds]);

  const handleThresholdChange = useCallback((field: keyof GlobalThresholds, value: number) => {
    setGlobalThresholds((prev) => ({ ...prev, [field]: value }));
  }, []);

  const dateLabel = getDateLabel();
  const underThresholdCount = alertCompanies.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Alertas" description="Configura y previsualiza tus alertas diarias">
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
                  globalChannel === 'slack'
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
                  globalChannel === 'email'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                Email
              </button>
            </div>
          </div>

          {/* Send time */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hora de envio</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>08:30 CET (lun-vie)</span>
            </div>
          </div>

          {/* Global thresholds */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Umbrales globales</h3>
            <div className="grid grid-cols-2 gap-3">
              <ThresholdCard label="Pedidos" icon={<Hash className="w-4 h-4" />} value={globalThresholds.orders} suffix="%" onChange={(v) => handleThresholdChange('orders', v)} />
              <ThresholdCard label="Resenas" icon={<span className="text-sm">&#9733;</span>} value={globalThresholds.reviews} suffix="" onChange={(v) => handleThresholdChange('reviews', v)} step={0.1} />
              <ThresholdCard label="Ads ROAS" icon={<span className="text-sm">&#128226;</span>} value={globalThresholds.adsRoas} suffix="x" onChange={(v) => handleThresholdChange('adsRoas', v)} step={0.1} />
              <ThresholdCard label="Promos" icon={<span className="text-sm">&#127915;</span>} value={globalThresholds.promos} suffix="%" onChange={(v) => handleThresholdChange('promos', v)} />
            </div>
          </div>

          {/* Companies under threshold */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Empresas ({underThresholdCount} bajo umbral)
            </h3>
            {underThresholdCount === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm text-gray-500">Ningun cliente bajo umbral</p>
                <p className="text-xs text-gray-400 mt-1">Todos tus clientes estan dentro de los parametros</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {alertCompanies.map((company, idx) => {
                  const severity = getSeverity(company.score);
                  return (
                    <div
                      key={company.name}
                      className={cn(
                        'border-l-4 rounded-lg bg-white border border-gray-200 p-3',
                        severity.borderColor
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-900">
                          #{idx + 1} {company.name}
                        </span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', severity.bgColor, severity.color)}>
                          {severity.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {company.deviations.map((d) => (
                          <span key={d.label} className="text-xs text-gray-500">
                            {d.label}: <span className="font-medium text-gray-700">{d.value}</span>
                            <span className="text-gray-400"> (umbral {d.threshold})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Preview ─── */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Vista previa
                <span className="text-gray-400 font-normal"> · {firstName} ({getInitials(consultantName)})</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {underThresholdCount} clientes bajo umbral · {globalChannel === 'slack' ? 'Slack' : 'Email'}
              </p>
            </div>
          </div>

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

          {/* Urgency legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critico</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Urgente</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Atencion</span>
          </div>

          {/* Preview content */}
          {previewTab === 'slack' ? (
            <SlackPreview
              firstName={firstName}
              alertCompanies={alertCompanies}
              dateLabel={dateLabel}
            />
          ) : (
            <EmailPreview
              consultantName={consultantName}
              alertCompanies={alertCompanies}
              dateLabel={dateLabel}
            />
          )}

          {/* Footer note */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Info className="w-3 h-3 shrink-0" />
            Ejemplo con datos ficticios
          </div>
        </div>
      </div>
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

// ─── Helpers ───

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
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

        {/* Company cards */}
        {alertCompanies.slice(0, 5).map((company, idx) => {
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
    const companyCards = alertCompanies.slice(0, 5).map((company, idx) => {
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
