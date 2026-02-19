/**
 * Task Areas, Subareas, and Tasks data operations
 */

import { supabase, handleQueryError } from './shared';
import type {
  TaskArea,
  TaskSubarea,
  Task,
  TaskInput,
  DbTaskArea,
  DbTaskSubarea,
  DbTask,
} from '@/types';

function mapDbTaskArea(db: DbTaskArea): TaskArea {
  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    icon: db.icon,
    color: db.color,
    displayOrder: db.display_order,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

function mapDbTaskSubarea(db: DbTaskSubarea): TaskSubarea {
  return {
    id: db.id,
    areaId: db.area_id,
    name: db.name,
    slug: db.slug,
    displayOrder: db.display_order,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

function mapDbTask(db: DbTask): Task {
  return {
    id: db.id,
    restaurantId: db.restaurant_id,
    title: db.title,
    description: db.description,
    areaId: db.area_id,
    subareaId: db.subarea_id,
    ownerId: db.owner_id,
    deadline: db.deadline,
    completedAt: db.completed_at,
    isCompleted: db.is_completed,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Fetch all task areas
 */
export async function fetchTaskAreas(): Promise<TaskArea[]> {
  const { data, error } = await supabase
    .from('task_areas')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) handleQueryError(error, 'No se pudieron cargar las áreas de tareas');
  return (data as DbTaskArea[]).map(mapDbTaskArea);
}

/**
 * Fetch task subareas, optionally filtered by area
 */
export async function fetchTaskSubareas(areaId?: string): Promise<TaskSubarea[]> {
  let query = supabase
    .from('task_subareas')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (areaId) {
    query = query.eq('area_id', areaId);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar las subáreas');
  return (data as DbTaskSubarea[]).map(mapDbTaskSubarea);
}

interface FetchTasksParams {
  restaurantIds?: string[];
  areaId?: string;
  ownerId?: string;
  isCompleted?: boolean;
}

/**
 * Fetch tasks with optional filtering
 */
export async function fetchTasks(params: FetchTasksParams = {}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('display_order', { ascending: true });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.areaId) {
    query = query.eq('area_id', params.areaId);
  }
  if (params.ownerId) {
    query = query.eq('owner_id', params.ownerId);
  }
  if (params.isCompleted !== undefined) {
    query = query.eq('is_completed', params.isCompleted);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar las tareas');
  return (data as DbTask[]).map(mapDbTask);
}

/**
 * Create a task
 */
export async function createTask(input: TaskInput): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    restaurant_id: input.restaurantId,
    title: input.title,
    description: input.description || null,
    area_id: input.areaId,
    subarea_id: input.subareaId,
    owner_id: input.ownerId || null,
    deadline: input.deadline || null,
    display_order: input.displayOrder || 0,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(dbInput)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al crear la tarea');
  return mapDbTask(data as DbTask);
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  updates: Partial<TaskInput> & { isCompleted?: boolean }
): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.areaId !== undefined) dbUpdates.area_id = updates.areaId;
  if (updates.subareaId !== undefined) dbUpdates.subarea_id = updates.subareaId;
  if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
  if (updates.isCompleted !== undefined) {
    dbUpdates.is_completed = updates.isCompleted;
    dbUpdates.completed_at = updates.isCompleted ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al actualizar la tarea');
  return mapDbTask(data as DbTask);
}

/**
 * Toggle task completion
 */
export async function toggleTaskCompletion(id: string, isCompleted: boolean): Promise<Task> {
  return updateTask(id, { isCompleted });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) handleQueryError(error, 'Error al eliminar la tarea');
}
