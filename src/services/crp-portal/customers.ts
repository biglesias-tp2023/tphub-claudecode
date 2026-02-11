/**
 * CRP Portal Customers Service
 *
 * Provides customer analytics data from the crp_portal__ft_order_head table.
 * Calculates metrics like retention, CLV, churn risk, cohorts, and multi-platform analysis.
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
 *     ↓
 * fetchCustomerOrders() → Raw customer order data
 *     ↓
 * Various aggregation functions → Metrics, Cohorts, Risk Scores
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
  /** Retention rate percentage */
  retentionRate: number;
  /** Average days between orders */
  avgFrequencyDays: number;
  /** Estimated Customer Lifetime Value */
  estimatedCLV: number;
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
  avgFrequencyDaysChange: number;
  estimatedCLVChange: number;
  avgTicketChange: number;
}

/** Channel-specific customer metrics */
export interface ChannelCustomerMetrics {
  channelId: ChannelId;
  channelName: string;
  totalCustomers: number;
  newCustomers: number;
  newCustomersPercentage: number;
  avgCLV: number;
  avgTicket: number;
  avgOrdersPerCustomer: number;
  /** Customers with more than 1 order */
  returningCustomers: number;
  /** Percentage of customers with more than 1 order */
  repetitionRate: number;
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

/** Spend segment */
export interface SpendSegment {
  segment: 'vip' | 'high' | 'medium' | 'low' | 'single_order';
  label: string;
  count: number;
  percentage: number;
  avgSpend: number;
  totalRevenue: number;
  /** Customers with more than 1 order in this segment */
  repeatCustomers: number;
  /** Percentage of customers with more than 1 order */
  repetitionRate: number;
  /** Average orders per customer in this segment */
  avgOrdersPerCustomer: number;
  /** Average days between orders (null for single_order segment) */
  avgFrequencyDays: number | null;
}

/** Spend distribution with histogram data */
export interface SpendDistribution {
  /** Histogram buckets */
  buckets: {
    min: number;
    max: number;
    count: number;
  }[];
  /** Segment breakdown */
  segments: SpendSegment[];
  /** Statistics */
  stats: {
    min: number;
    max: number;
    median: number;
    avg: number;
    p75: number;
    p90: number;
  };
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
  /** Platform transitions (customer moved from one to another) */
  transitions: {
    from: ChannelId;
    to: ChannelId;
    count: number;
  }[];
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
      estimatedCLV: 0,
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

  // Retention rate: customers who made more than 1 order / total customers
  const retentionRate = totalCustomers > 0 ? (customersWithMultipleOrders / totalCustomers) * 100 : 0;

  // CLV estimation: avgTicket * avgOrdersPerCustomer * 12 (annualized)
  const estimatedCLV = avgTicket * avgOrdersPerCustomer * 12;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    retentionRate,
    avgFrequencyDays,
    estimatedCLV,
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
    avgFrequencyDaysChange: calcChange(current.avgFrequencyDays, previous.avgFrequencyDays),
    estimatedCLVChange: calcChange(current.estimatedCLV, previous.estimatedCLV),
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

    results.push({
      channelId,
      channelName: channelNames[channelId],
      totalCustomers: metrics.totalCustomers,
      newCustomers: metrics.newCustomers,
      newCustomersPercentage: metrics.totalCustomers > 0 ? (metrics.newCustomers / metrics.totalCustomers) * 100 : 0,
      avgCLV: metrics.estimatedCLV,
      avgTicket: metrics.avgTicket,
      avgOrdersPerCustomer: metrics.avgOrdersPerCustomer,
      returningCustomers,
      repetitionRate,
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
  const maxPeriods = 6; // Show up to 6 periods of retention

  for (const [cohortId, data] of cohortDataMap) {
    const retention: number[] = [];
    for (let i = 0; i <= maxPeriods; i++) {
      const count = data.periodCounts.get(i) || 0;
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
 * Fetches customer spend distribution.
 */
export async function fetchSpendDistribution(
  params: FetchCustomerDataParams
): Promise<SpendDistribution> {
  const orders = await fetchCustomerOrders(params);

  if (orders.length === 0) {
    return {
      buckets: [],
      segments: [],
      stats: { min: 0, max: 0, median: 0, avg: 0, p75: 0, p90: 0 },
    };
  }

  // Calculate total spend per customer
  const customerSpend = new Map<string, number>();
  for (const order of orders) {
    const current = customerSpend.get(order.customerId) || 0;
    customerSpend.set(order.customerId, current + order.totalPrice);
  }

  const spends = Array.from(customerSpend.values()).sort((a, b) => a - b);
  const totalCustomers = spends.length;

  // Calculate statistics
  const min = spends[0];
  const max = spends[spends.length - 1];
  const sum = spends.reduce((a, b) => a + b, 0);
  const avg = sum / totalCustomers;
  const median = spends[Math.floor(totalCustomers / 2)];
  const p75 = spends[Math.floor(totalCustomers * 0.75)];
  const p90 = spends[Math.floor(totalCustomers * 0.9)];

  // Calculate percentile thresholds for segments
  const p30 = spends[Math.floor(totalCustomers * 0.3)];
  const p70 = spends[Math.floor(totalCustomers * 0.7)];

  // Count orders per customer for single-order detection
  const customerOrderCounts = new Map<string, number>();
  for (const order of orders) {
    const current = customerOrderCounts.get(order.customerId) || 0;
    customerOrderCounts.set(order.customerId, current + 1);
  }

  // Build segments with extended metrics
  type SegmentKey = 'vip' | 'high' | 'medium' | 'low' | 'single_order';
  const segmentCounts: Record<SegmentKey, number> = { vip: 0, high: 0, medium: 0, low: 0, single_order: 0 };
  const segmentSpends: Record<SegmentKey, number> = { vip: 0, high: 0, medium: 0, low: 0, single_order: 0 };
  const segmentTotalOrders: Record<SegmentKey, number> = { vip: 0, high: 0, medium: 0, low: 0, single_order: 0 };
  const segmentRepeatCustomers: Record<SegmentKey, number> = { vip: 0, high: 0, medium: 0, low: 0, single_order: 0 };

  // Track customer order dates for frequency calculation
  const customerOrderDates = new Map<string, Date[]>();
  for (const order of orders) {
    if (!customerOrderDates.has(order.customerId)) {
      customerOrderDates.set(order.customerId, []);
    }
    customerOrderDates.get(order.customerId)!.push(order.orderDate);
  }

  // Calculate frequency per segment
  const segmentFrequencyDays: Record<SegmentKey, number[]> = { vip: [], high: [], medium: [], low: [], single_order: [] };

  for (const [customerId, spend] of customerSpend) {
    const orderCount = customerOrderCounts.get(customerId) || 0;
    let segment: SegmentKey;

    if (orderCount === 1) {
      segment = 'single_order';
    } else if (spend >= p90) {
      segment = 'vip';
    } else if (spend >= p70) {
      segment = 'high';
    } else if (spend >= p30) {
      segment = 'medium';
    } else {
      segment = 'low';
    }

    segmentCounts[segment]++;
    segmentSpends[segment] += spend;
    segmentTotalOrders[segment] += orderCount;

    if (orderCount > 1) {
      segmentRepeatCustomers[segment]++;

      // Calculate average frequency for this customer
      const dates = customerOrderDates.get(customerId) || [];
      if (dates.length > 1) {
        const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        const avgDays = daysBetween / (sortedDates.length - 1);
        segmentFrequencyDays[segment].push(avgDays);
      }
    }
  }

  const buildSegment = (key: SegmentKey, label: string): SpendSegment => {
    const count = segmentCounts[key];
    const freqs = segmentFrequencyDays[key];
    const avgFreq = freqs.length > 0 ? freqs.reduce((a, b) => a + b, 0) / freqs.length : null;

    return {
      segment: key,
      label,
      count,
      percentage: (count / totalCustomers) * 100,
      avgSpend: count > 0 ? segmentSpends[key] / count : 0,
      totalRevenue: segmentSpends[key],
      repeatCustomers: segmentRepeatCustomers[key],
      repetitionRate: count > 0 ? (segmentRepeatCustomers[key] / count) * 100 : 0,
      avgOrdersPerCustomer: count > 0 ? segmentTotalOrders[key] / count : 0,
      avgFrequencyDays: avgFreq !== null ? Math.round(avgFreq) : null,
    };
  };

  const segments: SpendSegment[] = [
    buildSegment('vip', 'VIP (Top 10%)'),
    buildSegment('high', 'Alto (70-90%)'),
    buildSegment('medium', 'Medio (30-70%)'),
    buildSegment('low', 'Bajo (10-30%)'),
    buildSegment('single_order', 'Único pedido'),
  ];

  // Build histogram buckets
  const bucketCount = 10;
  const bucketSize = (max - min) / bucketCount || 1;
  const buckets: SpendDistribution['buckets'] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketMin = min + i * bucketSize;
    const bucketMax = min + (i + 1) * bucketSize;
    const count = spends.filter((s) => s >= bucketMin && (i === bucketCount - 1 ? s <= bucketMax : s < bucketMax)).length;
    buckets.push({ min: bucketMin, max: bucketMax, count });
  }

  return {
    buckets,
    segments,
    stats: { min, max, median, avg, p75, p90 },
  };
}

/**
 * Fetches multi-platform customer analysis.
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
      transitions: [],
    };
  }

  // Track platforms per customer
  const customerPlatforms = new Map<string, Set<ChannelId>>();
  const customerOrdersByPlatform = new Map<string, Map<ChannelId, CustomerOrder[]>>();

  for (const order of orders) {
    const channelId = portalIdToChannelId(order.portalId);
    if (!channelId) continue;

    if (!customerPlatforms.has(order.customerId)) {
      customerPlatforms.set(order.customerId, new Set());
    }
    customerPlatforms.get(order.customerId)!.add(channelId);

    // Track orders by platform for transitions
    if (!customerOrdersByPlatform.has(order.customerId)) {
      customerOrdersByPlatform.set(order.customerId, new Map());
    }
    const platformOrders = customerOrdersByPlatform.get(order.customerId)!;
    if (!platformOrders.has(channelId)) {
      platformOrders.set(channelId, []);
    }
    platformOrders.get(channelId)!.push(order);
  }

  let glovoOnly = 0;
  let ubereatsOnly = 0;
  let justeatOnly = 0;
  let multiPlatform = 0;

  for (const platforms of customerPlatforms.values()) {
    if (platforms.size > 1) {
      multiPlatform++;
    } else {
      const platform = Array.from(platforms)[0];
      if (platform === 'glovo') glovoOnly++;
      else if (platform === 'ubereats') ubereatsOnly++;
      else if (platform === 'justeat') justeatOnly++;
    }
  }

  const totalCustomers = customerPlatforms.size;
  const multiPlatformPercentage = totalCustomers > 0 ? (multiPlatform / totalCustomers) * 100 : 0;

  // Calculate transitions (customers who switched primary platform)
  const transitionCounts = new Map<string, number>();

  for (const platformOrders of customerOrdersByPlatform.values()) {
    if (platformOrders.size <= 1) continue;

    // Get all orders sorted by date
    const allOrders: { channelId: ChannelId; date: Date }[] = [];
    for (const [channelId, orders] of platformOrders) {
      for (const order of orders) {
        allOrders.push({ channelId, date: order.orderDate });
      }
    }
    allOrders.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Find transitions
    for (let i = 1; i < allOrders.length; i++) {
      if (allOrders[i].channelId !== allOrders[i - 1].channelId) {
        const key = `${allOrders[i - 1].channelId}:${allOrders[i].channelId}`;
        transitionCounts.set(key, (transitionCounts.get(key) || 0) + 1);
      }
    }
  }

  const transitions: MultiPlatformAnalysis['transitions'] = [];
  for (const [key, count] of transitionCounts) {
    const [from, to] = key.split(':') as [ChannelId, ChannelId];
    transitions.push({ from, to, count });
  }

  // Sort by count descending
  transitions.sort((a, b) => b.count - a.count);

  return {
    glovoOnly,
    ubereatsOnly,
    justeatOnly,
    multiPlatform,
    multiPlatformPercentage,
    transitions: transitions.slice(0, 10), // Top 10 transitions
  };
}
