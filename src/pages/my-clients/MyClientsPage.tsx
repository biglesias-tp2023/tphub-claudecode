import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, Bell, BellRing } from 'lucide-react';
import { Spinner, ToastContainer } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useProfile } from '@/stores/authStore';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
  useBulkUpsertAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { CompanyAlertCard } from '@/features/my-clients/components/CompanyAlertCard';
import { AlertChannelSelector } from '@/features/my-clients/components/AlertChannelSelector';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';
import type { GlobalThresholds } from '@/features/my-clients/components/CompanyAlertCard';

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

export function MyClientsPage() {
  const profile = useProfile();
  const consultantId = profile?.id ?? '';
  const toast = useToast();

  const { data: allCompanies = [], isLoading: companiesLoading } = useCompanies();
  const { data: savedPrefs = [], isLoading: prefsLoading } = useAlertPreferences(consultantId);
  const bulkUpsert = useBulkUpsertAlertPreferences();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem('tphub_alert_banner_dismissed') === '1'
  );

  // Local prefs map — source of truth for UI
  const [localPrefs, setLocalPrefs] = useState<Map<string, AlertPreferenceInput>>(new Map());
  const localPrefsInitialized = useRef(false);

  // Global channel & thresholds
  const [globalChannel, setGlobalChannel] = useState<'slack' | 'email'>('slack');
  const [globalThresholds, setGlobalThresholds] = useState<GlobalThresholds>({
    orders: ALERT_DEFAULTS.ordersThreshold,
    reviews: ALERT_DEFAULTS.reviewsThreshold,
    adsRoas: ALERT_DEFAULTS.adsRoasThreshold,
    promos: ALERT_DEFAULTS.promosThreshold,
  });

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
    // Derive global channel from first saved pref
    if (savedPrefs.length > 0) {
      const first = savedPrefs[0];
      setGlobalChannel(first.slackEnabled ? 'slack' : 'email');
    }
    setLocalPrefs(map);
    localPrefsInitialized.current = true;
  }, [savedPrefs, prefsLoading]);

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

  // Companies assigned to this consultant
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
      // Create new pref with defaults ON
      const newPref = buildDefault(consultantId, companyId, globalChannel);
      handlePrefChange(companyId, newPref);
    } else {
      // Toggle: if tracking → all OFF; if not tracking → all ON
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
    // Save immediately (no debounce)
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

  const handleGlobalChannelChange = useCallback((channel: 'slack' | 'email') => {
    setGlobalChannel(channel);
    // Update all tracking companies
    setLocalPrefs((prev) => {
      const next = new Map(prev);
      for (const [companyId, pref] of next) {
        if (isTracking(pref)) {
          const updated = {
            ...pref,
            slackEnabled: channel === 'slack',
            emailEnabled: channel === 'email',
          };
          next.set(companyId, updated);
          pendingDirtyIds.current.add(companyId);
        }
      }
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const handleGlobalThresholdChange = useCallback((field: keyof GlobalThresholds, value: number) => {
    setGlobalThresholds((prev) => ({ ...prev, [field]: value }));
  }, []);

  const loading = companiesLoading || prefsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Clientes</h1>
        <p className="text-gray-500 mt-1">
          Configura el tracking de alertas diarias
        </p>
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

      {/* Global config */}
      {!loading && assignedCompanies.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <AlertChannelSelector
              slackEnabled={globalChannel === 'slack'}
              emailEnabled={globalChannel === 'email'}
              onSlackChange={() => handleGlobalChannelChange('slack')}
              onEmailChange={() => handleGlobalChannelChange('email')}
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
            <span>Umbrales:</span>
            <ThresholdInput label="Pedidos" value={globalThresholds.orders} suffix="%" onChange={(v) => handleGlobalThresholdChange('orders', v)} />
            <ThresholdInput label="Resenas" value={globalThresholds.reviews} suffix="" onChange={(v) => handleGlobalThresholdChange('reviews', v)} />
            <ThresholdInput label="Ads" value={globalThresholds.adsRoas} suffix="x" onChange={(v) => handleGlobalThresholdChange('adsRoas', v)} />
            <ThresholdInput label="Promos" value={globalThresholds.promos} suffix="%" onChange={(v) => handleGlobalThresholdChange('promos', v)} />
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

// ─── Small inline component for global threshold inputs ───

function ThresholdInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
      />
      {suffix && <span className="text-gray-400">{suffix}</span>}
    </label>
  );
}
