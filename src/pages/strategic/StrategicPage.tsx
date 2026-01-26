import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Users,
  Tag,
  Handshake,
  UtensilsCrossed,
  BarChart3,
  Zap,
  CircleDot,
  Sparkles,
} from 'lucide-react';
import { Card, Spinner, ToastContainer } from '@/components/ui';
import { ExportButtons, type ExportFormat } from '@/components/common';
import { useToast } from '@/hooks/useToast';
import {
  exportObjectivesToPDF,
  exportObjectivesToExcel,
  exportObjectivesToCSV,
  type ObjectiveExportData,
} from '@/utils/export';
import { DashboardFilters } from '@/features/dashboard';
import {
  ObjectiveCard,
  AddObjectiveCard,
  StrategicObjectiveEditor,
  StrategicTaskCalendar,
  StrategicTaskDetailModal,
  StrategicTaskEditor,
  SalesProjection,
  SalesProjectionSetup,
  SalesProjectionWarning,
} from '@/features/strategic/components';
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
  getHorizonInfo,
} from '@/features/strategic/hooks';
import { cn } from '@/utils/cn';
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
// LOCAL STORAGE KEYS
// ============================================

const SALES_PROJECTION_KEY = 'tphub_sales_projection';
const WARNING_DISMISSED_KEY = 'tphub_warning_dismissed';

// ============================================
// CATEGORY FILTER OPTIONS
// ============================================

const CATEGORY_FILTERS: { value: ObjectiveCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todos', icon: CircleDot },
  { value: 'finanzas', label: 'Finanzas', icon: TrendingUp },
  { value: 'operaciones', label: 'Operaciones', icon: Clock },
  { value: 'clientes', label: 'Clientes', icon: Users },
  { value: 'marca', label: 'Marca', icon: Tag },
  { value: 'reputacion', label: 'Reputación', icon: Star },
  { value: 'proveedores', label: 'Proveedores', icon: Handshake },
  { value: 'menu', label: 'Menú', icon: UtensilsCrossed },
];

// ============================================
// METRIC ITEM COMPONENT (Minimal)
// ============================================

interface MetricItemProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'danger';
}

function MetricItem({ label, value, icon: Icon, color = 'default' }: MetricItemProps) {
  const colorStyles = {
    default: 'text-gray-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={cn('text-xl font-semibold tabular-nums', colorStyles[color])}>{value}</p>
      </div>
    </div>
  );
}

// ============================================
// HORIZON SECTION COMPONENT
// ============================================

interface HorizonSectionProps {
  horizon: ObjectiveHorizon;
  objectives: StrategicObjective[];
  onAddClick: () => void;
  onObjectiveClick: (objective: StrategicObjective) => void;
  onStatusChange: (id: string, status: ObjectiveStatus) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function HorizonSection({
  horizon,
  objectives,
  onAddClick,
  onObjectiveClick,
  onStatusChange,
  isExpanded,
  onToggleExpand,
}: HorizonSectionProps) {
  const horizonInfo = getHorizonInfo(horizon);
  const completedCount = objectives.filter((o) => o.status === 'completed').length;
  const totalCount = objectives.length;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Section Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center transition-colors',
            isExpanded ? 'bg-gray-100' : 'bg-transparent group-hover:bg-gray-50'
          )}>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
          <span className="text-sm font-semibold text-gray-900">{horizonInfo.label}</span>
          <span className="text-xs text-gray-400">{horizonInfo.subtitle}</span>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-xs font-medium tabular-nums',
              completedCount === totalCount ? 'text-emerald-600' : 'text-gray-400'
            )}>
              {completedCount}/{totalCount}
            </span>
            {completedCount === totalCount && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
        )}
      </button>

      {/* Objectives Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 ml-7">
          {objectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onClick={() => onObjectiveClick(objective)}
              onStatusChange={onStatusChange}
            />
          ))}
          <AddObjectiveCard horizon={horizon} onClick={onAddClick} />
        </div>
      )}
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  onSetupClick: () => void;
}

function EmptyState({ onSetupClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
        Todavía no tienes ningún objetivo
      </h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
        Es el momento de empezar a definir tu estrategia de ventas. Configura tus canales, inversiones y objetivos mensuales.
      </p>
      <button
        onClick={onSetupClick}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
      >
        <TrendingUp className="w-5 h-5" />
        Configurar proyección de ventas
      </button>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function StrategicPage() {
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

    // Show warning if less than 60 days and not dismissed today
    if (daysRemaining <= 60 && daysRemaining > 0) {
      const dismissedDate = warningDismissed ? new Date(warningDismissed) : null;
      const isSameDay = dismissedDate &&
        dismissedDate.toDateString() === today.toDateString();

      if (!isSameDay) {
        setIsWarningOpen(true);
      }
    }
  }, [salesProjection]);

  // Save sales projection to localStorage
  const saveSalesProjection = (data: SalesProjectionData) => {
    setSalesProjection(data);
    localStorage.setItem(SALES_PROJECTION_KEY, JSON.stringify(data));
  };

  // Data hooks - Objectives
  const {
    objectives,
    objectivesByHorizon,
    stats: objectiveStats,
    restaurants,
    isLoading: isLoadingObjectives,
  } = useStrategicObjectives();

  // Data hooks - Strategic Tasks
  const {
    tasksByDate,
    sortedDates,
    stats: taskStats,
    isLoading: isLoadingTasks,
  } = useStrategicTasks();

  const { data: profiles = [] } = useProfiles();

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

  // Default restaurant ID (first one)
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

  // Handlers - Sales Projection Setup
  const handleSetupComplete = (config: SalesProjectionConfig, targetRevenue: GridChannelMonthData, baselineRevenue: ChannelMonthEntry) => {
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
  };

  const handleUpdateTargetRevenue = (data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, targetRevenue: data, updatedAt: new Date().toISOString() });
  };

  const handleUpdateActualRevenue = (data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualRevenue: data, updatedAt: new Date().toISOString() });
  };

  const handleUpdateActualAds = (data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualAds: data, updatedAt: new Date().toISOString() });
  };

  const handleUpdateActualPromos = (data: GridChannelMonthData) => {
    if (!salesProjection) return;
    saveSalesProjection({ ...salesProjection, actualPromos: data, updatedAt: new Date().toISOString() });
  };

  const handleDismissWarning = () => {
    setIsWarningOpen(false);
    localStorage.setItem(WARNING_DISMISSED_KEY, new Date().toISOString());
  };

  const handleCreateNewFromWarning = () => {
    setIsWarningOpen(false);
    setIsSetupOpen(true);
  };

  // Handlers - Objectives
  const handleOpenObjectiveEditor = () => {
    setSelectedObjective(undefined);
    setIsObjectiveEditorOpen(true);
  };

  const handleEditObjective = (objective: StrategicObjective) => {
    setSelectedObjective(objective);
    setIsObjectiveEditorOpen(true);
  };

  const handleSaveObjective = async (input: StrategicObjectiveInput) => {
    try {
      if (selectedObjective) {
        await updateObjective.mutateAsync({
          id: selectedObjective.id,
          updates: input,
        });
        success('Objetivo actualizado');
      } else {
        const newObjective = await createObjective.mutateAsync(input);
        const restaurant = restaurants.find((r) => r.id === input.restaurantId);
        try {
          const generatedTasks = await generateTasks.mutateAsync({
            objective: newObjective,
            companyName: restaurant?.name,
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
  };

  const handleStatusChange = async (id: string, status: ObjectiveStatus) => {
    try {
      await updateObjective.mutateAsync({ id, updates: { status } });
    } catch {
      error('Error al actualizar');
    }
  };

  const handleDeleteObjective = async () => {
    if (!selectedObjective) return;
    try {
      await deleteObjective.mutateAsync(selectedObjective.id);
      setIsObjectiveEditorOpen(false);
      setSelectedObjective(undefined);
      success('Objetivo eliminado');
    } catch {
      error('Error al eliminar');
    }
  };

  // Handler - Export Objectives
  const handleExportObjectives = (format: ExportFormat) => {
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
  };

  // Handlers - Tasks
  const handleOpenTaskEditor = () => {
    setSelectedTask(null);
    setIsTaskEditorOpen(true);
  };

  const handleTaskClick = (task: StrategicTaskWithDetails) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTask = () => {
    setIsTaskDetailOpen(false);
    setIsTaskEditorOpen(true);
  };

  const handleSaveTask = async (input: StrategicTaskInput) => {
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
  };

  const handleToggleTaskComplete = async (taskId: string) => {
    try {
      await toggleTaskCompleted.mutateAsync(taskId);
    } catch {
      error('Error al actualizar');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      await deleteTask.mutateAsync(selectedTask.id);
      setIsTaskDetailOpen(false);
      setSelectedTask(null);
      success('Tarea eliminada');
    } catch {
      error('Error al eliminar');
    }
  };

  const toggleHorizon = (horizon: ObjectiveHorizon) => {
    setExpandedHorizons((prev) => ({ ...prev, [horizon]: !prev[horizon] }));
  };

  const isLoading = isLoadingObjectives || isLoadingTasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasObjectives = objectives.length > 0;
  const hasSalesProjection = salesProjection !== null;

  // Calculate days remaining for warning
  const daysRemaining = salesProjection
    ? Math.ceil((new Date(salesProjection.config.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header - Minimal */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Estrategia</h1>
      </div>

      {/* Dashboard Filters */}
      <DashboardFilters />

      {/* Show empty state or sales projection + objectives */}
      {!hasSalesProjection && !hasObjectives ? (
        <Card padding="none" className="border-gray-100">
          <EmptyState onSetupClick={() => setIsSetupOpen(true)} />
        </Card>
      ) : (
        <>
          {/* Sales Projection (always first when exists) */}
          {hasSalesProjection && (
            <SalesProjection
              config={salesProjection.config}
              targetRevenue={salesProjection.targetRevenue}
              actualRevenue={salesProjection.actualRevenue}
              actualAds={salesProjection.actualAds}
              actualPromos={salesProjection.actualPromos}
              onTargetChange={handleUpdateTargetRevenue}
              onActualRevenueChange={handleUpdateActualRevenue}
              onActualAdsChange={handleUpdateActualAds}
              onActualPromosChange={handleUpdateActualPromos}
              onEditConfig={() => setIsSetupOpen(true)}
            />
          )}

          {/* Metrics Bar - Horizontal, Minimal */}
          <div className="flex items-center gap-8 py-4 px-5 bg-white rounded-xl border border-gray-100">
            <MetricItem
              label="Total"
              value={objectiveStats.total}
              icon={BarChart3}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="En progreso"
              value={objectiveStats.inProgress}
              icon={Zap}
              color={objectiveStats.inProgress > 0 ? 'warning' : 'default'}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="Completados"
              value={objectiveStats.completed}
              icon={CheckCircle2}
              color={objectiveStats.completed > 0 ? 'success' : 'default'}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="Efectividad"
              value={`${objectiveStats.effectiveness}%`}
              icon={TrendingUp}
              color={
                objectiveStats.effectiveness >= 70 ? 'success' :
                objectiveStats.effectiveness >= 40 ? 'warning' : 'default'
              }
            />
          </div>

          {/* Main Content: Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Objectives */}
            <div className="lg:col-span-8">
              <Card padding="none" className="border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Objetivos</h2>
                  <div className="flex items-center gap-2">
                    {hasObjectives && (
                      <ExportButtons onExport={handleExportObjectives} size="sm" />
                    )}
                    <button
                      onClick={handleOpenObjectiveEditor}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo
                    </button>
                  </div>
                </div>

                {/* Category Filter - Scrollable Pills */}
                <div className="px-5 py-3 border-b border-gray-50 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {CATEGORY_FILTERS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setSelectedCategory(cat.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                            isSelected
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-4">
                  {!hasObjectives ? (
                    /* Empty State for objectives (when sales projection exists but no other objectives) */
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Añade más objetivos
                      </p>
                      <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
                        Complementa tu estrategia con objetivos de operaciones, marketing, reputación y más
                      </p>
                      <button
                        onClick={handleOpenObjectiveEditor}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Crear objetivo
                      </button>
                    </div>
                  ) : (
                    /* Horizon Sections */
                    <div className="divide-y divide-gray-100">
                      <HorizonSection
                        horizon="short"
                        objectives={filteredObjectivesByHorizon.short}
                        onAddClick={handleOpenObjectiveEditor}
                        onObjectiveClick={handleEditObjective}
                        onStatusChange={handleStatusChange}
                        isExpanded={expandedHorizons.short}
                        onToggleExpand={() => toggleHorizon('short')}
                      />
                      <HorizonSection
                        horizon="medium"
                        objectives={filteredObjectivesByHorizon.medium}
                        onAddClick={handleOpenObjectiveEditor}
                        onObjectiveClick={handleEditObjective}
                        onStatusChange={handleStatusChange}
                        isExpanded={expandedHorizons.medium}
                        onToggleExpand={() => toggleHorizon('medium')}
                      />
                      <HorizonSection
                        horizon="long"
                        objectives={filteredObjectivesByHorizon.long}
                        onAddClick={handleOpenObjectiveEditor}
                        onObjectiveClick={handleEditObjective}
                        onStatusChange={handleStatusChange}
                        isExpanded={expandedHorizons.long}
                        onToggleExpand={() => toggleHorizon('long')}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right: Task Calendar */}
            <div className="lg:col-span-4">
              <StrategicTaskCalendar
                tasksByDate={tasksByDate}
                sortedDates={sortedDates}
                stats={taskStats}
                onTaskClick={handleTaskClick}
                onToggleTaskComplete={handleToggleTaskComplete}
                onAddTask={handleOpenTaskEditor}
                isLoading={isLoadingTasks}
              />
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <SalesProjectionSetup
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onComplete={handleSetupComplete}
      />

      <SalesProjectionWarning
        isOpen={isWarningOpen}
        onClose={handleDismissWarning}
        onCreateNew={handleCreateNewFromWarning}
        daysRemaining={daysRemaining}
        endDate={salesProjection?.config.endDate || ''}
      />

      <StrategicObjectiveEditor
        isOpen={isObjectiveEditorOpen}
        onClose={() => {
          setIsObjectiveEditorOpen(false);
          setSelectedObjective(undefined);
        }}
        onSave={handleSaveObjective}
        onDelete={handleDeleteObjective}
        objective={selectedObjective}
        restaurants={restaurants}
        defaultRestaurantId={defaultRestaurantId}
        isLoading={createObjective.isPending || updateObjective.isPending}
        isDeleting={deleteObjective.isPending}
      />

      <StrategicTaskDetailModal
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onToggleComplete={() => selectedTask && handleToggleTaskComplete(selectedTask.id)}
        isDeleting={deleteTask.isPending}
      />

      <StrategicTaskEditor
        isOpen={isTaskEditorOpen}
        onClose={() => {
          setIsTaskEditorOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        task={selectedTask || undefined}
        objectives={objectives}
        restaurants={restaurants}
        profiles={profiles}
        defaultRestaurantId={defaultRestaurantId}
        defaultObjectiveId={selectedTask?.objectiveId}
        isLoading={createTask.isPending || updateTask.isPending}
      />

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
