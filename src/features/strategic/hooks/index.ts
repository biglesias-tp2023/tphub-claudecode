export {
  // Strategic Objectives
  useStrategicObjectives,
  useCreateStrategicObjective,
  useUpdateStrategicObjective,
  useReorderStrategicObjectives,
  useDeleteStrategicObjective,
  // Strategic Tasks (linked to objectives)
  useStrategicTasks,
  useStrategicTasksForObjective,
  useCreateStrategicTask,
  useUpdateStrategicTask,
  useToggleStrategicTaskCompleted,
  useDeleteStrategicTask,
  useGenerateTasksForObjective,
  // Tasks (legacy)
  useTasks,
  useCreateTask,
  useUpdateTask,
  useToggleTaskCompletion,
  useDeleteTask,
  // Task Areas
  useTaskAreas,
  useTaskSubareas,
  // Profiles
  useProfiles,
  // Utilities
  getHorizonInfo,
  getStatusInfo,
  getCategoryInfo,
  calculateProgress,
  formatKpiValue,
} from './useStrategicData';

// KPI real-time value
export { useObjectiveKpiValue } from './useObjectiveKpiValue';

// Objective progress calculation (health status, velocity, projections)
export { useObjectiveProgress } from './useObjectiveProgress';

// Actual revenue by month (auto-populate financial objectives)
export { useActualRevenueByMonth } from './useActualRevenueByMonth';

// Share links for objectives
export {
  useShareLink,
  useShareLinkByToken,
  useCreateShareLink,
  useUpdateShareLink,
  useDeleteShareLink,
  useRegenerateToken,
  useShareLinkManager,
  useRecordAccess,
  shareLinkKeys,
  formatShareUrl,
} from './useShareLinks';
