/**
 * Strategic Objectives (OKRs) data operations
 */

import {
  supabase,
  handleQueryError,
  isDevMode,
  mockStrategicObjectives,
  mockStrategicTasks,
  addMockStrategicObjective,
  updateMockStrategicObjective,
  deleteMockStrategicObjective,
  deleteMockStrategicTask,
} from './shared';
import type {
  StrategicObjective,
  StrategicObjectiveInput,
  ObjectiveHorizon,
  ObjectiveStatus,
  ObjectiveCategory,
  ObjectiveResponsible,
  ObjectivePriority,
  DbStrategicObjective,
} from '@/types';

// Priority mapping: DB uses integers, TypeScript uses strings
export const PRIORITY_DB_TO_TS: Record<number, ObjectivePriority> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};

export const PRIORITY_TS_TO_DB: Record<ObjectivePriority, number> = {
  critical: 1,
  high: 1,
  medium: 2,
  low: 3,
};

export function mapDbStrategicObjective(db: DbStrategicObjective): StrategicObjective {
  // Parse fieldData from JSON string
  let fieldData = null;
  if (db.field_data) {
    try {
      fieldData = JSON.parse(db.field_data);
    } catch {
      fieldData = null;
    }
  }

  return {
    id: db.id,
    companyId: db.company_id,
    brandId: db.brand_id,
    addressId: db.address_id,
    title: db.title,
    description: db.description,
    category: db.category as ObjectiveCategory,
    objectiveTypeId: db.objective_type_id || '',
    horizon: db.horizon as ObjectiveHorizon,
    status: db.status as ObjectiveStatus,
    responsible: (db.responsible as ObjectiveResponsible) || 'thinkpaladar',
    kpiType: db.kpi_type,
    kpiCurrentValue: db.kpi_current_value,
    kpiTargetValue: db.kpi_target_value,
    kpiUnit: db.kpi_unit,
    // Progress tracking fields
    baselineValue: db.baseline_value,
    baselineDate: db.baseline_date,
    targetDirection: (db.target_direction as 'increase' | 'decrease' | 'maintain') || 'increase',
    // Priority and archiving (DB integer -> TS string)
    priority: PRIORITY_DB_TO_TS[Number(db.priority)] || 'medium',
    isArchived: db.is_archived || false,
    fieldData,
    evaluationDate: db.evaluation_date,
    completedAt: db.completed_at,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchStrategicObjectivesParams {
  companyIds?: string[];
  brandIds?: string[];
  addressIds?: string[];
  horizon?: ObjectiveHorizon;
  status?: ObjectiveStatus;
}

/**
 * Fetch strategic objectives with optional filtering
 */
export async function fetchStrategicObjectives(
  params: FetchStrategicObjectivesParams = {}
): Promise<StrategicObjective[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let objectives = [...mockStrategicObjectives];
    if (params.companyIds && params.companyIds.length > 0) {
      objectives = objectives.filter((o) => params.companyIds!.includes(o.companyId));
    }
    if (params.brandIds && params.brandIds.length > 0) {
      objectives = objectives.filter((o) => o.brandId && params.brandIds!.includes(o.brandId));
    }
    if (params.addressIds && params.addressIds.length > 0) {
      objectives = objectives.filter((o) => o.addressId && params.addressIds!.includes(o.addressId));
    }
    if (params.horizon) {
      objectives = objectives.filter((o) => o.horizon === params.horizon);
    }
    if (params.status) {
      objectives = objectives.filter((o) => o.status === params.status);
    }
    return objectives.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  let query = supabase
    .from('strategic_objectives')
    .select('*')
    .order('display_order', { ascending: true });

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('company_id', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('brand_id', params.brandIds);
  }
  if (params.addressIds && params.addressIds.length > 0) {
    query = query.in('address_id', params.addressIds);
  }
  if (params.horizon) {
    query = query.eq('horizon', params.horizon);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar los objetivos estratégicos');
  return (data as DbStrategicObjective[]).map(mapDbStrategicObjective);
}

/**
 * Fetch a single strategic objective by ID
 */
export async function fetchStrategicObjectiveById(
  id: string
): Promise<StrategicObjective | null> {
  // Return mock data in dev mode
  if (isDevMode) {
    const objective = mockStrategicObjectives.find((o) => o.id === id);
    return objective || null;
  }

  const { data, error } = await supabase
    .from('strategic_objectives')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    handleQueryError(error, 'No se pudo cargar el objetivo estratégico');
  }

  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Create a strategic objective
 */
export async function createStrategicObjective(
  input: StrategicObjectiveInput
): Promise<StrategicObjective> {
  // Mock mode: add to in-memory storage
  if (isDevMode) {
    return addMockStrategicObjective({
      companyId: input.companyId,
      brandId: input.brandId || null,
      addressId: input.addressId || null,
      title: input.title,
      description: input.description || null,
      category: input.category,
      objectiveTypeId: input.objectiveTypeId || '',
      horizon: input.horizon,
      status: input.status || 'pending',
      responsible: input.responsible || 'thinkpaladar',
      kpiType: input.kpiType || null,
      kpiCurrentValue: input.kpiCurrentValue || null,
      kpiTargetValue: input.kpiTargetValue || null,
      kpiUnit: input.kpiUnit || null,
      // Progress tracking fields
      baselineValue: input.baselineValue || null,
      baselineDate: input.baselineDate || new Date().toISOString().split('T')[0],
      targetDirection: input.targetDirection || 'increase',
      // Priority and archiving
      priority: input.priority || 'medium',
      isArchived: input.isArchived || false,
      fieldData: input.fieldData || null,
      evaluationDate: input.evaluationDate || null,
      completedAt: null,
      displayOrder: input.displayOrder || 0,
      createdBy: 'dev-user-001',
      updatedBy: 'dev-user-001',
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    company_id: input.companyId,
    brand_id: input.brandId || null,
    address_id: input.addressId || null,
    title: input.title,
    description: input.description || null,
    category: input.category,
    objective_type_id: input.objectiveTypeId || '',
    horizon: input.horizon,
    status: input.status || 'pending',
    responsible: input.responsible || 'thinkpaladar',
    kpi_type: input.kpiType || null,
    kpi_current_value: input.kpiCurrentValue || null,
    kpi_target_value: input.kpiTargetValue || null,
    kpi_unit: input.kpiUnit || null,
    // Progress tracking fields
    baseline_value: input.baselineValue || null,
    baseline_date: input.baselineDate || new Date().toISOString().split('T')[0],
    target_direction: input.targetDirection || 'increase',
    // Priority and archiving (TS string -> DB integer)
    priority: PRIORITY_TS_TO_DB[input.priority || 'medium'] || 2,
    is_archived: input.isArchived || false,
    field_data: input.fieldData ? JSON.stringify(input.fieldData) : null,
    evaluation_date: input.evaluationDate || null,
    display_order: input.displayOrder || 0,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('strategic_objectives')
    .insert(dbInput)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al crear el objetivo estratégico');
  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Update a strategic objective
 */
export async function updateStrategicObjective(
  id: string,
  updates: Partial<StrategicObjectiveInput> & { status?: ObjectiveStatus }
): Promise<StrategicObjective> {
  // Mock mode: update in-memory storage
  if (isDevMode) {
    const mockUpdates: Partial<StrategicObjective> = {};
    if (updates.title !== undefined) mockUpdates.title = updates.title;
    if (updates.description !== undefined) mockUpdates.description = updates.description;
    if (updates.category !== undefined) mockUpdates.category = updates.category;
    if (updates.horizon !== undefined) mockUpdates.horizon = updates.horizon;
    if (updates.status !== undefined) {
      mockUpdates.status = updates.status;
      if (updates.status === 'completed') {
        mockUpdates.completedAt = new Date().toISOString();
      }
    }
    if (updates.kpiType !== undefined) mockUpdates.kpiType = updates.kpiType;
    if (updates.kpiCurrentValue !== undefined) mockUpdates.kpiCurrentValue = updates.kpiCurrentValue;
    if (updates.kpiTargetValue !== undefined) mockUpdates.kpiTargetValue = updates.kpiTargetValue;
    if (updates.kpiUnit !== undefined) mockUpdates.kpiUnit = updates.kpiUnit;
    // Progress tracking fields
    if (updates.baselineValue !== undefined) mockUpdates.baselineValue = updates.baselineValue;
    if (updates.baselineDate !== undefined) mockUpdates.baselineDate = updates.baselineDate;
    if (updates.targetDirection !== undefined) mockUpdates.targetDirection = updates.targetDirection;
    // Priority and archiving
    if (updates.priority !== undefined) mockUpdates.priority = updates.priority;
    if (updates.isArchived !== undefined) mockUpdates.isArchived = updates.isArchived;
    if (updates.evaluationDate !== undefined) mockUpdates.evaluationDate = updates.evaluationDate;
    if (updates.displayOrder !== undefined) mockUpdates.displayOrder = updates.displayOrder;
    if (updates.responsible !== undefined) mockUpdates.responsible = updates.responsible;
    if (updates.objectiveTypeId !== undefined) mockUpdates.objectiveTypeId = updates.objectiveTypeId;

    const result = updateMockStrategicObjective(id, mockUpdates);
    if (!result) throw new Error(`Objective not found: ${id}`);
    return result;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { updated_by: userId };

  // Scope fields (CRP Portal references)
  if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
  if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
  if (updates.addressId !== undefined) dbUpdates.address_id = updates.addressId;

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.horizon !== undefined) dbUpdates.horizon = updates.horizon;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'completed') {
      dbUpdates.completed_at = new Date().toISOString();
    }
  }
  if (updates.kpiType !== undefined) dbUpdates.kpi_type = updates.kpiType;
  if (updates.kpiCurrentValue !== undefined) dbUpdates.kpi_current_value = updates.kpiCurrentValue;
  if (updates.kpiTargetValue !== undefined) dbUpdates.kpi_target_value = updates.kpiTargetValue;
  if (updates.kpiUnit !== undefined) dbUpdates.kpi_unit = updates.kpiUnit;
  // Progress tracking fields
  if (updates.baselineValue !== undefined) dbUpdates.baseline_value = updates.baselineValue;
  if (updates.baselineDate !== undefined) dbUpdates.baseline_date = updates.baselineDate;
  if (updates.targetDirection !== undefined) dbUpdates.target_direction = updates.targetDirection;
  // Priority and archiving (TS string -> DB integer)
  if (updates.priority !== undefined) dbUpdates.priority = PRIORITY_TS_TO_DB[updates.priority] || 2;
  if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
  if (updates.evaluationDate !== undefined) dbUpdates.evaluation_date = updates.evaluationDate;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

  const { data, error } = await supabase
    .from('strategic_objectives')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al actualizar el objetivo estratégico');
  return mapDbStrategicObjective(data as DbStrategicObjective);
}

/**
 * Update display order for multiple objectives (for drag & drop)
 */
export async function updateStrategicObjectiveOrder(
  updates: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('strategic_objectives')
      .update({ display_order: update.displayOrder })
      .eq('id', update.id);

    if (error) handleQueryError(error, 'Error al actualizar el orden');
  }
}

/**
 * Delete a strategic objective
 */
export async function deleteStrategicObjective(id: string): Promise<void> {
  // Mock mode: delete from in-memory storage
  if (isDevMode) {
    // Also delete associated tasks
    const tasksToDelete = mockStrategicTasks.filter((t) => t.objectiveId === id);
    for (const task of tasksToDelete) {
      deleteMockStrategicTask(task.id);
    }
    const deleted = deleteMockStrategicObjective(id);
    if (!deleted) throw new Error(`Objective not found: ${id}`);
    return;
  }

  const { error } = await supabase
    .from('strategic_objectives')
    .delete()
    .eq('id', id);

  if (error) handleQueryError(error, 'Error al eliminar el objetivo estratégico');
}
