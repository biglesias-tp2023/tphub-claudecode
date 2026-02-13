import {
  Plus,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Zap,
  Clock,
  Star,
  Users,
  Tag,
  Handshake,
  UtensilsCrossed,
  CircleDot,
} from 'lucide-react';
import { Card, Spinner, ToastContainer } from '@/components/ui';
import { ExportButtons } from '@/components/common';
import { DashboardFilters } from '@/features/dashboard';
import {
  StrategicObjectiveEditor,
  StrategicTaskCalendar,
  StrategicTaskDetailModal,
  StrategicTaskEditor,
  SalesProjection,
  SalesProjectionSetup,
  SalesProjectionWarning,
  MetricItem,
  HorizonSection,
  StrategicEmptyState,
} from '@/features/strategic/components';
import { cn } from '@/utils/cn';
import { useStrategicPageState } from './useStrategicPageState';
import type { ObjectiveCategory } from '@/types';

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
// MAIN PAGE COMPONENT
// ============================================

export function StrategicPage() {
  const state = useStrategicPageState();

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
        <h1 className="text-xl font-semibold text-gray-900">Estrategia</h1>
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
          {state.hasSalesProjection && state.salesProjection && (
            <SalesProjection
              config={state.salesProjection.config}
              targetRevenue={state.salesProjection.targetRevenue}
              actualRevenue={state.salesProjection.actualRevenue}
              actualAds={state.salesProjection.actualAds}
              actualPromos={state.salesProjection.actualPromos}
              onTargetChange={state.handleUpdateTargetRevenue}
              onActualRevenueChange={state.handleUpdateActualRevenue}
              onActualAdsChange={state.handleUpdateActualAds}
              onActualPromosChange={state.handleUpdateActualPromos}
              onEditConfig={() => state.setIsSetupOpen(true)}
              realRevenueByMonth={state.realRevenueByMonth}
              realSalesData={state.realSalesData?.current ? {
                totalRevenue: state.realSalesData.current.totalRevenue,
                totalPromos: state.realSalesData.current.totalDiscounts,
                byChannel: {
                  glovo: {
                    revenue: state.realSalesData.current.byChannel.glovo?.revenue || 0,
                    promos: state.realSalesData.current.byChannel.glovo?.discounts || 0,
                  },
                  ubereats: {
                    revenue: state.realSalesData.current.byChannel.ubereats?.revenue || 0,
                    promos: state.realSalesData.current.byChannel.ubereats?.discounts || 0,
                  },
                  justeat: {
                    revenue: state.realSalesData.current.byChannel.justeat?.revenue || 0,
                    promos: state.realSalesData.current.byChannel.justeat?.discounts || 0,
                  },
                },
              } : undefined}
              isLoadingRealData={state.isLoadingSales}
            />
          )}

          {/* Metrics Bar */}
          <div className="flex items-center gap-8 py-4 px-5 bg-white rounded-xl border border-gray-100">
            <MetricItem
              label="Total"
              value={state.objectiveStats.total}
              icon={BarChart3}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="En progreso"
              value={state.objectiveStats.inProgress}
              icon={Zap}
              color={state.objectiveStats.inProgress > 0 ? 'warning' : 'default'}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="Completados"
              value={state.objectiveStats.completed}
              icon={CheckCircle2}
              color={state.objectiveStats.completed > 0 ? 'success' : 'default'}
            />
            <div className="w-px h-10 bg-gray-100" />
            <MetricItem
              label="Efectividad"
              value={`${state.objectiveStats.effectiveness}%`}
              icon={TrendingUp}
              color={
                state.objectiveStats.effectiveness >= 70 ? 'success' :
                state.objectiveStats.effectiveness >= 40 ? 'warning' : 'default'
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

                {/* Category Filter */}
                <div className="px-5 py-3 border-b border-gray-50 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {CATEGORY_FILTERS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = state.selectedCategory === cat.value;
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
                        </button>
                      );
                    })}
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
            </div>

            {/* Right: Task Calendar */}
            <div className="lg:col-span-4">
              <StrategicTaskCalendar
                tasksByDate={state.tasksByDate}
                sortedDates={state.sortedDates}
                stats={state.taskStats}
                onTaskClick={state.handleTaskClick}
                onToggleTaskComplete={state.handleToggleTaskComplete}
                onAddTask={state.handleOpenTaskEditor}
                isLoading={false}
              />
            </div>
          </div>
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
