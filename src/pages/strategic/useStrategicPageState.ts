import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useSessionState } from '@/features/controlling/hooks';
import { expandBrandIds, expandRestaurantIds } from '@/hooks/idExpansion';
import { useBrands } from '@/hooks/useBrands';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import { fetchCrpCompanyById } from '@/services/crp-portal';
import {
  useStrategicObjectives,
  useCreateStrategicObjective,
  useUpdateStrategicObjective,
  useDeleteStrategicObjective,
  useStrategicTasks,
  useCreateStrategicTask,
  useUpdateStrategicTask,
  useToggleStrategicTaskCompleted,
  useDeleteStrategicTask,
  useGenerateTasksForObjective,
  useProfiles,
  useActualRevenueByMonth,
  useSalesProjection,
  useSalesProjectionsBulk,
  useUpsertSalesProjection,
  useUpdateSalesProjectionTargets,
} from '@/features/strategic/hooks';
import { upsertSalesProjection as upsertSalesProjectionService } from '@/services/supabase-data';
import {
  exportObjectivesToPDF,
  exportObjectivesToExcel,
  exportObjectivesToCSV,
  type ObjectiveExportData,
} from '@/utils/export';
import type { ExportFormat } from '@/components/common';
import type {
  StrategicObjective,
  StrategicObjectiveInput,
  StrategicTaskWithDetails,
  StrategicTaskInput,
  ObjectiveHorizon,
  ObjectiveCategory,
  ObjectiveStatus,
  SalesProjectionConfig,
  SalesProjectionData,
  GridChannelMonthData,
  ChannelMonthEntry,
} from '@/types';

// ============================================
// CONSTANTS
// ============================================

const LEGACY_PROJECTION_KEY = 'tphub_sales_projection';       // v1: single projection
const LEGACY_PROJECTIONS_KEY = 'tphub_sales_projections';     // v2: dev-mode array
const WARNING_DISMISSED_KEY = 'tphub_warning_dismissed';

// ============================================
// HELPERS
// ============================================

/**
 * Aggregate multiple SalesProjectionData into a single virtual projection.
 * Sums targetRevenue, targetAds, targetPromos and baselineRevenue across all projections.
 * Takes the union of active channels and the widest date range.
 */
function aggregateSalesProjections(projections: SalesProjectionData[]): SalesProjectionData {
  const sumGrid = (grids: GridChannelMonthData[]): GridChannelMonthData => {
    const result: GridChannelMonthData = {};
    for (const grid of grids) {
      for (const [monthKey, entry] of Object.entries(grid)) {
        if (!result[monthKey]) {
          result[monthKey] = { glovo: 0, ubereats: 0, justeat: 0 };
        }
        result[monthKey].glovo += entry.glovo;
        result[monthKey].ubereats += entry.ubereats;
        result[monthKey].justeat += entry.justeat;
      }
    }
    return result;
  };

  const sumBaseline = (baselines: ChannelMonthEntry[]): ChannelMonthEntry => {
    const result: ChannelMonthEntry = { glovo: 0, ubereats: 0, justeat: 0 };
    for (const b of baselines) {
      result.glovo += b.glovo;
      result.ubereats += b.ubereats;
      result.justeat += b.justeat;
    }
    return result;
  };

  // Union of active channels
  const allChannels = new Set(projections.flatMap(p => p.config.activeChannels));

  // Widest date range
  const startDates = projections.map(p => p.config.startDate).filter(Boolean).sort();
  const endDates = projections.map(p => p.config.endDate).filter(Boolean).sort();

  return {
    id: '__aggregated__',
    companyId: '__multi__',
    brandId: null,
    addressId: null,
    config: {
      activeChannels: Array.from(allChannels),
      investmentMode: 'global',
      maxAdsPercent: 0,
      maxPromosPercent: 0,
      startDate: startDates[0] || '',
      endDate: endDates[endDates.length - 1] || '',
    },
    baselineRevenue: sumBaseline(projections.map(p => p.baselineRevenue)),
    targetRevenue: sumGrid(projections.map(p => p.targetRevenue)),
    targetAds: sumGrid(projections.map(p => p.targetAds)),
    targetPromos: sumGrid(projections.map(p => p.targetPromos)),
    createdBy: null,
    updatedBy: null,
    createdAt: '',
    updatedAt: '',
  };
}

// ============================================
// HOOK
// ============================================

export function useStrategicPageState() {
  // Toast notifications
  const { toasts, closeToast, success, error } = useToast();
  const queryClient = useQueryClient();

  // State for objective modals
  const [isObjectiveEditorOpen, setIsObjectiveEditorOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<StrategicObjective | undefined>();

  // State for task modals
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StrategicTaskWithDetails | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // State for sales projection modals
  // setupScope tracks the intended scope when the wizard opens:
  //   null = closed, { brandId: null, addressId: null } = company-level, etc.
  const [setupScope, setSetupScope] = useState<{ brandId: string | null; addressId: string | null } | null>(null);
  const isSetupOpen = setupScope !== null;
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  // Persisted filter states
  const [selectedCategory, setSelectedCategory] = useSessionState<ObjectiveCategory | 'all'>('tphub-st-category', 'all');
  const [selectedStatus, setSelectedStatus] = useSessionState<ObjectiveStatus | 'all'>('tphub-st-status', 'all');
  const [searchQuery, setSearchQuery] = useSessionState<string>('tphub-st-search', '');

  // Expanded sections (persisted)
  const [expandedHorizons, setExpandedHorizons] = useSessionState<Record<ObjectiveHorizon, boolean>>('tphub-st-horizons', {
    short: true,
    medium: true,
    long: false,
  });

  // Data hooks - Objectives
  const {
    objectives,
    objectivesByHorizon,
    stats: objectiveStats,
    restaurants,
    companyIds,
    isLoading: isLoadingObjectives,
    error: objectivesError,
  } = useStrategicObjectives();

  // Data hooks - Strategic Tasks
  const {
    tasksByDate,
    sortedDates,
    stats: taskStats,
    taskCountByObjectiveId,
    isLoading: isLoadingTasks,
  } = useStrategicTasks();

  const { data: profiles = [] } = useProfiles();

  // Filter stores for real sales data
  const { companyIds: globalCompanyIds } = useGlobalFiltersStore();
  const {
    brandIds: filterBrandIds,
    restaurantIds: filterRestaurantIds,
  } = useDashboardFiltersStore();

  const effectiveCompanyIds = globalCompanyIds.length > 0 ? globalCompanyIds : companyIds;

  // Expand multi-portal IDs for brand/restaurant filters
  const { data: allBrands = [] } = useBrands();
  const { data: allRestaurants = [] } = useRestaurants();

  const expandedBrandIds = useMemo(
    () => expandBrandIds(filterBrandIds, allBrands),
    [filterBrandIds, allBrands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(filterRestaurantIds, allRestaurants),
    [filterRestaurantIds, allRestaurants]
  );

  // Scope-aware IDs for the wizard: derived from setupScope, not global filters.
  // This ensures the baseline revenue matches the scope being configured.
  const wizardBrandIds = useMemo(() => {
    if (!setupScope?.brandId) return undefined;
    return expandBrandIds([setupScope.brandId], allBrands);
  }, [setupScope, allBrands]);

  const wizardAddressIds = useMemo(() => {
    if (!setupScope?.addressId) return undefined;
    return expandRestaurantIds([setupScope.addressId], allRestaurants);
  }, [setupScope, allRestaurants]);

  // Resolve primary company: when a brand is selected, use its parent company
  // so the projection lookup matches even with 2+ companies selected.
  const primaryCompanyId = useMemo(() => {
    if (filterBrandIds.length > 0 && allBrands.length > 0) {
      const brand = allBrands.find(b => filterBrandIds.includes(b.id));
      if (brand?.companyId && effectiveCompanyIds.includes(brand.companyId)) {
        return brand.companyId;
      }
    }
    return effectiveCompanyIds.length > 0
      ? effectiveCompanyIds[effectiveCompanyIds.length - 1]
      : '';
  }, [filterBrandIds, allBrands, effectiveCompanyIds]);

  // Resolve primary brand ID for scope-aware projection loading
  const primaryBrandId = useMemo(() => {
    if (filterBrandIds.length > 0) {
      return filterBrandIds[0];
    }
    return null;
  }, [filterBrandIds]);

  // Resolve primary address ID for address-level projection loading
  const primaryAddressId = useMemo(() => {
    if (filterRestaurantIds.length > 0) {
      return filterRestaurantIds[0];
    }
    return null;
  }, [filterRestaurantIds]);

  // Commissions from CRP Portal (for rentabilidad scorecard)
  const { data: allCompanies = [] } = useCompanies();
  const commissions = useMemo(() => {
    const company = allCompanies.find(c => effectiveCompanyIds.includes(c.id));
    return {
      glovo: (company?.commissionGlovo ?? 0.30) * 100,
      ubereats: (company?.commissionUbereats ?? 0.30) * 100,
      justeat: 30,
    };
  }, [allCompanies, effectiveCompanyIds]);

  // ============================================
  // SALES PROJECTION (Supabase-backed)
  // ============================================

  // Address-level projection (most specific)
  const {
    data: addressProjection = null,
    isLoading: isLoadingAddressProjection,
  } = useSalesProjection({ companyId: primaryCompanyId, brandId: primaryBrandId, addressId: primaryAddressId });

  // Brand-level projection (mid-level)
  const {
    data: brandProjection = null,
    isLoading: isLoadingBrandProjection,
  } = useSalesProjection({ companyId: primaryCompanyId, brandId: primaryBrandId });

  // Company-level projection (fallback)
  const {
    data: companyProjection = null,
    isLoading: isLoadingCompanyProjection,
  } = useSalesProjection({
    companyId: primaryCompanyId,
    brandId: null,
  });

  // ============================================
  // MULTI-COMPANY AGGREGATION
  // ============================================

  const isMultiCompany = effectiveCompanyIds.length > 1;

  const { data: bulkProjections = [], isLoading: isLoadingBulk } =
    useSalesProjectionsBulk(isMultiCompany ? effectiveCompanyIds : []);

  // Aggregate all company-level projections: sum targets per month×channel
  const aggregatedProjection = useMemo((): SalesProjectionData | null => {
    if (!isMultiCompany || bulkProjections.length === 0) return null;
    return aggregateSalesProjections(bulkProjections);
  }, [isMultiCompany, bulkProjections]);

  // How many selected companies have a projection (for UI feedback)
  const multiCompanyProjectionCount = isMultiCompany ? bulkProjections.length : 0;

  // Single company: use fallback chain (address → brand → company)
  // Multi company: use aggregated projection from all company-level projections
  const singleCompanyProjection = addressProjection ?? brandProjection ?? companyProjection;
  const salesProjection = isMultiCompany ? aggregatedProjection : singleCompanyProjection;
  const _isLoadingProjection = isMultiCompany
    ? isLoadingBulk
    : (isLoadingAddressProjection || isLoadingBrandProjection || (primaryBrandId ? isLoadingCompanyProjection : false));
  void _isLoadingProjection; // reserved for future use

  // Projection-scope-aware IDs for real revenue:
  // When the active projection is at brand/address level but the dashboard store has no
  // brand/address filter, automatically scope real data to match the projection scope.
  const projectionScopeBrandIds = useMemo(() => {
    if (expandedBrandIds.length > 0) return expandedBrandIds;
    if (!salesProjection?.brandId) return [];
    return expandBrandIds([salesProjection.brandId], allBrands);
  }, [expandedBrandIds, salesProjection?.brandId, allBrands]);

  const projectionScopeAddressIds = useMemo(() => {
    if (expandedRestaurantIds.length > 0) return expandedRestaurantIds;
    if (!salesProjection?.addressId) return [];
    return expandRestaurantIds([salesProjection.addressId], allRestaurants);
  }, [expandedRestaurantIds, salesProjection?.addressId, allRestaurants]);

  // Real revenue, promos, and ads by month for the SalesProjection grid rows and scorecards
  const revenueParams = {
    companyIds: effectiveCompanyIds,
    brandIds: projectionScopeBrandIds.length > 0 ? projectionScopeBrandIds : undefined,
    addressIds: projectionScopeAddressIds.length > 0 ? projectionScopeAddressIds : undefined,
    monthOffsets: [-2, -1, 0, 1, 2, 3] as number[],
  };
  const { revenueByMonth: realRevenueByMonth, promosByMonth: realPromosByMonth, adsByMonth: realAdsByMonth } = useActualRevenueByMonth(revenueParams);

  // Fallback info: which level is being shown vs which was requested
  const fallbackInfo = useMemo(() => {
    if (isMultiCompany) return null; // No fallback info in multi-company mode
    if (primaryAddressId) {
      if (addressProjection) return null;
      if (brandProjection) return { level: 'brand' as const, targetScope: 'address' as const };
      if (companyProjection) return { level: 'company' as const, targetScope: 'address' as const };
      return null;
    }
    if (primaryBrandId) {
      if (brandProjection) return null;
      if (companyProjection) return { level: 'company' as const, targetScope: 'brand' as const };
      return null;
    }
    return null;
  }, [isMultiCompany, primaryAddressId, primaryBrandId, addressProjection, brandProjection, companyProjection]);

  const upsertProjection = useUpsertSalesProjection();
  const updateProjectionTargets = useUpdateSalesProjectionTargets();

  // One-time migration: localStorage → Supabase (both legacy keys)
  const migrationDone = useRef(false);
  useEffect(() => {
    if (migrationDone.current || !primaryCompanyId) return;
    migrationDone.current = true;

    const upserts: Promise<unknown>[] = [];

    // v1: single legacy projection (tphub_sales_projection)
    const v1 = localStorage.getItem(LEGACY_PROJECTION_KEY);
    if (v1) {
      try {
        const legacy = JSON.parse(v1);
        upserts.push(
          upsertSalesProjectionService({
            companyId: primaryCompanyId,
            config: legacy.config,
            baselineRevenue: legacy.baselineRevenue ?? { glovo: 0, ubereats: 0, justeat: 0 },
            targetRevenue: legacy.targetRevenue ?? {},
            targetAds: legacy.targetAds ?? {},
            targetPromos: legacy.targetPromos ?? {},
          }).then(() => localStorage.removeItem(LEGACY_PROJECTION_KEY))
        );
      } catch { /* ignore corrupt data */ }
    }

    // v2: dev-mode array (tphub_sales_projections)
    const v2 = localStorage.getItem(LEGACY_PROJECTIONS_KEY);
    if (v2) {
      try {
        const projections: SalesProjectionData[] = JSON.parse(v2);
        for (const p of projections) {
          upserts.push(
            upsertSalesProjectionService({
              companyId: p.companyId,
              brandId: p.brandId,
              addressId: p.addressId,
              config: p.config,
              baselineRevenue: p.baselineRevenue ?? { glovo: 0, ubereats: 0, justeat: 0 },
              targetRevenue: p.targetRevenue ?? {},
              targetAds: p.targetAds ?? {},
              targetPromos: p.targetPromos ?? {},
            })
          );
        }
        // Remove after all succeed
        Promise.all(upserts).then(() => {
          localStorage.removeItem(LEGACY_PROJECTIONS_KEY);
          // Refresh all projection queries
          queryClient.invalidateQueries({ queryKey: ['sales-projections'] });
          if (import.meta.env.DEV) console.log(`[migration] Migrated ${projections.length} projections to Supabase`);
        }).catch(() => {
          // Partial failure — keep localStorage, will retry next time
          migrationDone.current = false;
        });
        return; // v2 handles its own invalidation
      } catch { /* ignore corrupt data */ }
    }

    // If only v1 ran, invalidate
    if (upserts.length > 0) {
      Promise.all(upserts).then(() => {
        queryClient.invalidateQueries({ queryKey: ['sales-projections'] });
      }).catch(() => {
        migrationDone.current = false;
      });
    }
  }, [primaryCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for 60-day warning
  useEffect(() => {
    if (!salesProjection) return;

    const warningDismissed = localStorage.getItem(WARNING_DISMISSED_KEY);
    const endDate = new Date(salesProjection.config.endDate);
    const today = new Date();
    const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (remaining <= 60 && remaining > 0) {
      const dismissedDate = warningDismissed ? new Date(warningDismissed) : null;
      const isSameDay = dismissedDate &&
        dismissedDate.toDateString() === today.toDateString();

      if (!isSameDay) {
        setIsWarningOpen(true);
      }
    }
  }, [salesProjection]);

  // Mutations - Objectives
  const createObjective = useCreateStrategicObjective();
  const updateObjective = useUpdateStrategicObjective();
  const deleteObjective = useDeleteStrategicObjective();
  const generateTasks = useGenerateTasksForObjective();

  // Mutations - Tasks
  const createTask = useCreateStrategicTask();
  const updateTask = useUpdateStrategicTask();
  const toggleTaskCompleted = useToggleStrategicTaskCompleted();
  const deleteTask = useDeleteStrategicTask();

  // Default restaurant ID
  const defaultRestaurantId = restaurants[0]?.id;

  // Combined filter: category + status + search
  const filteredObjectivesByHorizon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filterList = (list: typeof objectivesByHorizon.short) =>
      list.filter((o) => {
        if (selectedCategory !== 'all' && o.category !== selectedCategory) return false;
        if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
        if (normalizedQuery && !o.title.toLowerCase().includes(normalizedQuery)) return false;
        return true;
      });

    const sortByDeadline = (list: typeof objectivesByHorizon.short) =>
      [...list].sort((a, b) => {
        if (!a.evaluationDate && !b.evaluationDate) return 0;
        if (!a.evaluationDate) return 1;
        if (!b.evaluationDate) return -1;
        return a.evaluationDate.localeCompare(b.evaluationDate);
      });

    return {
      short: sortByDeadline(filterList(objectivesByHorizon.short)),
      medium: sortByDeadline(filterList(objectivesByHorizon.medium)),
      long: sortByDeadline(filterList(objectivesByHorizon.long)),
    };
  }, [objectivesByHorizon, selectedCategory, selectedStatus, searchQuery]);

  // Category counts (unaffected by category filter itself)
  const categoryCountMap = useMemo(() => {
    const counts: Record<string, number> = { all: objectives.length };
    for (const o of objectives) {
      counts[o.category] = (counts[o.category] || 0) + 1;
    }
    return counts;
  }, [objectives]);

  // At-risk count: non-completed objectives with deadline ≤ 14 days from now
  const atRiskCount = useMemo(() => {
    const now = new Date();
    const threshold = 14 * 24 * 60 * 60 * 1000;
    return objectives.filter((o) => {
      if (o.status === 'completed') return false;
      if (!o.evaluationDate) return false;
      const remaining = new Date(o.evaluationDate).getTime() - now.getTime();
      return remaining > 0 && remaining <= threshold;
    }).length;
  }, [objectives]);

  // Flat list of all filtered objectives (for export)
  const filteredObjectives = useMemo(() => [
    ...filteredObjectivesByHorizon.short,
    ...filteredObjectivesByHorizon.medium,
    ...filteredObjectivesByHorizon.long,
  ], [filteredObjectivesByHorizon]);

  // Flat list of all tasks (for export)
  const tasks = useMemo(() =>
    Object.values(tasksByDate).flat(),
  [tasksByDate]);

  // ============================================
  // HANDLERS - Sales Projection
  // ============================================

  const handleSetupComplete = useCallback(async (
    config: SalesProjectionConfig,
    targetRevenue: GridChannelMonthData,
    baselineRevenue: ChannelMonthEntry
  ) => {
    if (!setupScope) return;
    try {
      await upsertProjection.mutateAsync({
        companyId: primaryCompanyId,
        brandId: setupScope.brandId,
        addressId: setupScope.addressId,
        config,
        baselineRevenue,
        targetRevenue,
        targetAds: {},
        targetPromos: {},
      });
      setSetupScope(null);
      success('Proyección de ventas creada');
    } catch {
      error('Error al crear proyección');
    }
  }, [setupScope, primaryCompanyId, upsertProjection, success, error]);

  // Open setup wizard with explicit scope
  const openSetupForCompany = useCallback(() => {
    setSetupScope({ brandId: null, addressId: null });
  }, []);

  const openSetupForBrand = useCallback(() => {
    setSetupScope({ brandId: primaryBrandId, addressId: null });
  }, [primaryBrandId]);

  const openSetupForAddress = useCallback(() => {
    setSetupScope({ brandId: primaryBrandId, addressId: primaryAddressId });
  }, [primaryBrandId, primaryAddressId]);

  const openSetupForExisting = useCallback(() => {
    if (salesProjection) {
      setSetupScope({ brandId: salesProjection.brandId, addressId: salesProjection.addressId });
    }
  }, [salesProjection]);

  const closeSetup = useCallback(() => setSetupScope(null), []);

  const handleUpdateTargetRevenue = useCallback((data: GridChannelMonthData) => {
    if (!salesProjection) return;
    updateProjectionTargets.mutate({
      id: salesProjection.id,
      companyId: salesProjection.companyId,
      brandId: salesProjection.brandId,
      addressId: salesProjection.addressId,
      updates: { targetRevenue: data },
    });
  }, [salesProjection, updateProjectionTargets]);

  const handleDismissWarning = useCallback(() => {
    setIsWarningOpen(false);
    localStorage.setItem(WARNING_DISMISSED_KEY, new Date().toISOString());
  }, []);

  const handleCreateNewFromWarning = useCallback(() => {
    setIsWarningOpen(false);
    // Renew at the same scope as the current projection
    setSetupScope({
      brandId: salesProjection?.brandId ?? null,
      addressId: salesProjection?.addressId ?? null,
    });
  }, [salesProjection]);

  // ============================================
  // HANDLERS - Objectives
  // ============================================

  const handleOpenObjectiveEditor = useCallback(() => {
    setSelectedObjective(undefined);
    setIsObjectiveEditorOpen(true);
  }, []);

  const handleEditObjective = useCallback((objective: StrategicObjective) => {
    setSelectedObjective(objective);
    setIsObjectiveEditorOpen(true);
  }, []);

  const handleSaveObjective = useCallback(async (input: StrategicObjectiveInput) => {
    try {
      if (selectedObjective) {
        await updateObjective.mutateAsync({
          id: selectedObjective.id,
          updates: input,
        });
        success('Objetivo actualizado');
      } else {
        const newObjective = await createObjective.mutateAsync(input);
        try {
          const company = input.companyId ? await fetchCrpCompanyById(input.companyId) : null;
          const generatedTasks = await generateTasks.mutateAsync({
            objective: newObjective,
            companyName: company?.name,
          });
          if (generatedTasks.length > 0) {
            success(`Objetivo creado con ${generatedTasks.length} tareas`);
          } else {
            success('Objetivo creado');
          }
        } catch {
          success('Objetivo creado');
        }
      }
    } catch {
      error('Error al guardar');
    }
  }, [selectedObjective, updateObjective, createObjective, generateTasks, success, error]);

  const handleStatusChange = useCallback(async (id: string, status: ObjectiveStatus) => {
    try {
      await updateObjective.mutateAsync({ id, updates: { status } });
    } catch {
      error('Error al actualizar');
    }
  }, [updateObjective, error]);

  const handleDeleteObjective = useCallback(async () => {
    if (!selectedObjective) return;
    try {
      await deleteObjective.mutateAsync(selectedObjective.id);
      setIsObjectiveEditorOpen(false);
      setSelectedObjective(undefined);
      success('Objetivo eliminado');
    } catch {
      error('Error al eliminar');
    }
  }, [selectedObjective, deleteObjective, success, error]);

  const handleCloseObjectiveEditor = useCallback(() => {
    setIsObjectiveEditorOpen(false);
    setSelectedObjective(undefined);
  }, []);

  // ============================================
  // HANDLER - Export Objectives
  // ============================================

  const handleExportObjectives = useCallback((format: ExportFormat) => {
    const restaurant = restaurants.find((r) => r.id === defaultRestaurantId);
    const restaurantName = restaurant?.name || 'Restaurante';

    const exportData: ObjectiveExportData[] = filteredObjectives.map((obj) => {
      const objTasks = tasks.filter((t) => t.objectiveId === obj.id);
      const daysRemaining = obj.evaluationDate
        ? Math.ceil((new Date(obj.evaluationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      const progress = obj.kpiCurrentValue && obj.kpiTargetValue
        ? Math.round((obj.kpiCurrentValue / obj.kpiTargetValue) * 100)
        : undefined;

      const statusLabels: Record<string, string> = {
        in_progress: 'En progreso',
        completed: 'Completado',
        cancelled: 'Cancelado',
      };

      const responsibleLabels: Record<string, string> = {
        thinkpaladar: 'ThinkPaladar',
        cliente: 'Cliente',
        ambos: 'Ambos',
        plataforma: 'Plataforma',
      };

      const categoryLabels: Record<string, string> = {
        finanzas: 'Finanzas',
        operaciones: 'Operaciones',
        clientes: 'Clientes',
        marca: 'Marca',
        reputacion: 'Reputación',
        proveedores: 'Proveedores',
        menu: 'Menú',
      };

      return {
        id: obj.id,
        title: obj.title,
        category: categoryLabels[obj.category] || obj.category,
        status: statusLabels[obj.status] || obj.status,
        responsible: responsibleLabels[obj.responsible] || obj.responsible,
        deadline: obj.evaluationDate || '-',
        daysRemaining,
        kpiCurrent: obj.kpiCurrentValue ?? undefined,
        kpiTarget: obj.kpiTargetValue ?? undefined,
        kpiUnit: obj.kpiUnit ?? undefined,
        progress,
        tasks: objTasks.map((t) => ({
          title: t.title,
          responsible: responsibleLabels[t.responsible] || t.responsible,
          deadline: t.deadline ? new Date(t.deadline).toLocaleDateString('es-ES') : '-',
          isCompleted: t.isCompleted,
        })),
      };
    });

    switch (format) {
      case 'pdf':
        exportObjectivesToPDF(exportData, restaurantName);
        break;
      case 'excel':
        exportObjectivesToExcel(exportData, restaurantName);
        break;
      case 'csv':
        exportObjectivesToCSV(exportData, restaurantName);
        break;
    }
  }, [restaurants, defaultRestaurantId, filteredObjectives, tasks]);

  // ============================================
  // HANDLERS - Tasks
  // ============================================

  const handleOpenTaskEditor = useCallback(() => {
    setSelectedTask(null);
    setIsTaskEditorOpen(true);
  }, []);

  const handleTaskClick = useCallback((task: StrategicTaskWithDetails) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleEditTask = useCallback(() => {
    setIsTaskDetailOpen(false);
    setIsTaskEditorOpen(true);
  }, []);

  const handleSaveTask = useCallback(async (input: StrategicTaskInput) => {
    try {
      if (selectedTask) {
        await updateTask.mutateAsync({ id: selectedTask.id, updates: input });
        success('Tarea actualizada');
      } else {
        await createTask.mutateAsync(input);
        success('Tarea creada');
      }
    } catch {
      error('Error al guardar');
    }
  }, [selectedTask, updateTask, createTask, success, error]);

  const handleToggleTaskComplete = useCallback(async (taskId: string) => {
    try {
      await toggleTaskCompleted.mutateAsync(taskId);
    } catch {
      error('Error al actualizar');
    }
  }, [toggleTaskCompleted, error]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    try {
      await deleteTask.mutateAsync(selectedTask.id);
      setIsTaskDetailOpen(false);
      setSelectedTask(null);
      success('Tarea eliminada');
    } catch {
      error('Error al eliminar');
    }
  }, [selectedTask, deleteTask, success, error]);

  const handleCloseTaskDetail = useCallback(() => {
    setIsTaskDetailOpen(false);
    setSelectedTask(null);
  }, []);

  const handleCloseTaskEditor = useCallback(() => {
    setIsTaskEditorOpen(false);
    setSelectedTask(null);
  }, []);

  const toggleHorizon = useCallback((horizon: ObjectiveHorizon) => {
    setExpandedHorizons((prev) => ({ ...prev, [horizon]: !prev[horizon] }));
  }, []);

  // Computed values
  const isLoading = isLoadingObjectives || isLoadingTasks;
  const fetchError = objectivesError;
  const hasObjectives = objectives.length > 0;
  const hasSalesProjection = salesProjection !== null;
  const daysRemaining = salesProjection
    ? Math.ceil((new Date(salesProjection.config.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    // Toast
    toasts,
    closeToast,

    // Loading/error state
    isLoading,
    error: fetchError,

    // Computed flags
    hasObjectives,
    hasSalesProjection,
    fallbackInfo,
    daysRemaining,
    isMultiCompany,
    multiCompanyProjectionCount,

    // Data
    objectives,
    objectiveStats,
    filteredObjectivesByHorizon,
    restaurants,
    companyIds,
    effectiveCompanyIds,
    primaryCompanyId,
    primaryBrandId,
    primaryAddressId,
    allCompanies,
    allBrands,
    allRestaurants,
    filterBrandIds,
    filterRestaurantIds,
    expandedBrandIds,
    expandedRestaurantIds,
    wizardBrandIds,
    wizardAddressIds,
    profiles,
    tasksByDate,
    sortedDates,
    taskStats,
    taskCountByObjectiveId,
    realRevenueByMonth,
    realPromosByMonth,
    realAdsByMonth,
    commissions,
    salesProjection,
    defaultRestaurantId,

    // Filter state
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    categoryCountMap,
    atRiskCount,
    expandedHorizons,
    toggleHorizon,

    // Modal state - Objectives
    isObjectiveEditorOpen,
    selectedObjective,
    handleOpenObjectiveEditor,
    handleEditObjective,
    handleSaveObjective,
    handleStatusChange,
    handleDeleteObjective,
    handleCloseObjectiveEditor,
    handleExportObjectives,

    // Modal state - Tasks
    isTaskEditorOpen,
    isTaskDetailOpen,
    selectedTask,
    handleOpenTaskEditor,
    handleTaskClick,
    handleEditTask,
    handleSaveTask,
    handleToggleTaskComplete,
    handleDeleteTask,
    handleCloseTaskDetail,
    handleCloseTaskEditor,

    // Modal state - Sales Projection
    isSetupOpen,
    openSetupForCompany,
    openSetupForBrand,
    openSetupForAddress,
    openSetupForExisting,
    closeSetup,
    isWarningOpen,
    handleSetupComplete,
    handleUpdateTargetRevenue,
    handleDismissWarning,
    handleCreateNewFromWarning,

    // Mutation states (for loading indicators)
    isCreatingObjective: createObjective.isPending,
    isUpdatingObjective: updateObjective.isPending,
    isDeletingObjective: deleteObjective.isPending,
    isCreatingTask: createTask.isPending,
    isUpdatingTask: updateTask.isPending,
    isDeletingTask: deleteTask.isPending,
  };
}
