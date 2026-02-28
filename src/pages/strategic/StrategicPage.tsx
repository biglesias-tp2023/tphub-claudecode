import {
  Plus,
  TrendingUp,
  BarChart3,
  Clock,
  Star,
  Users,
  Tag,
  Handshake,
  UtensilsCrossed,
  CircleDot,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card, Spinner, ToastContainer } from '@/components/ui';
import { ExportButtons } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import {
  StrategicObjectiveEditor,
  StrategicTaskDetailModal,
  StrategicTaskEditor,
  SalesProjection,
  SalesProjectionSetup,
  SalesProjectionWarning,
  HorizonSection,
  StrategicEmptyState,
} from '@/features/strategic/components';
import { cn } from '@/utils/cn';
import { useStrategicPageState } from './useStrategicPageState';
import type { ObjectiveCategory, ObjectiveStatus } from '@/types';

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

const STATUS_FILTERS: { value: ObjectiveStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
];

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function StrategicPage() {
  const state = useStrategicPageState();

  // Breadcrumb labels
  const companyName = state.allCompanies.find(c => c.id === state.primaryCompanyId)?.name;
  const brandName = state.filterBrandIds.length > 0
    ? state.allBrands.find(b => b.id === state.filterBrandIds[0])?.name
    : null;
  const addressName = state.filterRestaurantIds.length > 0
    ? state.allRestaurants.find(r => r.id === state.filterRestaurantIds[0])?.name
    : null;

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">Error al cargar objetivos</p>
        <p className="text-gray-500 text-sm mb-4">
          {state.error instanceof Error ? state.error.message : 'Error desconocido'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Estrategia</h1>
          {companyName && (
            <p className="text-sm text-gray-500 mt-0.5">
              {companyName}
              {' › '}
              {brandName || 'Todas las marcas'}
              {' › '}
              {addressName || 'Todas las direcciones'}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard Filters */}
      <DashboardFilters />

      {/* Show empty state or sales projection + objectives */}
      {!state.hasSalesProjection && !state.hasObjectives ? (
        <Card padding="none" className="border-gray-100">
          <StrategicEmptyState onSetupClick={() => state.setIsSetupOpen(true)} />
        </Card>
      ) : (
        <>
          {/* Sales Projection */}
          {state.hasSalesProjection && state.salesProjection ? (
            <SalesProjection
              config={state.salesProjection.config}
              targetRevenue={state.salesProjection.targetRevenue}
              onTargetChange={state.handleUpdateTargetRevenue}
              onEditConfig={() => state.setIsSetupOpen(true)}
              realRevenueByMonth={state.realRevenueByMonth}
              realPromosByMonth={state.realPromosByMonth}
              realAdsByMonth={state.realAdsByMonth}
              commissions={state.commissions}
            />
          ) : (
            <button
              onClick={() => state.setIsSetupOpen(true)}
              className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <BarChart3 className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Proyeccion de ventas</p>
                  <p className="text-xs text-gray-500">Configura objetivos de facturacion por canal</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Configurar
              </span>
            </button>
          )}

          {/* Health Summary Bar */}
          <div className="py-4 px-5 bg-white rounded-xl border border-gray-100 space-y-3">
            {/* Title + effectiveness */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {state.objectiveStats.total} objetivo{state.objectiveStats.total !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-500">
                {state.objectiveStats.effectiveness}% efectividad
              </span>
            </div>

            {/* Segmented bar */}
            {state.objectiveStats.total > 0 && (
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                {state.objectiveStats.pending > 0 && (
                  <div
                    className="bg-gray-300 transition-all"
                    style={{ width: `${(state.objectiveStats.pending / state.objectiveStats.total) * 100}%` }}
                  />
                )}
                {state.objectiveStats.inProgress > 0 && (
                  <div
                    className="bg-primary-500 transition-all"
                    style={{ width: `${(state.objectiveStats.inProgress / state.objectiveStats.total) * 100}%` }}
                  />
                )}
                {state.objectiveStats.completed > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(state.objectiveStats.completed / state.objectiveStats.total) * 100}%` }}
                  />
                )}
              </div>
            )}

            {/* Legend (clickable to filter by status) */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => state.setSelectedStatus(state.selectedStatus === 'pending' ? 'all' : 'pending')}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  state.selectedStatus === 'pending' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                {state.objectiveStats.pending} Pendiente{state.objectiveStats.pending !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => state.setSelectedStatus(state.selectedStatus === 'in_progress' ? 'all' : 'in_progress')}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  state.selectedStatus === 'in_progress' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                {state.objectiveStats.inProgress} En progreso
              </button>
              <button
                onClick={() => state.setSelectedStatus(state.selectedStatus === 'completed' ? 'all' : 'completed')}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  state.selectedStatus === 'completed' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {state.objectiveStats.completed} Completado{state.objectiveStats.completed !== 1 ? 's' : ''}
              </button>
            </div>

            {/* At-risk alert */}
            {state.atRiskCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {state.atRiskCount} objetivo{state.atRiskCount !== 1 ? 's' : ''} con fecha próxima ({'<'} 14 días)
              </div>
            )}
          </div>

          {/* Objectives */}
          <Card padding="none" className="border-gray-100">
            {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Objetivos</h2>
                  <div className="flex items-center gap-2">
                    {state.hasObjectives && (
                      <ExportButtons onExport={state.handleExportObjectives} size="sm" variant="ghost" />
                    )}
                    <button
                      onClick={state.handleOpenObjectiveEditor}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo
                    </button>
                  </div>
                </div>

                {/* Category Filter with counters */}
                <div className="px-5 py-3 border-b border-gray-50 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {CATEGORY_FILTERS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = state.selectedCategory === cat.value;
                      const count = state.categoryCountMap[cat.value] || 0;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => state.setSelectedCategory(cat.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cat.label}
                          <span className={cn(
                            'text-[10px] min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full',
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status filter + search */}
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {STATUS_FILTERS.map((sf) => (
                      <button
                        key={sf.value}
                        onClick={() => state.setSelectedStatus(sf.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                          state.selectedStatus === sf.value
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {sf.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar objetivo..."
                      value={state.searchQuery}
                      onChange={(e) => state.setSearchQuery(e.target.value)}
                      className="w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-4">
                  {!state.hasObjectives ? (
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
                        onClick={state.handleOpenObjectiveEditor}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Crear objetivo
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      <HorizonSection
                        horizon="short"
                        objectives={state.filteredObjectivesByHorizon.short}
                        onAddClick={state.handleOpenObjectiveEditor}
                        onObjectiveClick={state.handleEditObjective}
                        onStatusChange={state.handleStatusChange}
                        isExpanded={state.expandedHorizons.short}
                        onToggleExpand={() => state.toggleHorizon('short')}
                        taskCountByObjectiveId={state.taskCountByObjectiveId}
                      />
                      <HorizonSection
                        horizon="medium"
                        objectives={state.filteredObjectivesByHorizon.medium}
                        onAddClick={state.handleOpenObjectiveEditor}
                        onObjectiveClick={state.handleEditObjective}
                        onStatusChange={state.handleStatusChange}
                        isExpanded={state.expandedHorizons.medium}
                        onToggleExpand={() => state.toggleHorizon('medium')}
                        taskCountByObjectiveId={state.taskCountByObjectiveId}
                      />
                      <HorizonSection
                        horizon="long"
                        objectives={state.filteredObjectivesByHorizon.long}
                        onAddClick={state.handleOpenObjectiveEditor}
                        onObjectiveClick={state.handleEditObjective}
                        onStatusChange={state.handleStatusChange}
                        isExpanded={state.expandedHorizons.long}
                        onToggleExpand={() => state.toggleHorizon('long')}
                        taskCountByObjectiveId={state.taskCountByObjectiveId}
                      />
                    </div>
                  )}
                </div>
          </Card>
        </>
      )}

      {/* Modals */}
      <SalesProjectionSetup
        isOpen={state.isSetupOpen}
        onClose={() => state.setIsSetupOpen(false)}
        onComplete={state.handleSetupComplete}
        companyIds={state.effectiveCompanyIds}
        brandIds={state.filterBrandIds}
        addressIds={state.filterRestaurantIds}
      />

      <SalesProjectionWarning
        isOpen={state.isWarningOpen}
        onClose={state.handleDismissWarning}
        onCreateNew={state.handleCreateNewFromWarning}
        daysRemaining={state.daysRemaining}
        endDate={state.salesProjection?.config.endDate || ''}
      />

      <StrategicObjectiveEditor
        isOpen={state.isObjectiveEditorOpen}
        onClose={state.handleCloseObjectiveEditor}
        onSave={state.handleSaveObjective}
        onDelete={state.handleDeleteObjective}
        objective={state.selectedObjective}
        defaultCompanyId={state.companyIds[0]}
        defaultCategory={state.selectedCategory !== 'all' ? state.selectedCategory : undefined}
        isLoading={state.isCreatingObjective || state.isUpdatingObjective}
        isDeleting={state.isDeletingObjective}
      />

      <StrategicTaskDetailModal
        isOpen={state.isTaskDetailOpen}
        onClose={state.handleCloseTaskDetail}
        task={state.selectedTask}
        onEdit={state.handleEditTask}
        onDelete={state.handleDeleteTask}
        onToggleComplete={() => state.selectedTask && state.handleToggleTaskComplete(state.selectedTask.id)}
        isDeleting={state.isDeletingTask}
      />

      <StrategicTaskEditor
        isOpen={state.isTaskEditorOpen}
        onClose={state.handleCloseTaskEditor}
        onSave={state.handleSaveTask}
        task={state.selectedTask || undefined}
        objectives={state.objectives}
        restaurants={state.restaurants}
        profiles={state.profiles}
        defaultRestaurantId={state.defaultRestaurantId}
        defaultObjectiveId={state.selectedTask?.objectiveId}
        isLoading={state.isCreatingTask || state.isUpdatingTask}
      />

      <ToastContainer toasts={state.toasts} onClose={state.closeToast} />
    </div>
  );
}
