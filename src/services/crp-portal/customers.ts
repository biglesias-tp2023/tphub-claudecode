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
// HELPERS
// ============================================

/**
 * Maps a portal ID to a channel ID.
 * Both Glovo IDs (original and new) map to 'glovo'.
 */
function portalIdToChannelId(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO || portalId === PORTAL_IDS.GLOVO_NEW) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  return null;
}

/**
 * Maps a channel ID to portal IDs.
 * Glovo includes both original and new portal IDs.
 */
function channelIdToPortalIds(channelId: ChannelId): string[] {
  switch (channelId) {
    case 'glovo':
      return [PORTAL_IDS.GLOVO, PORTAL_IDS.GLOVO_NEW];
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
      console.error('Error fetching customer orders:', error);
      throw error;
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
 * Calculate customer metrics from order data.
 */
function calculateMetrics(orders: CustomerOrder[]): CustomerMetrics {
  if (orders.length === 0) {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      retentionRate: 0,
      avgFrequencyDays: 0,
      avgSpendPerCustomer: 0,
      avgTicket: 0,
      totalOrders: 0,
      totalRevenue: 0,
      avgOrdersPerCustomer: 0,
    };
  }

  // Group orders by customer
  const customerOrders = new Map<string, CustomerOrder[]>();
  for (const order of orders) {
    if (!customerOrders.has(order.customerId)) {
      customerOrders.set(order.customerId, []);
    }
    customerOrders.get(order.customerId)!.push(order);
  }

  const totalCustomers = customerOrders.size;
  let newCustomers = 0;
  let returningCustomers = 0;
  let totalFrequencyDays = 0;
  let customersWithMultipleOrders = 0;

  for (const [, custOrders] of customerOrders) {
    // Check if any order is marked as new customer
    const hasNewCustomerFlag = custOrders.some((o) => o.isNewCustomer);
    if (hasNewCustomerFlag) {
      newCustomers++;
    } else {
      returningCustomers++;
    }

    // Calculate frequency for customers with multiple orders
    if (custOrders.length > 1) {
      const sortedOrders = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
      const firstOrder = sortedOrders[0].orderDate;
      const lastOrder = sortedOrders[sortedOrders.length - 1].orderDate;
      const daysBetween = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24);
      const avgDays = daysBetween / (sortedOrders.length - 1);
      totalFrequencyDays += avgDays;
      customersWithMultipleOrders++;
    }
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
  const avgFrequencyDays = customersWithMultipleOrders > 0 ? totalFrequencyDays / customersWithMultipleOrders : 0;
  const avgSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Retention rate: customers who made more than 1 order / total customers
  const retentionRate = totalCustomers > 0 ? (customersWithMultipleOrders / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    retentionRate,
    avgFrequencyDays,
    avgSpendPerCustomer,
    avgTicket,
    totalOrders,
    totalRevenue,
    avgOrdersPerCustomer,
  };
}

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Fetches customer metrics with period comparison.
 */
export async function fetchCustomerMetrics(
  currentParams: FetchCustomerDataParams,
  previousParams: FetchCustomerDataParams
): Promise<CustomerMetricsWithChanges> {
  const [currentOrders, previousOrders] = await Promise.all([
    fetchCustomerOrders(currentParams),
    fetchCustomerOrders(previousParams),
  ]);

  const current = calculateMetrics(currentOrders);
  const previous = calculateMetrics(previousOrders);

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
 * Fetches customer metrics by channel.
 */
export async function fetchCustomerMetricsByChannel(
  params: FetchCustomerDataParams
): Promise<ChannelCustomerMetrics[]> {
  const orders = await fetchCustomerOrders(params);

  // Group by channel
  const channelOrders = new Map<ChannelId, CustomerOrder[]>();
  for (const order of orders) {
    const channelId = portalIdToChannelId(order.portalId);
    if (channelId) {
      if (!channelOrders.has(channelId)) {
        channelOrders.set(channelId, []);
      }
      channelOrders.get(channelId)!.push(order);
    }
  }

  const channelNames: Record<ChannelId, string> = {
    glovo: 'Glovo',
    ubereats: 'Uber Eats',
    justeat: 'Just Eat',
  };

  const results: ChannelCustomerMetrics[] = [];

  for (const channelId of ['glovo', 'ubereats', 'justeat'] as ChannelId[]) {
    const chOrders = channelOrders.get(channelId) || [];
    const metrics = calculateMetrics(chOrders);

    // Calculate returning customers (customers with >1 order in this channel)
    const customerOrderCounts = new Map<string, number>();
    for (const order of chOrders) {
      customerOrderCounts.set(order.customerId, (customerOrderCounts.get(order.customerId) || 0) + 1);
    }
    let returningCustomers = 0;
    for (const count of customerOrderCounts.values()) {
      if (count > 1) returningCustomers++;
    }
    const repetitionRate = metrics.totalCustomers > 0 ? (returningCustomers / metrics.totalCustomers) * 100 : 0;

    // Net revenue per customer
    const totalRefunds = chOrders.reduce((sum, o) => sum + o.refunds, 0);
    const netRevenuePerCustomer = metrics.totalCustomers > 0
      ? (metrics.totalRevenue - totalRefunds) / metrics.totalCustomers
      : 0;

    // Promo orders percentage
    const ordersWithPromo = chOrders.filter((o) => o.promotions > 0).length;
    const promoOrdersPercentage = chOrders.length > 0
      ? (ordersWithPromo / chOrders.length) * 100
      : 0;

    results.push({
      channelId,
      channelName: channelNames[channelId],
      totalCustomers: metrics.totalCustomers,
      newCustomers: metrics.newCustomers,
      newCustomersPercentage: metrics.totalCustomers > 0 ? (metrics.newCustomers / metrics.totalCustomers) * 100 : 0,
      avgTicket: metrics.avgTicket,
      avgOrdersPerCustomer: metrics.avgOrdersPerCustomer,
      returningCustomers,
      repetitionRate,
      netRevenuePerCustomer,
      promoOrdersPercentage,
    });
  }

  return results;
}

/**
 * Fetches cohort retention data.
 */
export async function fetchCustomerCohorts(
  params: FetchCustomerDataParams,
  granularity: 'week' | 'month' = 'month'
): Promise<CohortData[]> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return [];
  }

  // Group orders by customer
  const customerOrders = new Map<string, CustomerOrder[]>();
  for (const order of orders) {
    if (!customerOrders.has(order.customerId)) {
      customerOrders.set(order.customerId, []);
    }
    customerOrders.get(order.customerId)!.push(order);
  }

  // Determine first purchase cohort for each customer
  const customerCohorts = new Map<string, { cohortId: string; purchasePeriods: Set<string> }>();

  for (const [customerId, custOrders] of customerOrders) {
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
  // Use 8 periods for weekly granularity, 6 for monthly
  const maxPeriods = granularity === 'week' ? 8 : 6;

  for (const [cohortId, data] of cohortDataMap) {
    const retention: number[] = [];
    const retentionCounts: number[] = [];
    for (let i = 0; i <= maxPeriods; i++) {
      const count = data.periodCounts.get(i) || 0;
      retentionCounts.push(count);
      retention.push(data.size > 0 ? (count / data.size) * 100 : 0);
    }

    // Calculate cumulative retention: % of customers who have returned at least once up to this period
    const cumulativeRetention: number[] = [];
    const returnedCustomers = new Set<string>();

    for (let i = 0; i <= maxPeriods; i++) {
      if (i === 0) {
        // Period 0 is always 100% (first purchase)
        cumulativeRetention.push(100);
      } else {
        // Count unique customers who have purchased in any period from 1 to i
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

  // Sort by cohort ID
  cohorts.sort((a, b) => a.cohortId.localeCompare(b.cohortId));

  // Limit to last 8 cohorts
  return cohorts.slice(-8);
}

/**
 * Fetches customers at risk of churning.
 */
export async function fetchChurnRiskCustomers(
  params: FetchCustomerDataParams,
  limit = 20
): Promise<CustomerChurnRisk[]> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return [];
  }

  // Group by customer
  const customerOrders = new Map<string, CustomerOrder[]>();
  for (const order of orders) {
    if (!customerOrders.has(order.customerId)) {
      customerOrders.set(order.customerId, []);
    }
    customerOrders.get(order.customerId)!.push(order);
  }

  const today = new Date();
  const risks: CustomerChurnRisk[] = [];

  for (const [customerId, custOrders] of customerOrders) {
    // Only consider customers with at least 2 orders for churn analysis
    if (custOrders.length < 2) continue;

    const sortedOrders = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
    const lastOrder = sortedOrders[sortedOrders.length - 1];
    const totalSpend = custOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    // Calculate average days between orders
    const firstOrder = sortedOrders[0];
    const daysBetweenAll = (lastOrder.orderDate.getTime() - firstOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24);
    const avgFrequencyDays = daysBetweenAll / (sortedOrders.length - 1);

    // Calculate days since last order
    const daysSinceLastOrder = (today.getTime() - lastOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24);

    // Risk score: ratio of days since last order to average frequency
    const riskScore = avgFrequencyDays > 0 ? daysSinceLastOrder / avgFrequencyDays : 0;

    let riskLevel: 'high' | 'medium' | 'low';
    if (riskScore > 2) {
      riskLevel = 'high';
    } else if (riskScore > 1.5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

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

  // Sort by risk score (highest first) and limit
  return risks
    .filter((r) => r.riskLevel !== 'low') // Only show medium and high risk
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/**
 * Fetches multi-platform customer analysis with overlap breakdown.
 */
export async function fetchMultiPlatformAnalysis(
  params: FetchCustomerDataParams
): Promise<MultiPlatformAnalysis> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return {
      glovoOnly: 0,
      ubereatsOnly: 0,
      justeatOnly: 0,
      multiPlatform: 0,
      multiPlatformPercentage: 0,
      overlapBreakdown: [],
    };
  }

  // Track platforms per customer
  const customerPlatforms = new Map<string, Set<ChannelId>>();

  for (const order of orders) {
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

  // Track overlap combinations
  const overlapCounts = new Map<string, { channels: ChannelId[]; count: number }>();

  for (const platforms of customerPlatforms.values()) {
    if (platforms.size > 1) {
      multiPlatform++;

      // Track the specific combination
      const sorted = Array.from(platforms).sort() as ChannelId[];
      const key = sorted.join('+');
      if (!overlapCounts.has(key)) {
        overlapCounts.set(key, { channels: sorted, count: 0 });
      }
      overlapCounts.get(key)!.count++;
    } else {
      const platform = Array.from(platforms)[0];
      if (platform === 'glovo') glovoOnly++;
      else if (platform === 'ubereats') ubereatsOnly++;
      else if (platform === 'justeat') justeatOnly++;
    }
  }

  const totalCustomers = customerPlatforms.size;
  const multiPlatformPercentage = totalCustomers > 0 ? (multiPlatform / totalCustomers) * 100 : 0;

  // Convert overlap map to sorted array
  const overlapBreakdown = Array.from(overlapCounts.values()).sort((a, b) => b.count - a.count);

  return {
    glovoOnly,
    ubereatsOnly,
    justeatOnly,
    multiPlatform,
    multiPlatformPercentage,
    overlapBreakdown,
  };
}

/**
 * Fetches revenue concentration (Pareto) analysis.
 */
export async function fetchRevenueConcentration(
  params: FetchCustomerDataParams
): Promise<RevenueConcentration> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return { top10Pct: 0, top20Pct: 0, top50Pct: 0, giniCoefficient: 0 };
  }

  // Calculate total spend per customer
  const customerSpend = new Map<string, number>();
  for (const order of orders) {
    const current = customerSpend.get(order.customerId) || 0;
    customerSpend.set(order.customerId, current + order.totalPrice);
  }

  // Sort descending by spend
  const spends = Array.from(customerSpend.values()).sort((a, b) => b - a);
  const totalRevenue = spends.reduce((sum, s) => sum + s, 0);
  const n = spends.length;

  if (totalRevenue === 0) {
    return { top10Pct: 0, top20Pct: 0, top50Pct: 0, giniCoefficient: 0 };
  }

  // Calculate revenue from top X%
  const revenueFromTopN = (pct: number): number => {
    const count = Math.max(1, Math.ceil(n * pct));
    const topSum = spends.slice(0, count).reduce((sum, s) => sum + s, 0);
    return (topSum / totalRevenue) * 100;
  };

  // Gini coefficient calculation
  const sortedAsc = [...spends].sort((a, b) => a - b);
  const mean = totalRevenue / n;
  let sumAbsDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumAbsDiff += Math.abs(sortedAsc[i] - sortedAsc[j]);
    }
  }
  const giniCoefficient = n > 1 ? sumAbsDiff / (2 * n * n * mean) : 0;

  return {
    top10Pct: revenueFromTopN(0.1),
    top20Pct: revenueFromTopN(0.2),
    top50Pct: revenueFromTopN(0.5),
    giniCoefficient: Math.min(giniCoefficient, 1),
  };
}

/**
 * Fetches post-promo health segments.
 *
 * Classification logic:
 * 1. Dormidos: Had 45+ day gap between orders AND returning order had promo
 * 2. Sticky: First order had promo AND at least one later order without promo
 * 3. Promocioneros: First order had promo AND no later order without promo
 * 4. Organico: First order had no promo (all remaining)
 */
export async function fetchPostPromoHealth(
  params: FetchCustomerDataParams
): Promise<PostPromoHealth> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return { sticky: 0, promocioneros: 0, organico: 0, dormidos: 0, total: 0 };
  }

  // Group orders by customer
  const customerOrders = new Map<string, CustomerOrder[]>();
  for (const order of orders) {
    if (!customerOrders.has(order.customerId)) {
      customerOrders.set(order.customerId, []);
    }
    customerOrders.get(order.customerId)!.push(order);
  }

  let sticky = 0;
  let promocioneros = 0;
  let organico = 0;
  let dormidos = 0;

  const DORMANT_THRESHOLD_DAYS = 45;

  for (const [, custOrders] of customerOrders) {
    const sorted = custOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

    // Check for dormidos first: 45+ day gap with promo reactivation
    let isDormido = false;
    if (sorted.length >= 2) {
      for (let i = 1; i < sorted.length; i++) {
        const gapDays = (sorted[i].orderDate.getTime() - sorted[i - 1].orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (gapDays >= DORMANT_THRESHOLD_DAYS && sorted[i].promotions > 0) {
          isDormido = true;
          break;
        }
      }
    }

    if (isDormido) {
      dormidos++;
      continue;
    }

    const firstOrderHadPromo = sorted[0].promotions > 0;

    if (firstOrderHadPromo) {
      // Check if any subsequent order was without promo
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
    total: customerOrders.size,
  };
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
    console.error('[fetchWeeklyCustomerSegments] RPC error:', error);
    return [];
  }

  return (data ?? []) as CustomerSegmentRow[];
}
