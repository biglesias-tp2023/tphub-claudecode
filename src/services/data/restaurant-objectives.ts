/**
 * Restaurant Objectives data operations
 */

import { supabase, handleQueryError } from './shared';
import type {
  RestaurantObjective,
  RestaurantObjectiveInput,
  ChannelId,
  InvestmentMode,
  DbRestaurantObjective,
} from '@/types';

function mapDbObjectiveToObjective(db: DbRestaurantObjective): RestaurantObjective {
  return {
    id: db.id,
    restaurantId: db.restaurant_id,
    channel: db.channel as ChannelId,
    periodMonth: db.period_month,
    revenueTarget: db.revenue_target,
    adsInvestmentMode: db.ads_investment_mode as InvestmentMode,
    adsInvestmentValue: db.ads_investment_value,
    promosInvestmentMode: db.promos_investment_mode as InvestmentMode,
    promosInvestmentValue: db.promos_investment_value,
    foodcostTarget: db.foodcost_target,
    marginTarget: db.margin_target,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface FetchObjectivesParams {
  restaurantIds?: string[];
  channels?: ChannelId[];
  startMonth?: string;
  endMonth?: string;
}

/**
 * Fetch restaurant objectives with optional filtering
 */
export async function fetchRestaurantObjectives(
  params: FetchObjectivesParams = {}
): Promise<RestaurantObjective[]> {
  let query = supabase
    .from('restaurant_objectives')
    .select('*')
    .order('period_month', { ascending: true });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.channels && params.channels.length > 0) {
    query = query.in('channel', params.channels);
  }
  if (params.startMonth) {
    query = query.gte('period_month', params.startMonth);
  }
  if (params.endMonth) {
    query = query.lte('period_month', params.endMonth);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar los objetivos');
  return (data as DbRestaurantObjective[]).map(mapDbObjectiveToObjective);
}

/**
 * Upsert (create or update) a restaurant objective
 */
export async function upsertRestaurantObjective(
  input: RestaurantObjectiveInput
): Promise<RestaurantObjective> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput = {
    restaurant_id: input.restaurantId,
    channel: input.channel,
    period_month: input.periodMonth,
    revenue_target: input.revenueTarget,
    ads_investment_mode: input.adsInvestmentMode,
    ads_investment_value: input.adsInvestmentValue,
    promos_investment_mode: input.promosInvestmentMode,
    promos_investment_value: input.promosInvestmentValue,
    foodcost_target: input.foodcostTarget,
    updated_by: userId,
  };

  // Check if objective already exists
  const { data: existing } = await supabase
    .from('restaurant_objectives')
    .select('id')
    .eq('restaurant_id', input.restaurantId)
    .eq('channel', input.channel)
    .eq('period_month', input.periodMonth)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('restaurant_objectives')
      .update(dbInput)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) handleQueryError(error, 'Error al actualizar el objetivo');
    return mapDbObjectiveToObjective(data as DbRestaurantObjective);
  } else {
    // Create new
    const { data, error } = await supabase
      .from('restaurant_objectives')
      .insert({ ...dbInput, created_by: userId })
      .select()
      .single();

    if (error) handleQueryError(error, 'Error al crear el objetivo');
    return mapDbObjectiveToObjective(data as DbRestaurantObjective);
  }
}

/**
 * Bulk upsert multiple restaurant objectives
 */
export async function bulkUpsertRestaurantObjectives(
  inputs: RestaurantObjectiveInput[]
): Promise<RestaurantObjective[]> {
  const results: RestaurantObjective[] = [];

  for (const input of inputs) {
    const result = await upsertRestaurantObjective(input);
    results.push(result);
  }

  return results;
}

/**
 * Delete a restaurant objective
 */
export async function deleteRestaurantObjective(id: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_objectives')
    .delete()
    .eq('id', id);

  if (error) handleQueryError(error, 'Error al eliminar el objetivo');
}
