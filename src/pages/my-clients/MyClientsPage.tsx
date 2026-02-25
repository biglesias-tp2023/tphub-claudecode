import { useState, useMemo, useCallback } from 'react';
import { Search, Save, Bell } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { useProfile } from '@/stores/authStore';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import {
  useAlertPreferences,
  useBulkUpsertAlertPreferences,
} from '@/features/my-clients/hooks/useAlertPreferences';
import { CompanyAlertCard } from '@/features/my-clients/components/CompanyAlertCard';
import type { AlertPreferenceInput } from '@/services/alertPreferences';

export function MyClientsPage() {
  const profile = useProfile();
  const consultantId = profile?.id ?? '';

  // Fetch all companies + filter to assigned
  const { data: allCompanies = [], isLoading: companiesLoading } = useCompanies();
  const { data: savedPrefs = [], isLoading: prefsLoading } = useAlertPreferences(consultantId);
  const bulkUpsert = useBulkUpsertAlertPreferences();

  const [search, setSearch] = useState('');
  // Local edits: Map<companyId, AlertPreferenceInput>
  const [edits, setEdits] = useState<Map<string, AlertPreferenceInput>>(new Map());

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

  // Build a map from saved preferences
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

  // Get current value for a company (edit > saved > defaults)
  const getPref = useCallback(
    (companyId: string): AlertPreferenceInput | null => {
      return edits.get(companyId) ?? savedPrefsMap.get(companyId) ?? null;
    },
    [edits, savedPrefsMap]
  );

  // Check if a company has unsaved edits
  const isDirty = useCallback(
    (companyId: string): boolean => edits.has(companyId),
    [edits]
  );

  const hasDirtyChanges = edits.size > 0;

  const handleChange = useCallback(
    (companyId: string, pref: AlertPreferenceInput) => {
      setEdits((prev) => {
        const next = new Map(prev);
        next.set(companyId, pref);
        return next;
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (edits.size === 0) return;
    const inputs = Array.from(edits.values());
    await bulkUpsert.mutateAsync(inputs);
    setEdits(new Map());
  }, [edits, bulkUpsert]);

  const isLoading = companiesLoading || prefsLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Clientes</h1>
          <p className="text-gray-500 mt-1">
            Configura alertas diarias por empresa
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasDirtyChanges || bulkUpsert.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {bulkUpsert.isPending ? 'Guardando...' : 'Guardar todo'}
          {hasDirtyChanges && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {edits.size}
            </span>
          )}
        </Button>
      </div>

      {/* Search */}
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

      {/* Content */}
      {isLoading ? (
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
              : 'No tienes empresas asignadas. Contacta con un administrador para que te asigne empresas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCompanies.map((company) => (
            <CompanyAlertCard
              key={company.id}
              companyId={company.id}
              companyName={company.name}
              consultantId={consultantId}
              preference={getPref(company.id)}
              onChange={(pref) => handleChange(company.id, pref)}
              dirty={isDirty(company.id)}
            />
          ))}
        </div>
      )}

      {/* Bulk save error */}
      {bulkUpsert.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Error al guardar: {bulkUpsert.error instanceof Error ? bulkUpsert.error.message : 'Error desconocido'}
        </div>
      )}
    </div>
  );
}
