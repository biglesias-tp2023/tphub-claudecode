/**
 * Barrel re-export for backward compatibility.
 * Actual stores live in globalFiltersStore.ts and dashboardFiltersStore.ts.
 */
export {
  useGlobalFiltersStore,
  isUnrestrictedRole,
  useCompanyIds,
} from './globalFiltersStore';

export {
  useDashboardFiltersStore,
  useBrandIds,
  useAreaIds,
  useChannelIds,
  useDateFilters,
} from './dashboardFiltersStore';
