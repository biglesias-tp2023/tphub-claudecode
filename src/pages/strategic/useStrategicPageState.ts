import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useOrdersData } from '@/features/controlling/hooks';
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
} from '@/features/strategic/hooks';
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

const SALES_PROJECTION_KEY = 'tphub_sales_projection';
const WARNING_DISMISSED_KEY = 'tphub_warning_dismissed';

// ============================================
// HOOK
// ============================================

export function useStrategicPageState() {
  // Toast notifications
  const { toasts, closeToast, success, error } = useToast();

  // State for objective modals
  const [isObjectiveEditorOpen, setIsObjectiveEditorOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<StrategicObjective | undefined>();

  // State for task modals
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StrategicTaskWithDetails | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // State for sales projection
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [salesProjection, setSalesProjection] = useState<SalesProjectionData | null>(null);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<ObjectiveCategory | 'all'>('all');

  // Expanded sections
  const [expandedHorizons, setExpandedHorizons] = useState<Record<ObjectiveHorizon, boolean>>({
    short: true,
    medium: true,
    long: false,
  });

  // Load sales projection from localStorage
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = localStorage.getItem(SALES_PROJECTION_KEY);
    if (stored) {
      try {
        setSalesProjection(JSON.parse(stored));
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Check for 60-day warning
  useEffect(() => {
    if (!salesProjection) return;

    const warningDismissed = localStorage.getItem(WARNING_DISMISSED_KEY);
    const endDate = new Date(salesProjection.config.endDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 60 && daysRemaining > 0) {
      const dismissedDate = warningDismissed ? new Date(warningDismissed) : null;
      const isSameDay = dismissedDate &&
        dismissedDate.toDateString() === today.toDateString();

      if (!isSameDay) {
        setIsWarningOpen(true);
      }
    }
  }, [salesProjection]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save sales projection to localStorage
  const saveSalesProjection = useCallback((data: SalesProjectionData) => {
    setSalesProjection(data);
    localStorage.setItem(SALES_PROJECTION_KEY, JSON.stringify(data));
  }, []);

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
    channelIds: filterChannelIds,
    dateRange,
    datePreset,
  } = useDashboardFiltersStore();

  const effectiveCompanyIds = globalCompanyIds.length > 0 ? globalCompanyIds : companyIds;

  const { data: realSalesData, isLoading: isLoadingSales } = useOrdersData({
    companyIds: effectiveCompanyIds,
    brandIds: filterBrandIds.length > 0 ? filterBrandIds : undefined,
    addressIds: filterRestaurantIds.length > 0 ? filterRestaurantIds : undefined,
    channelIds: filterChannelIds.length > 0 ? filterChannelIds : undefined,
    dateRange,
    datePreset,
  });

  // Real revenue by month for the SalesProjection grid rows
  const { revenueByMonth: realRevenueByMonth } = useActualRevenueByMonth({
    companyIds: effectiveCompanyIds,
    brandIds: filterBrandIds.length > 0 ? filterBrandIds : undefined,
    addressIds: filterRestaurantIds.length > 0 ? filterRestaurantIds : undefined,
  });

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

  // Filter objectives by category
  const filteredObjectivesByHorizon = useMemo(() => {
    if (selectedCategory === 'all') {
      return objectivesByHorizon;
    }
    return {
      short: objectivesByHorizon.short.filter((o) => o.category === selectedCategory),
      medium: objectivesByHorizon.medium.filter((o) => o.category === selectedCategory),
      long: objectivesByHorizon.long.filter((o) => o.category === selectedCategory),
    };
  }, [objectivesByHorizon, selectedCategory]);

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

  const handleSetupComplete = useCallback((
    config: SalesProjectionConfig,
    targetRevenue: GridChannelMonthData,
    baselineRevenue: ChannelMonthEntry
  ) => {
    const newProjection: SalesProjectionData = {
      id: crypto.randomUUID(),
      restaurantId: defaultRestaurantId || '',
      config,
      baselineRevenue,
      targetRevenue,
      targetAds: {},
      targetPromos: {},
      actualRevenue: {},
      actualAds: {},
      actualPromos: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSalesProjection(newProjection);
    setIsSetupOpen(false);
    success('Proyección de ventas creada');
  }, [defaultRestaurantId, saveSalesProjection, success]);

  const handleUpdateTargetRevenue = useCallback((data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, targetRevenue: data, updatedAt: new Date().toISOString() });
  }, [salesProjection, saveSalesProjection]);

  const handleUpdateActualRevenue = useCallback((data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualRevenue: data, updatedAt: new Date().toISOString() });
  }, [salesProjection, saveSalesProjection]);

  const handleUpdateActualAds = useCallback((data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualAds: data, updatedAt: new Date().toISOString() });
  }, [salesProjection, saveSalesProjection]);

  const handleUpdateActualPromos = useCallback((data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualPromos: data, updatedAt: new Date().toISOString() });
  }, [salesProjection, saveSalesProjection]);

  const handleDismissWarning = useCallback(() => {
    setIsWarningOpen(false);
    localStorage.setItem(WARNING_DISMISSED_KEY, new Date().toISOString());
  }, []);

  const handleCreateNewFromWarning = useCallback(() => {
    setIsWarningOpen(false);
    setIsSetupOpen(true);
  }, []);

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
        pending: 'Pendiente',
        in_progress: 'En progreso',
        completed: 'Completado',
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
    isLoadingSales,
    error: fetchError,

    // Computed flags
    hasObjectives,
    hasSalesProjection,
    daysRemaining,

    // Data
    objectives,
    objectiveStats,
    filteredObjectivesByHorizon,
    restaurants,
    companyIds,
    effectiveCompanyIds,
    filterBrandIds,
    filterRestaurantIds,
    profiles,
    tasksByDate,
    sortedDates,
    taskStats,
    taskCountByObjectiveId,
    realSalesData,
    realRevenueByMonth,
    salesProjection,
    defaultRestaurantId,

    // Filter state
    selectedCategory,
    setSelectedCategory,
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
    setIsSetupOpen,
    isWarningOpen,
    handleSetupComplete,
    handleUpdateTargetRevenue,
    handleUpdateActualRevenue,
    handleUpdateActualAds,
    handleUpdateActualPromos,
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
