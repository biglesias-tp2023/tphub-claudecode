import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, Bell, BellRing, Check, Clock, Hash, Info, Send } from 'lucide-react';
import { Spinner, ToastContainer } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { useProfile } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
  useBulkUpsertAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { useAlertConfig } from '@/features/my-clients/hooks/useAlertConfig';
import type { AlertFrequency } from '@/features/my-clients/hooks/useAlertConfig';
import { CompanyAlertCard } from '@/features/my-clients/components/CompanyAlertCard';
import { SlackPreview } from '@/features/my-clients/components/SlackPreview';
import { EmailPreview } from '@/features/my-clients/components/EmailPreview';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';
import type { GlobalThresholds } from '@/features/my-clients/components/CompanyAlertCard';
import {
  computeUrgencyScore,
  getDateLabel,
  getNextSendLabel,
  getFirstName,
  getRelativeTime,
  FREQUENCY_OPTIONS,
  type CompanyAlert,
} from '@/features/my-clients/utils/alertUtils';

const DEBOUNCE_MS = 800;

function isTracking(pref: AlertPreferenceInput): boolean {
  return !!(pref.ordersEnabled || pref.reviewsEnabled || pref.adsEnabled || pref.promosEnabled);
}

function buildDefault(consultantId: string, companyId: string, channel: 'slack' | 'email'): AlertPreferenceInput {
  return {
    consultantId,
    companyId,
    ordersEnabled: ALERT_DEFAULTS.ordersEnabled,
    reviewsEnabled: ALERT_DEFAULTS.reviewsEnabled,
    adsEnabled: ALERT_DEFAULTS.adsEnabled,
    promosEnabled: ALERT_DEFAULTS.promosEnabled,
    slackEnabled: channel === 'slack',
    emailEnabled: channel === 'email',
    ordersThreshold: null,
    reviewsThreshold: null,
    adsRoasThreshold: null,
    promosThreshold: null,
  };
}

export function AlertsPage() {
  const profile = useProfile();
  const consultantId = profile?.id ?? '';
  const consultantName = profile?.fullName ?? 'Consultor';
  const firstName = getFirstName(profile?.fullName ?? null);
  const toast = useToast();

  const { data: allCompanies = [], isLoading: companiesLoading } = useCompanies();
  const { data: savedPrefs = [], isLoading: prefsLoading } = useAlertPreferences(consultantId);
  const bulkUpsert = useBulkUpsertAlertPreferences();

  const { config, setConfig } = useAlertConfig(consultantId);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'slack' | 'email'>('slack');
  const [sendingTest, setSendingTest] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem('tphub_alert_banner_dismissed') === '1'
  );

  // Local prefs map — source of truth for UI
  const [localPrefs, setLocalPrefs] = useState<Map<string, AlertPreferenceInput>>(new Map());
  const localPrefsInitialized = useRef(false);

  const globalChannel = config.channel;
  const globalThresholds: GlobalThresholds = config.thresholds;

  // Initialize localPrefs from saved data
  useEffect(() => {
    if (prefsLoading || localPrefsInitialized.current) return;
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
    if (savedPrefs.length > 0) {
      const first = savedPrefs[0];
      setConfig((prev) => ({ ...prev, channel: first.slackEnabled ? 'slack' : 'email' }));
    }
    setLocalPrefs(map);
    localPrefsInitialized.current = true;
  }, [savedPrefs, prefsLoading, setConfig]);

  // Auto-save machinery
  const pendingDirtyIds = useRef<Set<string>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const localPrefsRef = useRef(localPrefs);
  localPrefsRef.current = localPrefs;

  const flushSave = useCallback(async () => {
    const dirtyIds = Array.from(pendingDirtyIds.current);
    if (dirtyIds.length === 0) return;
    const currentMap = localPrefsRef.current;
    const edits = dirtyIds.map((id) => currentMap.get(id)).filter(Boolean) as AlertPreferenceInput[];
    if (edits.length === 0) return;
    pendingDirtyIds.current.clear();
    try {
      await bulkUpsert.mutateAsync(edits);
      toast.success('Guardado');
    } catch {
      for (const id of dirtyIds) pendingDirtyIds.current.add(id);
      toast.error('Error al guardar');
    }
  }, [bulkUpsert, toast]);

  const scheduleSave = useCallback(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flushSave, DEBOUNCE_MS);
  }, [flushSave]);

  // Assigned companies
  const assignedCompanies = useMemo(() => {
    const assignedIds = profile?.assignedCompanyIds ?? [];
    if (assignedIds.length === 0) return allCompanies;
    return allCompanies.filter((c) => assignedIds.includes(c.id));
  }, [allCompanies, profile?.assignedCompanyIds]);

  // Filter by search
  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return assignedCompanies;
    const q = search.toLowerCase();
    return assignedCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [assignedCompanies, search]);

  // Stats
  const trackingCount = useMemo(() => {
    let count = 0;
    for (const company of assignedCompanies) {
      const pref = localPrefs.get(company.id);
      if (pref && isTracking(pref)) count++;
    }
    return count;
  }, [assignedCompanies, localPrefs]);

  // Companies under thresholds (deterministic mocks for preview)
  const alertCompanies = useMemo(() => {
    const results: CompanyAlert[] = [];
    for (const company of assignedCompanies) {
      const pref = localPrefs.get(company.id);
      if (!pref) continue;
      if (!isTracking(pref)) continue;

      const { score, deviations } = computeUrgencyScore(config.thresholds, pref, company.name);
      if (deviations.length > 0) {
        results.push({ name: company.name, score, deviations });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }, [assignedCompanies, localPrefs, config.thresholds]);

  const showBanner = savedPrefs.length === 0 && !bannerDismissed && !prefsLoading && !companiesLoading;

  // ─── Handlers ───

  const handlePrefChange = useCallback((companyId: string, pref: AlertPreferenceInput) => {
    setLocalPrefs((prev) => {
      const next = new Map(prev);
      next.set(companyId, pref);
      return next;
    });
    pendingDirtyIds.current.add(companyId);
    scheduleSave();
  }, [scheduleSave]);

  const handleToggle = useCallback((companyId: string) => {
    const existing = localPrefs.get(companyId);
    if (!existing) {
      const newPref = buildDefault(consultantId, companyId, globalChannel);
      handlePrefChange(companyId, newPref);
    } else {
      const tracking = isTracking(existing);
      handlePrefChange(companyId, {
        ...existing,
        ordersEnabled: !tracking,
        reviewsEnabled: !tracking,
        adsEnabled: !tracking,
        promosEnabled: !tracking,
      });
    }
  }, [localPrefs, consultantId, globalChannel, handlePrefChange]);

  const handleActivateAll = useCallback(async () => {
    const batch: AlertPreferenceInput[] = [];
    const newMap = new Map(localPrefs);
    for (const company of assignedCompanies) {
      const pref = buildDefault(consultantId, company.id, globalChannel);
      newMap.set(company.id, pref);
      batch.push(pref);
    }
    setLocalPrefs(newMap);
    try {
      await bulkUpsert.mutateAsync(batch);
      toast.success('Todas las alertas activadas');
    } catch {
      toast.error('Error al activar alertas');
    }
  }, [assignedCompanies, consultantId, globalChannel, localPrefs, bulkUpsert, toast]);

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem('tphub_alert_banner_dismissed', '1');
  }, []);

  const handleToggleEnabled = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, [setConfig]);

  const handleChannelChange = useCallback((channel: 'slack' | 'email') => {
    setConfig((prev) => ({ ...prev, channel }));
    setLocalPrefs((prev) => {
      const next = new Map(prev);
      for (const [companyId, pref] of next) {
        if (isTracking(pref)) {
          next.set(companyId, {
            ...pref,
            slackEnabled: channel === 'slack',
            emailEnabled: channel === 'email',
          });
          pendingDirtyIds.current.add(companyId);
        }
      }
      return next;
    });
    scheduleSave();
  }, [setConfig, scheduleSave]);

  const handleFrequencyChange = useCallback((frequency: AlertFrequency) => {
    setConfig((prev) => ({ ...prev, frequency }));
  }, [setConfig]);

  const handleThresholdChange = useCallback((field: keyof typeof config.thresholds, value: number) => {
    setConfig((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [field]: value },
    }));
  }, [setConfig]);

  const handleSendTest = useCallback(async () => {
    setSendingTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sesion expirada');
        return;
      }
      const resp = await fetch('/api/alerts/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          channel: config.channel,
          consultantName,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${resp.status}`);
      }
      toast.success(`Prueba enviada a tu ${config.channel === 'slack' ? 'Slack' : 'Email'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar prueba');
    } finally {
      setSendingTest(false);
    }
  }, [config.channel, consultantName, toast]);

  const dateLabel = getDateLabel();
  const underThresholdCount = alertCompanies.length;
  const savedTimeLabel = getRelativeTime(config.lastSavedAt);
  const isDisabled = !config.enabled;
  const loading = companiesLoading || prefsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        <p className="text-gray-500 mt-1">
          Configura el tracking de alertas diarias
        </p>
      </div>

      {/* Status Banner */}
      <div className={cn(
        'rounded-lg border p-4 transition-colors',
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
              {assignedCompanies.length} empresas · {trackingCount} con tracking · {underThresholdCount} bajo umbral
            </p>
          </div>
        )}
      </div>

      {/* Setup banner */}
      {showBanner && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-start gap-3">
          <BellRing className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary-800 font-medium">
              No tienes alertas configuradas
            </p>
            <p className="text-xs text-primary-600 mt-0.5">
              Activa el seguimiento para recibir alertas diarias de tus clientes.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleActivateAll}
                disabled={bulkUpsert.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {bulkUpsert.isPending ? 'Activando...' : 'Activar todas'}
              </button>
              <button
                onClick={handleDismissBanner}
                className="px-3 py-1.5 text-xs font-medium text-primary-700 bg-white border border-primary-200 rounded-md hover:bg-primary-50 transition-colors"
              >
                Configurar manualmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config + Preview grid */}
      <div className={cn(
        'transition-all duration-200',
        isDisabled && 'opacity-40 pointer-events-none select-none'
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
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

            {/* Save status + send test */}
            <div className="flex items-center justify-between pt-2">
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
          </div>

          {/* Right: Preview */}
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

      {/* Company list separator */}
      {!loading && assignedCompanies.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-3 text-sm font-medium text-gray-500">Empresas</span>
          </div>
        </div>
      )}

      {/* Search */}
      {!loading && assignedCompanies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}

      {/* Company list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {search ? 'Sin resultados' : 'Sin empresas asignadas'}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            {search
              ? `No se encontraron empresas que coincidan con "${search}"`
              : 'No tienes empresas asignadas. Contacta con un administrador.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredCompanies.map((company) => {
            const pref = localPrefs.get(company.id) ?? buildDefault(consultantId, company.id, globalChannel);
            const tracking = isTracking(pref);
            return (
              <CompanyAlertCard
                key={company.id}
                companyId={company.id}
                companyName={company.name}
                consultantId={consultantId}
                pref={pref}
                isTracking={tracking}
                expanded={expandedId === company.id}
                globalThresholds={globalThresholds}
                onToggle={() => handleToggle(company.id)}
                onExpandToggle={() => setExpandedId(expandedId === company.id ? null : company.id)}
                onPrefChange={(p) => handlePrefChange(company.id, p)}
              />
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      {!loading && assignedCompanies.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {assignedCompanies.length} empresas · {trackingCount} con tracking
        </p>
      )}

      {/* Toast container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </div>
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
