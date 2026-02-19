/**
 * Areas data operations
 */

import { supabase, handleQueryError, isDevMode, mockAreas } from './shared';
import { mapDbAreaToArea } from './mappers';
import type { Area, DbArea } from '@/types';

/**
 * Fetch all areas (geographic, not company-specific)
 */
export async function fetchAreas(): Promise<Area[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    return mockAreas.sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) handleQueryError(error, 'No se pudieron cargar las áreas');
  return (data as DbArea[]).map(mapDbAreaToArea);
}

/**
 * Fetch a single area by ID
 */
export async function fetchAreaById(areaId: string): Promise<Area | null> {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('id', areaId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar el área');
  }
  return mapDbAreaToArea(data as DbArea);
}
