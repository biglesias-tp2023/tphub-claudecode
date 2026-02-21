/**
 * useObjectiveKpiValue Hook
 *
 * Fetches real-time KPI value for strategic objectives.
 * Uses data from the previous complete month for accurate comparison.
 *
 * Example: If today is Feb 2nd, uses January data.
 *          If today is Jan 29th, uses December data.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchCrpOrdersAggregated } from '@/services/crp-portal';
import type { OrdersAggregation } from '@/services/crp-portal';

// ============================================
// TYPES
// ============================================

export interface UseObjectiveKpiValueParams {
  /** KPI type identifier */
  kpiType: string | null;
  /** Company ID for filtering */
  companyId: string | null;
  /** Brand ID for filtering (optional) */
  brandId?: string | null;
  /** Address ID for filtering (optional) */
  addressId?: string | null;
}

export interface KpiValueResult {
  /** Current value from previous complete month */
  value: number | null;
  /** Month label (e.g., "Enero 2026") */
  monthLabel: string;
  /** Is loading */
  isLoading: boolean;
}

// ============================================
// HELPERS
// ============================================

/**
 * Get the previous complete month's date range.
 * Feb 2nd → Jan 1 - Jan 31
 * Jan 29th → Dec 1 - Dec 31
 */
function getPreviousCompleteMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Previous month
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear = year - 1;
  }

  // First day of previous month
  const startDate = new Date(prevYear, prevMonth, 1);
  // Last day of previous month
  const endDate = new Date(prevYear, prevMonth + 1, 0);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
    label: `${months[prevMonth]} ${prevYear}`,
  };
}

/**
 * Extract KPI value from aggregation based on kpiType.
 */
function extractKpiValue(aggregation: OrdersAggregation, kpiType: string): number | null {
  switch (kpiType) {
    case 'revenue':
      return aggregation.totalRevenue;
    case 'orders':
      return aggregation.totalOrders;
    case 'avg_ticket':
      return aggregation.avgTicket;
    case 'net_revenue':
      return aggregation.netRevenue;
    case 'new_customers':
      // Not directly available - would need customer analysis
      return null;
    case 'new_customers_pct':
      // Not directly available
      return null;
    case 'unique_customers':
      return aggregation.uniqueCustomers;
    case 'orders_per_customer':
      return aggregation.ordersPerCustomer;
    case 'refund_rate':
      return aggregation.refundRate;
    case 'promo_rate':
      return aggregation.promotionRate;
    case 'rating':
      // Not available from orders data
      return null;
    case 'reviews_count':
      // Not available from orders data
      return null;
    default:
      return null;
  }
}

// ============================================
// HOOK
// ============================================

export function useObjectiveKpiValue({
  kpiType,
  companyId,
  brandId,
  addressId,
}: UseObjectiveKpiValueParams): KpiValueResult {
  const { start, end, label } = getPreviousCompleteMonthRange();

  const { data, isLoading } = useQuery({
    queryKey: [
      'objective-kpi',
      kpiType,
      companyId,
      brandId,
      addressId,
      start,
      end,
    ],
    queryFn: async () => {
      if (!companyId) return null;

      const aggregation = await fetchCrpOrdersAggregated({
        companyIds: [companyId],
        brandIds: brandId ? [brandId] : undefined,
        addressIds: addressId ? [addressId] : undefined,
        startDate: start,
        endDate: end,
      });

      return aggregation;
    },
    enabled: !!kpiType && !!companyId,
    retry: 1, // Fail fast — don't hang for 15s on broken queries
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const value = data && kpiType ? extractKpiValue(data, kpiType) : null;

  return {
    value,
    monthLabel: label,
    isLoading,
  };
}
