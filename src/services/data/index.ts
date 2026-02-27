/**
 * Supabase Data Service - Barrel Export
 *
 * Re-exports all data operations from modular files.
 */

// Shared utilities (for internal use by other service modules)
export { handleQueryError } from './shared';

// Mappers (for internal use by other service modules)
export {
  mapDbCompanyToCompany,
  mapDbBrandToBrand,
  mapDbAreaToArea,
  mapDbRestaurantToRestaurant,
  mapDbProfileToProfile,
  mapDbKpisToKpis,
} from './mappers';

// Companies
export { fetchCompanies, fetchCompanyById } from './companies';

// Brands
export { fetchBrands, fetchBrandById } from './brands';

// Areas
export { fetchAreas, fetchAreaById } from './areas';

// Restaurants
export { fetchRestaurants, fetchRestaurantById } from './restaurants';

// Profiles
export { fetchCurrentProfile, fetchAllProfiles, updateProfile, deleteProfile } from './profiles';

// KPIs
export { fetchRestaurantKpis, fetchAggregatedKpis } from './kpis';

// Restaurant Objectives
export {
  fetchRestaurantObjectives,
  upsertRestaurantObjective,
  bulkUpsertRestaurantObjectives,
  deleteRestaurantObjective,
} from './restaurant-objectives';

// Strategic Objectives
export {
  PRIORITY_DB_TO_TS,
  PRIORITY_TS_TO_DB,
  mapDbStrategicObjective,
  fetchStrategicObjectives,
  fetchStrategicObjectiveById,
  createStrategicObjective,
  updateStrategicObjective,
  updateStrategicObjectiveOrder,
  deleteStrategicObjective,
} from './strategic-objectives';

// Tasks (areas, subareas, tasks)
export {
  fetchTaskAreas,
  fetchTaskSubareas,
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask,
} from './tasks';

// Strategic Tasks
export {
  fetchStrategicTasks,
  fetchStrategicTasksWithDetails,
  createStrategicTask,
  generateTasksForObjective,
  updateStrategicTask,
  toggleStrategicTaskCompleted,
  deleteStrategicTask,
  deleteTasksForObjective,
} from './strategic-tasks';

// Sales Projections
export {
  mapDbSalesProjection,
  fetchSalesProjection,
  upsertSalesProjection,
  updateSalesProjectionTargets,
  deleteSalesProjection,
} from './sales-projections';

// Audits
export {
  _mapDbAuditResponseToAuditResponse,
  _mapDbAuditImageToAuditImage,
  fetchAuditTypes,
  fetchAuditTypeBySlug,
  fetchAuditTypeById,
  fetchAudits,
  fetchAuditsWithDetails,
  fetchAuditById,
  fetchAuditWithDetailsById,
  createAudit,
  updateAudit,
  deleteAudit,
  completeAudit,
} from './audits';
