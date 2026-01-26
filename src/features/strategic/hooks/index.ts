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
