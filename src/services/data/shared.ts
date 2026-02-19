/**
 * Shared utilities for the Supabase data service modules.
 */

import { supabase } from '../supabase';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Standardized error handler for Supabase queries.
 * Logs the full error for debugging but throws a generic user-facing message.
 */
export function handleQueryError(error: PostgrestError, userMessage: string): never {
  console.error(`[supabase-data] ${userMessage}:`, error.message, error.details);
  throw new Error(userMessage);
}

// Re-export supabase client
export { supabase };

// Re-export mock data utilities
export {
  isDevMode,
  mockCompanies,
  mockBrands,
  mockAreas,
  mockRestaurants,
  mockKpis,
  mockStrategicObjectives,
  mockStrategicTasks,
  addMockStrategicObjective,
  updateMockStrategicObjective,
  deleteMockStrategicObjective,
  addMockStrategicTask,
  updateMockStrategicTask,
  deleteMockStrategicTask,
} from '../mock-data';
