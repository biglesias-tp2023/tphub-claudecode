/**
 * Hooks for order line items and customer profile.
 *
 * @module features/reputation/hooks/useOrderLines
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchOrderLinesByOrderId,
  fetchOrderCustomerInfo,
  fetchCustomerProfile,
} from '@/services/crp-portal/orderLines';
import { QUERY_STALE_SHORT, QUERY_GC_SHORT } from '@/constants/queryConfig';

/**
 * Fetch order line items for a given order.
 * Only enabled when orderId and companyId are provided.
 */
export function useOrderLines(orderId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: ['order-lines', orderId],
    queryFn: () => fetchOrderLinesByOrderId(orderId!, companyId!),
    enabled: !!orderId && !!companyId,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Fetch customer info (customerId + isNew) for a given order.
 * Only enabled when orderId is provided.
 */
export function useOrderCustomerInfo(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-customer-info', orderId],
    queryFn: () => fetchOrderCustomerInfo(orderId!),
    enabled: !!orderId,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}

/**
 * Fetch full customer profile (order history, metrics).
 * Only enabled when customerId is provided and non-empty.
 */
export function useCustomerProfile(customerId: string | null | undefined) {
  return useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: () => fetchCustomerProfile(customerId!),
    enabled: !!customerId,
    staleTime: QUERY_STALE_SHORT,
    gcTime: QUERY_GC_SHORT,
  });
}
