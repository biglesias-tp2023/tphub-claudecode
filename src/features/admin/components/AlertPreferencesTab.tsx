import { useState, useMemo, useCallback } from 'react';
import { Save, ShoppingCart, Star, Megaphone, Ticket } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button, Spinner } from '@/components/ui';
import { useUsers } from '@/features/admin/hooks/useUsers';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
  useBulkUpsertAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { ALERT_DEFAULTS, type AlertPreferenceInput } from '@/services/alertPreferences';

type CategoryKey = 'ordersEnabled' | 'reviewsEnabled' | 'adsEnabled' | 'promosEnabled';
type ChannelKey = 'slackEnabled' | 'emailEnabled';

const CATEGORIES: { key: CategoryKey; label: string; icon: typeof ShoppingCart }[] = [
  { key: 'ordersEnabled', label: 'Pedidos', icon: ShoppingCart },
  { key: 'reviewsEnabled', label: 'Resenas', icon: Star },
  { key: 'adsEnabled', label: 'Ads', icon: Megaphone },
  { key: 'promosEnabled', label: 'Promos', icon: Ticket },
];

function getDefaultPref(consultantId: string, companyId: string): AlertPreferenceInput {
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

export function AlertPreferencesTab() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: allCompanies = [], isLoading: companiesLoading } = useCompanies();
  const bulkUpsert = useBulkUpsertAlertPreferences();

  // Selected consultant
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const { data: savedPrefs = [], isLoading: prefsLoading } = useAlertPreferences(
    selectedConsultantId || undefined
  );
  const [edits, setEdits] = useState<Map<string, AlertPreferenceInput>>(new Map());

  // Consultants only (not owners)
  const consultants = useMemo(
    () => users.filter((u) => ['consultant', 'manager', 'admin'].includes(u.role)),
    [users]
  );

  // Selected consultant profile
  const selectedConsultant = useMemo(
    () => consultants.find((c) => c.id === selectedConsultantId),
    [consultants, selectedConsultantId]
  );

  // Companies assigned to selected consultant
  const assignedCompanies = useMemo(() => {
    if (!selectedConsultant) return [];
    const ids = selectedConsultant.assignedCompanyIds ?? [];
    if (ids.length === 0) return allCompanies;
    return allCompanies.filter((c) => ids.includes(c.id));
  }, [selectedConsultant, allCompanies]);

  // Build saved prefs map
  const savedPrefsMap = useMemo(() => {
    const map = new Map<string, AlertPreferenceInput>();
    for (const pref of savedPrefs) {
      map.set(pref.companyId, {
        consultantId: pref.consultantId,
        companyId: pref.companyId,
        ordersEnabled: pref.ordersEnabled,
        reviewsEnabled: pref.reviewsEnabled,
        adsEnabled: pref.adsEnabled,
        promosEnabled: pref.promosEnabled,
        slackEnabled: pref.slackEnabled,
        emailEnabled: pref.emailEnabled,
        ordersThreshold: pref.ordersThreshold,
        reviewsThreshold: pref.reviewsThreshold,
        adsRoasThreshold: pref.adsRoasThreshold,
        promosThreshold: pref.promosThreshold,
      });
    }
    return map;
  }, [savedPrefs]);

  const getPref = useCallback(
    (companyId: string): AlertPreferenceInput => {
      return (
        edits.get(companyId) ??
        savedPrefsMap.get(companyId) ??
        getDefaultPref(selectedConsultantId, companyId)
      );
    },
    [edits, savedPrefsMap, selectedConsultantId]
  );

  const toggleField = useCallback(
    (companyId: string, field: CategoryKey | ChannelKey) => {
      const current = getPref(companyId);
      setEdits((prev) => {
        const next = new Map(prev);
        next.set(companyId, { ...current, [field]: !current[field] });
        return next;
      });
    },
    [getPref]
  );

  const handleConsultantChange = useCallback((id: string) => {
    setSelectedConsultantId(id);
    setEdits(new Map());
  }, []);

  const handleSave = useCallback(async () => {
    if (edits.size === 0) return;
    await bulkUpsert.mutateAsync(Array.from(edits.values()));
    setEdits(new Map());
  }, [edits, bulkUpsert]);

  const isLoading = usersLoading || companiesLoading;

  return (
    <div className="space-y-4">
      {/* Consultant selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Consultor:</label>
        <select
          value={selectedConsultantId}
          onChange={(e) => handleConsultantChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-w-[240px]"
        >
          <option value="">Seleccionar consultor...</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName || c.email} ({c.role})
            </option>
          ))}
        </select>

        {edits.size > 0 && (
          <Button
            onClick={handleSave}
            disabled={bulkUpsert.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {bulkUpsert.isPending ? 'Guardando...' : `Guardar (${edits.size})`}
          </Button>
        )}
      </div>

      {/* Loading */}
      {(isLoading || prefsLoading) && selectedConsultantId && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* No consultant selected */}
      {!selectedConsultantId && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          Selecciona un consultor para ver sus preferencias de alerta
        </div>
      )}

      {/* Table */}
      {selectedConsultantId && !prefsLoading && assignedCompanies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Empresa</th>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <th key={cat.key} className="text-center py-3 px-2 font-medium text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                      </div>
                    </th>
                  );
                })}
                <th className="text-center py-3 px-2 font-medium text-gray-700">Canales</th>
              </tr>
            </thead>
            <tbody>
              {assignedCompanies.map((company) => {
                const pref = getPref(company.id);
                const dirty = edits.has(company.id);
                return (
                  <tr
                    key={company.id}
                    className={cn(
                      'border-b border-gray-100 hover:bg-gray-50',
                      dirty && 'bg-primary-50/50'
                    )}
                  >
                    <td className="py-2.5 px-4 font-medium text-gray-900">{company.name}</td>
                    {CATEGORIES.map((cat) => (
                      <td key={cat.key} className="text-center py-2.5 px-2">
                        <button
                          onClick={() => toggleField(company.id, cat.key)}
                          className={cn(
                            'w-6 h-6 rounded border-2 transition-colors inline-flex items-center justify-center',
                            pref[cat.key]
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                          )}
                        >
                          {pref[cat.key] && (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M3 7l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="text-center py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => toggleField(company.id, 'slackEnabled')}
                          className={cn(
                            'px-1.5 py-0.5 text-xs rounded font-medium transition-colors',
                            pref.slackEnabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          S
                        </button>
                        <button
                          onClick={() => toggleField(company.id, 'emailEnabled')}
                          className={cn(
                            'px-1.5 py-0.5 text-xs rounded font-medium transition-colors',
                            pref.emailEnabled
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          E
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* No companies */}
      {selectedConsultantId && !prefsLoading && assignedCompanies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Este consultor no tiene empresas asignadas
        </div>
      )}

      {/* Error */}
      {bulkUpsert.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Error al guardar: {bulkUpsert.error instanceof Error ? bulkUpsert.error.message : 'Error desconocido'}
        </div>
      )}
    </div>
  );
}
