/**
 * Restaurant KPIs data operations
 */

import { supabase, handleQueryError, isDevMode, mockKpis } from './shared';
import { mapDbKpisToKpis } from './mappers';
import type { RestaurantKpis, PeriodType, DbRestaurantKpis } from '@/types';

interface FetchKpisParams {
  restaurantIds?: string[];
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
}

/**
 * Fetch restaurant KPIs with optional filtering
 */
export async function fetchRestaurantKpis(params: FetchKpisParams = {}): Promise<RestaurantKpis[]> {
  // Return mock data in dev mode
  if (isDevMode) {
    let kpis = mockKpis;
    if (params.restaurantIds && params.restaurantIds.length > 0) {
      kpis = kpis.filter((k) => params.restaurantIds!.includes(k.restaurantId));
    }
    if (params.startDate) {
      kpis = kpis.filter((k) => k.periodDate >= params.startDate!);
    }
    if (params.endDate) {
      kpis = kpis.filter((k) => k.periodDate <= params.endDate!);
    }
    if (params.periodType) {
      kpis = kpis.filter((k) => k.periodType === params.periodType);
    }
    return kpis.sort((a, b) => b.periodDate.localeCompare(a.periodDate));
  }

  let query = supabase
    .from('restaurant_kpis')
    .select('*')
    .order('period_date', { ascending: false });

  if (params.restaurantIds && params.restaurantIds.length > 0) {
    query = query.in('restaurant_id', params.restaurantIds);
  }
  if (params.startDate) {
    query = query.gte('period_date', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('period_date', params.endDate);
  }
  if (params.periodType) {
    query = query.eq('period_type', params.periodType);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar los KPIs');
  return (data as DbRestaurantKpis[]).map(mapDbKpisToKpis);
}

/**
 * Fetch aggregated KPIs for multiple restaurants
 */
export async function fetchAggregatedKpis(params: FetchKpisParams = {}): Promise<{
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  avgRating: number | null;
  ordersByChannel: { glovo: number; ubereats: number; justeat: number };
  revenueByChannel: { glovo: number; ubereats: number; justeat: number };
}> {
  const kpis = await fetchRestaurantKpis(params);

  if (kpis.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgTicket: 0,
      avgRating: null,
      ordersByChannel: { glovo: 0, ubereats: 0, justeat: 0 },
      revenueByChannel: { glovo: 0, ubereats: 0, justeat: 0 },
    };
  }

  const totalOrders = kpis.reduce((sum, k) => sum + k.totalOrders, 0);
  const totalRevenue = kpis.reduce((sum, k) => sum + k.totalRevenue, 0);
  const ratingsWithValues = kpis.filter((k) => k.avgRating !== null);
  const avgRating = ratingsWithValues.length > 0
    ? ratingsWithValues.reduce((sum, k) => sum + (k.avgRating || 0), 0) / ratingsWithValues.length
    : null;

  return {
    totalOrders,
    totalRevenue,
    avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    avgRating,
    ordersByChannel: {
      glovo: kpis.reduce((sum, k) => sum + k.ordersGlovo, 0),
      ubereats: kpis.reduce((sum, k) => sum + k.ordersUbereats, 0),
      justeat: kpis.reduce((sum, k) => sum + k.ordersJusteat, 0),
    },
    revenueByChannel: {
      glovo: kpis.reduce((sum, k) => sum + k.revenueGlovo, 0),
      ubereats: kpis.reduce((sum, k) => sum + k.revenueUbereats, 0),
      justeat: kpis.reduce((sum, k) => sum + k.revenueJusteat, 0),
    },
  };
}
