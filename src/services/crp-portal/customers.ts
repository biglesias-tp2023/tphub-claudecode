/**
 * CRP Portal Customers Service
 *
 * Provides customer analytics data from the crp_portal__ft_order_head table.
 * Calculates metrics like retention, churn risk, cohorts, and multi-platform analysis.
 *
 * ## SOLID Principles Applied
 *
 * - **Single Responsibility**: This module only handles customer analytics
 * - **Open/Closed**: New metrics can be added without modifying existing code
 * - **Dependency Inversion**: Depends on types/interfaces, not concrete implementations
 *
 * ## Data Flow
 *
 * ```
 * Supabase (crp_portal__ft_order_head)
 *     |
 * fetchCustomerOrders() -> Raw customer order data
 *     |
 * Various aggregation functions -> Metrics, Cohorts, Risk Scores
 * ```
 *
 * @module services/crp-portal/customers
 */

import { supabase } from '../supabase';
import type { ChannelId } from '@/types';
import { PORTAL_IDS } from './types';
import { handleCrpError } from './errors';

// ============================================
// TYPES
// ============================================

/** Row returned by the get_customer_segments RPC */
export interface CustomerSegmentRow {
  pfk_id_company: string;
  pfk_id_store: string;
  pfk_id_store_address: string;
  pfk_id_portal: string;
  new_customers: number;
  occasional_customers: number;
  frequent_customers: number;
}

export interface FetchCustomerDataParams {
  /** Filter by company IDs */
  companyIds?: number[];
  /** Filter by brand/store IDs */
  brandIds?: number[];
  /** Filter by channels */
  channelIds?: ChannelId[];
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  /** End date (YYYY-MM-DD) */
  endDate: string;
}

/** Raw order data for customer analysis */
interface CustomerOrder {
  customerId: string;
  orderDate: Date;
  totalPrice: number;
  promotions: number;
  refunds: number;
  isNewCustomer: boolean;
  portalId: string;
}

/** Customer aggregate metrics */
export interface CustomerMetrics {
  /** Total unique customers */
  totalCustomers: number;
  /** New customers (flg_customer_new = true) */
  newCustomers: number;
  /** Returning customers */
  returningCustomers: number;
  /** Retention rate percentage (customers with >1 order / total) */
  retentionRate: number;
  /** Average days between orders (kept for churn risk, not shown in scorecards) */
  avgFrequencyDays: number;
  /** Average spend per customer (totalRevenue / totalCustomers) */
  avgSpendPerCustomer: number;
  /** Average ticket across all customers */
  avgTicket: number;
  /** Total orders */
  totalOrders: number;
  /** Total revenue */
  totalRevenue: number;
  /** Average orders per customer */
  avgOrdersPerCustomer: number;
}

/** Metrics with period comparison */
export interface CustomerMetricsWithChanges extends CustomerMetrics {
  totalCustomersChange: number;
  newCustomersChange: number;
  retentionRateChange: number;
  avgSpendPerCustomerChange: number;
  avgOrdersPerCustomerChange: number;
  avgTicketChange: number;
}

/** Channel-specific customer metrics */
export interface ChannelCustomerMetrics {
  channelId: ChannelId;
  channelName: string;
  totalCustomers: number;
  newCustomers: number;
  newCustomersPercentage: number;
  avgTicket: number;
  avgOrdersPerCustomer: number;
  /** Customers with more than 1 order */
  returningCustomers: number;
  /** Percentage of customers with more than 1 order */
  repetitionRate: number;
  /** Net revenue per customer: (totalRevenue - refunds) / totalCustomers */
  netRevenuePerCustomer: number;
  /** Percentage of orders that used promotions */
  promoOrdersPercentage: number;
}

/** Cohort data for retention analysis */
export interface CohortData {
  /** Cohort identifier (e.g., "2026-01" for January 2026) */
  cohortId: string;
  /** Number of customers in this cohort */
  cohortSize: number;
  /** Retention by specific period (0 = first purchase, 1 = second period, etc.) */
  retention: number[];
  /** Cumulative retention (% who have returned at least once up to this period) */
  cumulativeRetention: number[];
  /** Absolute customer counts per period (for tooltips) */
  retentionCounts: number[];
}

/** Customer with churn risk score */
export interface CustomerChurnRisk {
  customerId: string;
  lastOrderDate: Date;
  daysSinceLastOrder: number;
  totalOrders: number;
  totalSpend: number;
  avgFrequencyDays: number;
  /** Risk score: 'high' (>2x), 'medium' (1.5-2x), 'low' (<1.5x) */
  riskLevel: 'high' | 'medium' | 'low';
  /** Ratio of days since last order to average frequency */
  riskScore: number;
}

/** Multi-platform analysis */
export interface MultiPlatformAnalysis {
  /** Customers using only Glovo */
  glovoOnly: number;
  /** Customers using only UberEats */
  ubereatsOnly: number;
  /** Customers using only JustEat */
  justeatOnly: number;
  /** Customers using multiple platforms */
  multiPlatform: number;
  /** Percentage of multi-platform customers */
  multiPlatformPercentage: number;
  /** Overlap breakdown: which channel combinations multi-platform customers use */
  overlapBreakdown: { channels: ChannelId[]; count: number }[];
}

/** Revenue concentration (Pareto) */
export interface RevenueConcentration {
  /** % of revenue from top 10% of customers */
  top10Pct: number;
  /** % of revenue from top 20% of customers */
  top20Pct: number;
  /** % of revenue from top 50% of customers */
  top50Pct: number;
  /** Gini coefficient (0 = perfectly equal, 1 = perfectly unequal) */
  giniCoefficient: number;
}

/** Post-promo health segments */
export interface PostPromoHealth {
  /** Customers acquired with promo who returned without promo */
  sticky: number;
  /** Customers acquired with promo who only buy with promo */
  promocioneros: number;
  /** Customers who entered without promo */
  organico: number;
  /** Inactive 45+ days reactivated by promo */
  dormidos: number;
  /** Total classified customers */
  total: number;
}

// ============================================
// CONSTANTS & HELPERS
// ============================================

/** Number of days to look back for customer history */
const LOOKBACK_DAYS = 183;

/**
 * Maps a portal ID to a channel ID.
 */
function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  return null;
}

/**
 * Maps a channel ID to portal IDs.
 */
function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO];
    case 'ubereats':
      return [PORTAL_IDS.UBEREATS];
    case 'justeat':
      return [];
    default:
      return [];
  }
}

/**
 * Calculate percentage change between two values.
 */
function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get cohort ID from date (format: YYYY-MM or YYYY-WXX)
 */
function getCohortId(date: Date, granularity: 'week' | 'month'): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (granularity === 'month') {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  // Week number calculation (ISO week)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Compute the lookback start date: startDate minus LOOKBACK_DAYS.
 */
function computeLookbackStart(startDate: string): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() - LOOKBACK_DAYS);
  return d.toISOString().split('T')[0];
}

/** Context returned by fetchOrdersWithContext */
interface OrdersContext {
  /** All orders in lookback + analysis range */
  allOrders: CustomerOrder[];
  /** Set of customer IDs who ordered within [analysisStart, analysisEnd] */
  activeCustomerIds: Set<string>;
  /** Original analysis start date as Date */
  analysisStart: Date;
  /** Original analysis end date as Date */
  analysisEnd: Date;
}

/**
 * Fetches orders with 183-day lookback and identifies active customers.
 *
 * - Queries from (startDate - 183d) to endDate
 * - Active customers = those with at least 1 order in [startDate, endDate]
 * - All orders (including lookback) are used to classify customers
 */
async function fetchOrdersWithContext(params: FetchCustomerDataParams): Promise<OrdersContext> {
  const lookbackStart = computeLookbackStart(params.startDate);
  const extendedParams: FetchCustomerDataParams = {
    ...params,
    startDate: lookbackStart,
  };

  const allOrders = await fetchCustomerOrders(extendedParams);
  const analysisStart = new Date(`${params.startDate}T00:00:00`);
  const analysisEnd = new Date(`${params.endDate}T23:59:59`);

  // Active = ordered in the selected range
  const activeCustomerIds = new Set<string>();
  for (const order of allOrders) {
    if (order.orderDate >= analysisStart && order.orderDate <= analysisEnd) {
      activeCustomerIds.add(order.customerId);
    }
  }

  return { allOrders, activeCustomerIds, analysisStart, analysisEnd };
}

/**
 * Group orders by customer ID, optionally filtered to specific customer IDs.
 */
function groupByCustomer(
  orders: CustomerOrder[],
  filterCustomerIds?: Set<string>
): Map<string, CustomerOrder[]> {
  const map = new Map<string, CustomerOrder[]>();
  for (const order of orders) {
    if (filterCustomerIds && !filterCustomerIds.has(order.customerId)) continue;
    if (!map.has(order.customerId)) {
      map.set(order.customerId, []);
    }
    map.get(order.customerId)!.push(order);
  }
  return map;
}

// ============================================
// DATA FETCHING
// ============================================

/**
 * Fetches raw order data for customer analysis using pagination.
 *
 * NOTE: Uses pagination to bypass Supabase's server-side max_rows limit (default 1000).
 * This ensures all orders are fetched even when selecting multiple companies.
 */
async function fetchCustomerOrders(params: FetchCustomerDataParams): Promise<CustomerOrder[]> {
  const { companyIds, brandIds, channelIds, startDate, endDate } = params;

  // Determine portal IDs for channel filter
  let portalIdsToFilter: string[] | null = null;
  if (channelIds && channelIds.length > 0) {
    portalIdsToFilter = channelIds.flatMap(channelIdToPortalIds);
  }

  // Use pagination to fetch all orders (bypasses Supabase's server-side max_rows limit)
  const PAGE_SIZE = 1000;
  const allData: CustomerOrder[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('crp_portal__ft_order_head')
      .select('cod_id_customer, td_creation_time, amt_total_price, amt_promotions, amt_refunds, flg_customer_new, pfk_id_portal')
      .gte('td_creation_time', `${startDate}T00:00:00`)
      .lte('td_creation_time', `${endDate}T23:59:59`)
      .not('cod_id_customer', 'is', null);

    if (companyIds && companyIds.length > 0) {
      query = query.in('pfk_id_company', companyIds);
    }

    if (brandIds && brandIds.length > 0) {
      query = query.in('pfk_id_store', brandIds);
    }

    if (portalIdsToFilter && portalIdsToFilter.length > 0) {
      query = query.in('pfk_id_portal', portalIdsToFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      handleCrpError('fetchCustomerOrders', error);
    }

    if (data && data.length > 0) {
      const mapped = data.map((row) => ({
        customerId: row.cod_id_customer as string,
        orderDate: new Date(row.td_creation_time),
        totalPrice: row.amt_total_price || 0,
        promotions: row.amt_promotions || 0,
        refunds: row.amt_refunds || 0,
        isNewCustomer: row.flg_customer_new === true,
        portalId: row.pfk_id_portal as string,
      }));
      allData.push(...mapped);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  if (import.meta.env.DEV) {
    console.log(`[fetchCustomerOrders] Fetched ${allData.length} orders using pagination`);
  }

  return allData;
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

/**
 * Calculate customer metrics with lookback context.
 *
 * - Active customers = those who ordered in [analysisStart, analysisEnd]
 * - New = active customer with NO orders before analysisStart in the lookback
 * - Returning = active customer WITH orders before analysisStart
 * - Retention rate = active customers with >1 order total (lookback+range) / active customers
 * - Revenue/orders/ticket = computed from orders IN THE ANALYSIS RANGE only
 */
function calculateMetricsWithContext(ctx: OrdersContext): CustomerMetrics {
  const { allOrders, activeCustomerIds, analysisStart, analysisEnd } = ctx;

  if (activeCustomerIds.size === 0) {
    return {
      totalCustomers: 0, newCustomers: 0, returningCustomers: 0,
      retentionRate: 0, avgFrequencyDays: 0, avgSpendPerCustomer: 0,
      avgTicket: 0, totalOrders: 0, totalRevenue: 0, avgOrdersPerCustomer: 0,
    };
  }

  // Group ALL orders by active customer
  const customerAllOrders = groupByCustomer(allOrders, activeCustomerIds);

  const totalCustomers = activeCustomerIds.size;
  let newCustomers = 0;
  let returningCustomers = 0;
  let totalFrequencyDays = 0;
  let customersWithMultipleOrders = 0;

  // Orders within the analysis range (for revenue/ticket calculations)
  let rangeOrders = 0;
  let rangeRevenue = 0;

  for (const [, custOrders] of customerAllOrders) {
    const sorted = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

    // New = no orders before analysisStart
    const hasOrderBeforeRange = sorted.some((o) => o.orderDate < analysisStart);
    if (hasOrderBeforeRange) {
      returningCustomers++;
    } else {
      newCustomers++;
    }

    // Count total orders for retention/frequency (full history)
    if (sorted.length > 1) {
      const firstOrder = sorted[0].orderDate;
      const lastOrder = sorted[sorted.length - 1].orderDate;
      const daysBetween = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24);
      const avgDays = daysBetween / (sorted.length - 1);
      totalFrequencyDays += avgDays;
      customersWithMultipleOrders++;
    }

    // Accumulate range-only metrics
    for (const order of sorted) {
      if (order.orderDate >= analysisStart && order.orderDate <= analysisEnd) {
        rangeOrders++;
        rangeRevenue += order.totalPrice;
      }
    }
  }

  const avgTicket = rangeOrders > 0 ? rangeRevenue / rangeOrders : 0;
  const avgOrdersPerCustomer = totalCustomers > 0 ? rangeOrders / totalCustomers : 0;
  const avgFrequencyDays = customersWithMultipleOrders > 0 ? totalFrequencyDays / customersWithMultipleOrders : 0;
  const avgSpendPerCustomer = totalCustomers > 0 ? rangeRevenue / totalCustomers : 0;
  const retentionRate = totalCustomers > 0 ? (customersWithMultipleOrders / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    retentionRate,
    avgFrequencyDays,
    avgSpendPerCustomer,
    avgTicket,
    totalOrders: rangeOrders,
    totalRevenue: rangeRevenue,
    avgOrdersPerCustomer,
  };
}

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Fetches customer metrics with period comparison.
 * Both periods use 183-day lookback for classification.
 */
export async function fetchCustomerMetrics(
  currentParams: FetchCustomerDataParams,
  previousParams: FetchCustomerDataParams
): Promise<CustomerMetricsWithChanges> {
  const [currentCtx, previousCtx] = await Promise.all([
    fetchOrdersWithContext(currentParams),
    fetchOrdersWithContext(previousParams),
  ]);

  const current = calculateMetricsWithContext(currentCtx);
  const previous = calculateMetricsWithContext(previousCtx);

  return {
    ...current,
    totalCustomersChange: calcChange(current.totalCustomers, previous.totalCustomers),
    newCustomersChange: calcChange(current.newCustomers, previous.newCustomers),
    retentionRateChange: calcChange(current.retentionRate, previous.retentionRate),
    avgSpendPerCustomerChange: calcChange(current.avgSpendPerCustomer, previous.avgSpendPerCustomer),
    avgOrdersPerCustomerChange: calcChange(current.avgOrdersPerCustomer, previous.avgOrdersPerCustomer),
    avgTicketChange: calcChange(current.avgTicket, previous.avgTicket),
  };
}

/**
 * Fetches customer metrics by channel with lookback context.
 *
 * Active in channel X = ordered in channel X during [startDate, endDate].
 * History in channel X = all orders in that channel during lookback+range.
 */
export async function fetchCustomerMetricsByChannel(
  params: FetchCustomerDataParams
): Promise<ChannelCustomerMetrics[]> {
  const { allOrders, analysisStart, analysisEnd } = await fetchOrdersWithContext(params);

  const channelNames: Record<ChannelId, string> = {
    glovo: 'Glovo',
    ubereats: 'Uber Eats',
    justeat: 'Just Eat',
  };

  const results: ChannelCustomerMetrics[] = [];

  for (const channelId of ['glovo', 'ubereats', 'justeat'] as ChannelId[]) {
    // Filter all orders for this channel
    const chAllOrders = allOrders.filter((o) => portalIdToChannelId(o.portalId) === channelId);

    // Active in this channel = ordered in range in this channel
    const chActiveIds = new Set<string>();
    for (const order of chAllOrders) {
      if (order.orderDate >= analysisStart && order.orderDate <= analysisEnd) {
        chActiveIds.add(order.customerId);
      }
    }

    if (chActiveIds.size === 0) continue;

    // Group all channel orders by active customer
    const customerAllOrders = groupByCustomer(chAllOrders, chActiveIds);

    const totalCustomers = chActiveIds.size;
    let newCustomers = 0;
    let returningCustomers = 0;
    let rangeOrders = 0;
    let rangeRevenue = 0;
    let rangeRefunds = 0;
    let rangePromoOrders = 0;

    for (const [, custOrders] of customerAllOrders) {
      const sorted = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

      // New in this channel = no orders before analysisStart in this channel
      const hasOrderBefore = sorted.some((o) => o.orderDate < analysisStart);
      if (hasOrderBefore) returningCustomers++;
      else newCustomers++;

      // Range-only metrics
      for (const order of sorted) {
        if (order.orderDate >= analysisStart && order.orderDate <= analysisEnd) {
          rangeOrders++;
          rangeRevenue += order.totalPrice;
          rangeRefunds += order.refunds;
          if (order.promotions > 0) rangePromoOrders++;
        }
      }
    }

    // Returning = customers with >1 order total in this channel (lookback+range)
    let customersWithMultipleOrders = 0;
    for (const [, custOrders] of customerAllOrders) {
      if (custOrders.length > 1) customersWithMultipleOrders++;
    }

    const avgTicket = rangeOrders > 0 ? rangeRevenue / rangeOrders : 0;
    const avgOrdersPerCustomer = totalCustomers > 0 ? rangeOrders / totalCustomers : 0;
    const repetitionRate = totalCustomers > 0 ? (customersWithMultipleOrders / totalCustomers) * 100 : 0;
    const netRevenuePerCustomer = totalCustomers > 0 ? (rangeRevenue - rangeRefunds) / totalCustomers : 0;
    const promoOrdersPercentage = rangeOrders > 0 ? (rangePromoOrders / rangeOrders) * 100 : 0;

    results.push({
      channelId,
      channelName: channelNames[channelId],
      totalCustomers,
      newCustomers,
      newCustomersPercentage: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0,
      avgTicket,
      avgOrdersPerCustomer,
      returningCustomers: customersWithMultipleOrders,
      repetitionRate,
      netRevenuePerCustomer,
      promoOrdersPercentage,
    });
  }

  return results;
}

/**
 * Fetches cohort retention data with lookback.
 *
 * Unlike other functions, cohorts include ALL customers in the lookback+range window,
 * not just active ones. This avoids survivorship bias: a cohort from Oct 2025 should
 * show all customers who first purchased in Oct, including those who never returned.
 * Otherwise retention for old cohorts would be artificially inflated.
 *
 * - Cohort = month/week of REAL first order in the full window
 * - Purchase periods tracked across the full lookback+range window
 */
export async function fetchCustomerCohorts(
  params: FetchCustomerDataParams,
  granularity: 'week' | 'month' = 'month'
): Promise<CohortData[]> {
  const { allOrders } = await fetchOrdersWithContext(params);

  if (allOrders.length === 0) {
    return [];
  }

  // Group ALL orders by ALL customers (no active filter — avoids survivorship bias)
  const customerAllOrders = groupByCustomer(allOrders);

  // Determine first purchase cohort for each customer (real first order in lookback+range)
  const customerCohorts = new Map<string, { cohortId: string; purchasePeriods: Set<string> }>();

  for (const [customerId, custOrders] of customerAllOrders) {
    const sortedOrders = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
    const firstOrder = sortedOrders[0];
    const cohortId = getCohortId(firstOrder.orderDate, granularity);

    const purchasePeriods = new Set<string>();
    for (const order of sortedOrders) {
      purchasePeriods.add(getCohortId(order.orderDate, granularity));
    }

    customerCohorts.set(customerId, { cohortId, purchasePeriods });
  }

  // Get all unique periods sorted
  const allPeriods = new Set<string>();
  for (const { cohortId, purchasePeriods } of customerCohorts.values()) {
    allPeriods.add(cohortId);
    for (const period of purchasePeriods) {
      allPeriods.add(period);
    }
  }
  const sortedPeriods = Array.from(allPeriods).sort();

  // Build cohort data
  const cohortDataMap = new Map<string, { size: number; periodCounts: Map<number, number> }>();

  for (const { cohortId, purchasePeriods } of customerCohorts.values()) {
    if (!cohortDataMap.has(cohortId)) {
      cohortDataMap.set(cohortId, { size: 0, periodCounts: new Map() });
    }
    const cohort = cohortDataMap.get(cohortId)!;
    cohort.size++;

    const cohortPeriodIndex = sortedPeriods.indexOf(cohortId);
    for (const period of purchasePeriods) {
      const periodIndex = sortedPeriods.indexOf(period);
      const relativePeriod = periodIndex - cohortPeriodIndex;
      if (relativePeriod >= 0) {
        cohort.periodCounts.set(relativePeriod, (cohort.periodCounts.get(relativePeriod) || 0) + 1);
      }
    }
  }

  // Convert to CohortData array
  const cohorts: CohortData[] = [];
  const maxPeriods = granularity === 'week' ? 8 : 6;

  for (const [cohortId, data] of cohortDataMap) {
    const retention: number[] = [];
    const retentionCounts: number[] = [];
    for (let i = 0; i <= maxPeriods; i++) {
      const count = data.periodCounts.get(i) || 0;
      retentionCounts.push(count);
      retention.push(data.size > 0 ? (count / data.size) * 100 : 0);
    }

    // Calculate cumulative retention
    const cumulativeRetention: number[] = [];
    const returnedCustomers = new Set<string>();

    for (let i = 0; i <= maxPeriods; i++) {
      if (i === 0) {
        cumulativeRetention.push(100);
      } else {
        for (const [customerId, { cohortId: cId, purchasePeriods }] of customerCohorts) {
          if (cId !== cohortId) continue;
          const cohortPeriodIndex = sortedPeriods.indexOf(cohortId);
          for (const period of purchasePeriods) {
            const periodIndex = sortedPeriods.indexOf(period);
            const relativePeriod = periodIndex - cohortPeriodIndex;
            if (relativePeriod > 0 && relativePeriod <= i) {
              returnedCustomers.add(customerId);
              break;
            }
          }
        }
        cumulativeRetention.push(data.size > 0 ? (returnedCustomers.size / data.size) * 100 : 0);
      }
    }

    cohorts.push({
      cohortId,
      cohortSize: data.size,
      retention,
      cumulativeRetention,
      retentionCounts,
    });
  }

  cohorts.sort((a, b) => a.cohortId.localeCompare(b.cohortId));
  return cohorts.slice(-8);
}

/**
 * Fetches customers at risk of churning (uses lookback for full history).
 */
export async function fetchChurnRiskCustomers(
  params: FetchCustomerDataParams,
  limit = 20
): Promise<CustomerChurnRisk[]> {
  const { allOrders, activeCustomerIds } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) return [];

  const customerAllOrders = groupByCustomer(allOrders, activeCustomerIds);
  const today = new Date();
  const risks: CustomerChurnRisk[] = [];

  for (const [customerId, custOrders] of customerAllOrders) {
    if (custOrders.length < 2) continue;

    const sortedOrders = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
    const lastOrder = sortedOrders[sortedOrders.length - 1];
    const totalSpend = custOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const firstOrder = sortedOrders[0];
    const daysBetweenAll = (lastOrder.orderDate.getTime() - firstOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24);
    const avgFrequencyDays = daysBetweenAll / (sortedOrders.length - 1);
    const daysSinceLastOrder = (today.getTime() - lastOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24);
    const riskScore = avgFrequencyDays > 0 ? daysSinceLastOrder / avgFrequencyDays : 0;

    let riskLevel: 'high' | 'medium' | 'low';
    if (riskScore > 2) riskLevel = 'high';
    else if (riskScore > 1.5) riskLevel = 'medium';
    else riskLevel = 'low';

    risks.push({
      customerId,
      lastOrderDate: lastOrder.orderDate,
      daysSinceLastOrder: Math.floor(daysSinceLastOrder),
      totalOrders: custOrders.length,
      totalSpend,
      avgFrequencyDays: Math.round(avgFrequencyDays),
      riskLevel,
      riskScore,
    });
  }

  return risks
    .filter((r) => r.riskLevel !== 'low')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/**
 * Fetches multi-platform customer analysis (uses lookback for full history).
 */
export async function fetchMultiPlatformAnalysis(
  params: FetchCustomerDataParams
): Promise<MultiPlatformAnalysis> {
  const { allOrders, activeCustomerIds } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) {
    return { glovoOnly: 0, ubereatsOnly: 0, justeatOnly: 0, multiPlatform: 0, multiPlatformPercentage: 0, overlapBreakdown: [] };
  }

  // Track platforms per active customer using full history
  const customerPlatforms = new Map<string, Set<ChannelId>>();
  for (const order of allOrders) {
    if (!activeCustomerIds.has(order.customerId)) continue;
    const channelId = portalIdToChannelId(order.portalId);
    if (!channelId) continue;
    if (!customerPlatforms.has(order.customerId)) {
      customerPlatforms.set(order.customerId, new Set());
    }
    customerPlatforms.get(order.customerId)!.add(channelId);
  }

  let glovoOnly = 0;
  let ubereatsOnly = 0;
  let justeatOnly = 0;
  let multiPlatform = 0;
  const overlapCounts = new Map<string, { channels: ChannelId[]; count: number }>();

  for (const platforms of customerPlatforms.values()) {
    if (platforms.size > 1) {
      multiPlatform++;
      const sorted = Array.from(platforms).sort() as ChannelId[];
      const key = sorted.join('+');
      if (!overlapCounts.has(key)) overlapCounts.set(key, { channels: sorted, count: 0 });
      overlapCounts.get(key)!.count++;
    } else {
      const platform = Array.from(platforms)[0];
      if (platform === 'glovo') glovoOnly++;
      else if (platform === 'ubereats') ubereatsOnly++;
      else if (platform === 'justeat') justeatOnly++;
    }
  }

  const totalCustomers = customerPlatforms.size;
  return {
    glovoOnly,
    ubereatsOnly,
    justeatOnly,
    multiPlatform,
    multiPlatformPercentage: totalCustomers > 0 ? (multiPlatform / totalCustomers) * 100 : 0,
    overlapBreakdown: Array.from(overlapCounts.values()).sort((a, b) => b.count - a.count),
  };
}

/**
 * Fetches revenue concentration (Pareto) analysis.
 *
 * - Active customers = ordered in range
 * - Spend = revenue IN THE RANGE only (concentration of current activity)
 * - Gini uses optimized O(n log n) formula instead of O(n²)
 */
export async function fetchRevenueConcentration(
  params: FetchCustomerDataParams
): Promise<RevenueConcentration> {
  const { allOrders, activeCustomerIds, analysisStart, analysisEnd } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) {
    return { top10Pct: 0, top20Pct: 0, top50Pct: 0, giniCoefficient: 0 };
  }

  // Calculate spend per active customer IN THE RANGE only
  const customerSpend = new Map<string, number>();
  for (const order of allOrders) {
    if (!activeCustomerIds.has(order.customerId)) continue;
    if (order.orderDate < analysisStart || order.orderDate > analysisEnd) continue;
    const current = customerSpend.get(order.customerId) || 0;
    customerSpend.set(order.customerId, current + order.totalPrice);
  }

  const spends = Array.from(customerSpend.values()).sort((a, b) => b - a);
  const totalRevenue = spends.reduce((sum, s) => sum + s, 0);
  const n = spends.length;

  if (totalRevenue === 0) {
    return { top10Pct: 0, top20Pct: 0, top50Pct: 0, giniCoefficient: 0 };
  }

  const revenueFromTopN = (pct: number): number => {
    const count = Math.max(1, Math.ceil(n * pct));
    const topSum = spends.slice(0, count).reduce((sum, s) => sum + s, 0);
    return (topSum / totalRevenue) * 100;
  };

  // Gini coefficient — O(n log n) formula: G = (2 * Σ(i * y_i)) / (n * Σy_i) - (n + 1) / n
  const sortedAsc = [...spends].sort((a, b) => a - b);
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * sortedAsc[i];
  }
  const giniCoefficient = n > 1
    ? (2 * weightedSum) / (n * totalRevenue) - (n + 1) / n
    : 0;

  return {
    top10Pct: revenueFromTopN(0.1),
    top20Pct: revenueFromTopN(0.2),
    top50Pct: revenueFromTopN(0.5),
    giniCoefficient: Math.min(Math.max(giniCoefficient, 0), 1),
  };
}

/**
 * Fetches post-promo health segments with lookback.
 *
 * - Active customers = ordered in [startDate, endDate]
 * - Classification uses FULL history (lookback+range):
 *   1. Dormidos: Gap ≥183d between consecutive orders AND reactivation order had promo
 *   2. Sticky: Real first order had promo AND at least one later order without promo
 *   3. Promocioneros: Real first order had promo AND all later orders with promo
 *   4. Orgánico: Real first order had no promo
 */
export async function fetchPostPromoHealth(
  params: FetchCustomerDataParams
): Promise<PostPromoHealth> {
  const { allOrders, activeCustomerIds } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) {
    return { sticky: 0, promocioneros: 0, organico: 0, dormidos: 0, total: 0 };
  }

  // Group ALL orders by active customer
  const customerAllOrders = groupByCustomer(allOrders, activeCustomerIds);

  let sticky = 0;
  let promocioneros = 0;
  let organico = 0;
  let dormidos = 0;

  for (const [, custOrders] of customerAllOrders) {
    const sorted = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

    // Check for dormidos first: 183+ day gap with promo reactivation
    let isDormido = false;
    if (sorted.length >= 2) {
      for (let i = 1; i < sorted.length; i++) {
        const gapDays = (sorted[i].orderDate.getTime() - sorted[i - 1].orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (gapDays >= LOOKBACK_DAYS && sorted[i].promotions > 0) {
          isDormido = true;
          break;
        }
      }
    }

    if (isDormido) {
      dormidos++;
      continue;
    }

    // Real first order (earliest in lookback+range)
    const firstOrderHadPromo = sorted[0].promotions > 0;

    if (firstOrderHadPromo) {
      const hasOrganicReturn = sorted.length > 1 && sorted.slice(1).some((o) => o.promotions === 0);
      if (hasOrganicReturn) {
        sticky++;
      } else {
        promocioneros++;
      }
    } else {
      organico++;
    }
  }

  return {
    sticky,
    promocioneros,
    organico,
    dormidos,
    total: activeCustomerIds.size,
  };
}

// ============================================
// RFM ANALYSIS
// ============================================

export type RFMSegment = 'champions' | 'loyal' | 'promising' | 'at_risk' | 'lost';

export interface RFMSegmentData {
  segment: RFMSegment;
  count: number;
  revenue: number;
  avgTicket: number;
  pctCustomers: number;
  pctRevenue: number;
}

export interface RFMAnalysis {
  segments: RFMSegmentData[];
  totalCustomers: number;
  totalRevenue: number;
}

/**
 * Assign quintile scores (1-5) to a sorted array of values.
 */
function assignQuintiles(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];

  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const scores = new Array<number>(n);

  for (let rank = 0; rank < n; rank++) {
    const quintile = Math.min(5, Math.floor((rank / n) * 5) + 1);
    scores[sorted[rank].i] = quintile;
  }
  return scores;
}

/**
 * Map R/F/M scores to a segment.
 */
function rfmToSegment(r: number, f: number, m: number): RFMSegment {
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (f >= 3 && m >= 3) return 'loyal';
  if (r >= 4 && f <= 2) return 'promising';
  if (r <= 2 && f >= 2) return 'at_risk';
  return 'lost';
}

/**
 * Fetches RFM (Recency, Frequency, Monetary) segmentation analysis with lookback.
 *
 * - Active customers = ordered in [startDate, endDate]
 * - R = days since last order (across full lookback+range) to endDate
 * - F = total orders in lookback+range
 * - M = total spend in lookback+range
 */
export async function fetchRFMAnalysis(params: FetchCustomerDataParams): Promise<RFMAnalysis> {
  const { allOrders, activeCustomerIds, analysisEnd } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) {
    return { segments: [], totalCustomers: 0, totalRevenue: 0 };
  }

  // Group ALL orders by active customer
  const customerAllOrders = groupByCustomer(allOrders, activeCustomerIds);

  const customerIds: string[] = [];
  const recencies: number[] = [];
  const frequencies: number[] = [];
  const monetaries: number[] = [];

  for (const [customerId, custOrders] of customerAllOrders) {
    const sorted = custOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    const recencyDays = Math.floor((analysisEnd.getTime() - sorted[0].orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = sorted.length;
    const monetary = sorted.reduce((sum, o) => sum + o.totalPrice, 0);

    customerIds.push(customerId);
    recencies.push(recencyDays);
    frequencies.push(frequency);
    monetaries.push(monetary);
  }

  const invertedRecencies = recencies.map((r) => -r);
  const rScores = assignQuintiles(invertedRecencies);
  const fScores = assignQuintiles(frequencies);
  const mScores = assignQuintiles(monetaries);

  const segmentAgg = new Map<RFMSegment, { count: number; revenue: number; totalOrders: number }>();
  let totalRevenue = 0;

  for (let i = 0; i < customerIds.length; i++) {
    const segment = rfmToSegment(rScores[i], fScores[i], mScores[i]);
    if (!segmentAgg.has(segment)) {
      segmentAgg.set(segment, { count: 0, revenue: 0, totalOrders: 0 });
    }
    const agg = segmentAgg.get(segment)!;
    agg.count++;
    agg.revenue += monetaries[i];
    agg.totalOrders += frequencies[i];
    totalRevenue += monetaries[i];
  }

  const totalCustomers = customerIds.length;
  const segmentOrder: RFMSegment[] = ['champions', 'loyal', 'promising', 'at_risk', 'lost'];

  const segments: RFMSegmentData[] = segmentOrder
    .filter((s) => segmentAgg.has(s))
    .map((segment) => {
      const agg = segmentAgg.get(segment)!;
      return {
        segment,
        count: agg.count,
        revenue: agg.revenue,
        avgTicket: agg.totalOrders > 0 ? agg.revenue / agg.totalOrders : 0,
        pctCustomers: totalCustomers > 0 ? (agg.count / totalCustomers) * 100 : 0,
        pctRevenue: totalRevenue > 0 ? (agg.revenue / totalRevenue) * 100 : 0,
      };
    });

  return { segments, totalCustomers, totalRevenue };
}

// ============================================
// REPEAT RATE
// ============================================

export interface RepeatRateData {
  rate30d: number;
  rate60d: number;
  rate90d: number;
  total30d: number;
  repeat30d: number;
  total60d: number;
  repeat60d: number;
  total90d: number;
  repeat90d: number;
}

/**
 * Fetches repeat rate at 30/60/90 day windows with lookback.
 *
 * For each active customer (ordered in the selected range):
 *   - Find their LAST order within the analysis range
 *   - Look back N days from that last order
 *   - If they have any PRIOR order in that window → they are a repeater
 *
 * Tasa 30d = "of everyone who bought this period, how many had also bought in the prior 30 days?"
 * Tasa 90d will always be ≥ Tasa 60d ≥ Tasa 30d (wider window catches more)
 */
export async function fetchRepeatRate(params: FetchCustomerDataParams): Promise<RepeatRateData> {
  const { allOrders, activeCustomerIds, analysisStart, analysisEnd } = await fetchOrdersWithContext(params);

  if (activeCustomerIds.size === 0) {
    return { rate30d: 0, rate60d: 0, rate90d: 0, total30d: 0, repeat30d: 0, total60d: 0, repeat60d: 0, total90d: 0, repeat90d: 0 };
  }

  // For each active customer: find their last order in the range + all prior orders
  const customerData = new Map<string, { lastInRange: Date; priorDates: Date[] }>();

  // First pass: find last order in range per customer
  for (const order of allOrders) {
    if (!activeCustomerIds.has(order.customerId)) continue;
    if (order.orderDate >= analysisStart && order.orderDate <= analysisEnd) {
      const existing = customerData.get(order.customerId);
      if (!existing || order.orderDate > existing.lastInRange) {
        if (!existing) {
          customerData.set(order.customerId, { lastInRange: order.orderDate, priorDates: [] });
        } else {
          existing.lastInRange = order.orderDate;
        }
      }
    }
  }

  // Second pass: collect all orders BEFORE lastInRange for each customer
  for (const order of allOrders) {
    const data = customerData.get(order.customerId);
    if (!data) continue;
    if (order.orderDate < data.lastInRange) {
      data.priorDates.push(order.orderDate);
    }
  }

  const total = customerData.size;

  function calcWindow(windowDays: number): { total: number; repeat: number; rate: number } {
    let repeat = 0;

    for (const { lastInRange, priorDates } of customerData.values()) {
      const windowStart = new Date(lastInRange);
      windowStart.setDate(windowStart.getDate() - windowDays);

      // Has any prior order within N days before their last order in range?
      const hasRecentPrior = priorDates.some((d) => d >= windowStart);
      if (hasRecentPrior) {
        repeat++;
      }
    }

    return { total, repeat, rate: total > 0 ? (repeat / total) * 100 : 0 };
  }

  const w30 = calcWindow(30);
  const w60 = calcWindow(60);
  const w90 = calcWindow(90);

  return {
    rate30d: w30.rate,
    rate60d: w60.rate,
    rate90d: w90.rate,
    total30d: w30.total,
    repeat30d: w30.repeat,
    total60d: w60.total,
    repeat60d: w60.repeat,
    total90d: w90.total,
    repeat90d: w90.repeat,
  };
}

// ============================================
// CUSTOMER BASE TREND
// ============================================

export interface CustomerBaseTrendWeek {
  weekLabel: string;
  nuevos: number;
  recurrentes: number;
  frecuentes: number;
  vip: number;
  total: number;
}

/**
 * Fetches customer base trend for the last 8 weeks.
 *
 * For each week, classifies each unique customer by their order history
 * in the 183 days prior to that week:
 * - Nuevo: 0 prior orders
 * - Recurrente: 1-3 prior orders
 * - Frecuente: 4-9 prior orders
 * - VIP: 10+ prior orders
 */
export async function fetchCustomerBaseTrend(
  params: FetchCustomerDataParams,
  weeks: { start: string; end: string; label: string }[]
): Promise<CustomerBaseTrendWeek[]> {
  // Fetch a broader range to cover 183-day lookback from the earliest week
  const earliestWeek = weeks[0]?.start;
  if (!earliestWeek) return [];

  const lookbackStart = new Date(earliestWeek);
  lookbackStart.setDate(lookbackStart.getDate() - 183);

  const latestEnd = weeks[weeks.length - 1]?.end ?? params.endDate;

  const extendedParams: FetchCustomerDataParams = {
    ...params,
    startDate: lookbackStart.toISOString().split('T')[0],
    endDate: latestEnd,
  };

  const orders = await fetchCustomerOrders(extendedParams);

  if (orders.length === 0) {
    return weeks.map((w) => ({ weekLabel: w.label, nuevos: 0, recurrentes: 0, frecuentes: 0, vip: 0, total: 0 }));
  }

  const result: CustomerBaseTrendWeek[] = [];

  for (const week of weeks) {
    const weekStart = new Date(`${week.start}T00:00:00`);
    const weekEnd = new Date(`${week.end}T23:59:59`);
    const lookbackDate = new Date(weekStart);
    lookbackDate.setDate(lookbackDate.getDate() - 183);

    // Find customers who ordered in this week
    const weekCustomers = new Set<string>();
    for (const order of orders) {
      if (order.orderDate >= weekStart && order.orderDate <= weekEnd) {
        weekCustomers.add(order.customerId);
      }
    }

    // For each week customer, count their prior orders in the 183-day lookback
    let nuevos = 0;
    let recurrentes = 0;
    let frecuentes = 0;
    let vip = 0;

    for (const customerId of weekCustomers) {
      let priorOrders = 0;
      for (const order of orders) {
        if (
          order.customerId === customerId &&
          order.orderDate >= lookbackDate &&
          order.orderDate < weekStart
        ) {
          priorOrders++;
        }
      }

      if (priorOrders === 0) nuevos++;
      else if (priorOrders <= 3) recurrentes++;
      else if (priorOrders <= 9) frecuentes++;
      else vip++;
    }

    result.push({
      weekLabel: week.label,
      nuevos,
      recurrentes,
      frecuentes,
      vip,
      total: weekCustomers.size,
    });
  }

  return result;
}

// ============================================
// WEEKLY CUSTOMER SEGMENTS (RPC)
// ============================================

/**
 * Fetches customer segments for a given week using the get_customer_segments RPC.
 *
 * Classifies customers who ordered during the week by their historical frequency:
 * - New: 0 prior orders in 183-day lookback
 * - Occasional: 1-3 prior orders
 * - Frequent: 4+ prior orders
 */
export async function fetchWeeklyCustomerSegments(
  companyIds: string[],
  weekStart: string,
  weekEnd: string,
): Promise<CustomerSegmentRow[]> {
  const { data, error } = await supabase.rpc('get_customer_segments', {
    p_company_ids: companyIds,
    p_week_start: `${weekStart}T00:00:00`,
    p_week_end: `${weekEnd}T23:59:59`,
  });

  if (error) {
    handleCrpError('fetchWeeklyCustomerSegments', error);
  }

  return (data ?? []) as CustomerSegmentRow[];
}

/** Row returned by get_customer_segments_batch (includes week_idx) */
export interface CustomerSegmentBatchRow extends CustomerSegmentRow {
  week_idx: number;
}

/**
 * Fetches customer segments for multiple weeks in a single RPC call.
 *
 * Replaces 8 parallel calls to fetchWeeklyCustomerSegments with one batch call
 * that processes weeks sequentially on the server side, reusing buffer cache
 * across iterations (lookback windows overlap ~97%).
 *
 * @returns Array of arrays — one per week, ordered by weekStarts index
 */
export async function fetchWeeklyCustomerSegmentsBatch(
  companyIds: string[],
  weekStarts: string[],
  weekEnds: string[],
): Promise<CustomerSegmentRow[][]> {
  const { data, error } = await supabase.rpc('get_customer_segments_batch', {
    p_company_ids: companyIds,
    p_week_starts: weekStarts,
    p_week_ends: weekEnds,
  }).limit(10000);

  if (error) {
    handleCrpError('fetchWeeklyCustomerSegmentsBatch', error);
  }

  const rows = (data ?? []) as CustomerSegmentBatchRow[];

  // Group by week_idx (1-based from the SQL function)
  const result: CustomerSegmentRow[][] = weekStarts.map(() => []);
  for (const row of rows) {
    const idx = row.week_idx - 1; // SQL uses 1-based index
    if (idx >= 0 && idx < result.length) {
      result[idx].push({
        pfk_id_company: row.pfk_id_company,
        pfk_id_store: row.pfk_id_store,
        pfk_id_store_address: row.pfk_id_store_address,
        pfk_id_portal: row.pfk_id_portal,
        new_customers: row.new_customers,
        occasional_customers: row.occasional_customers,
        frequent_customers: row.frequent_customers,
      });
    }
  }

  return result;
}
