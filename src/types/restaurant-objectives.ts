// ============================================
// RESTAURANT OBJECTIVES
// ============================================

import type { ChannelId } from './channel';

export type InvestmentMode = 'percentage' | 'absolute';

/**
 * Restaurant objective from Supabase restaurant_objectives table
 */
export interface RestaurantObjective {
  id: string;
  restaurantId: string;
  channel: ChannelId;
  periodMonth: string;           // YYYY-MM-DD (first day of month)
  revenueTarget: number;
  adsInvestmentMode: InvestmentMode;
  adsInvestmentValue: number;
  promosInvestmentMode: InvestmentMode;
  promosInvestmentValue: number;
  foodcostTarget: number;
  marginTarget: number;          // Calculated by DB
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input type for creating/updating objectives
 */
export interface RestaurantObjectiveInput {
  restaurantId: string;
  channel: ChannelId;
  periodMonth: string;
  revenueTarget: number;
  adsInvestmentMode: InvestmentMode;
  adsInvestmentValue: number;
  promosInvestmentMode: InvestmentMode;
  promosInvestmentValue: number;
  foodcostTarget: number;
}

/**
 * Database row type for restaurant_objectives
 */
export interface DbRestaurantObjective {
  id: string;
  restaurant_id: string;
  channel: string;
  period_month: string;
  revenue_target: number;
  ads_investment_mode: string;
  ads_investment_value: number;
  promos_investment_mode: string;
  promos_investment_value: number;
  foodcost_target: number;
  margin_target: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

