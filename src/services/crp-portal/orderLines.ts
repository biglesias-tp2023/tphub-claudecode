/**
 * CRP Portal Order Lines Service
 *
 * Fetches order line items for a specific order, joining with dt_product for names.
 * Also provides customer profile data from ft_order_head.
 *
 * @module services/crp-portal/orderLines
 */

import { supabase } from '../supabase';
import { handleCrpError } from './errors';
import { PORTAL_IDS } from './types';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  promotion: string | null;
}

export interface CustomerOrderSummary {
  orderId: string;
  date: string;
  amount: number;
  refund: number | null;
  channel: ChannelId | null;
}

export interface CustomerProfile {
  customerId: string;
  isNew: boolean;
  totalOrders: number;
  totalSpent: number;
  avgTicket: number;
  totalRefunds: number;
  firstOrderDate: string;
  lastOrderDate: string;
  orders: CustomerOrderSummary[];
}

export interface OrderCustomerInfo {
  customerId: string | null;
  isNewCustomer: boolean;
}

// ============================================
// HELPERS
// ============================================

function portalToChannel(portalId: string): ChannelId | null {
  if (portalId === PORTAL_IDS.GLOVO) return 'glovo';
  if (portalId === PORTAL_IDS.UBEREATS) return 'ubereats';
  return null;
}

// ============================================
// DATA FUNCTIONS
// ============================================

/**
 * Fetch order line items for a specific order.
 * Uses two sequential queries: ft_order_line → dt_product for names.
 */
export async function fetchOrderLinesByOrderId(
  orderId: string,
  companyId: string
): Promise<OrderLineItem[]> {
  // 1. Fetch order lines (des_product does NOT exist in ft_order_line)
  //    ft_order_line can have multiple snapshots (different td_updated_at) for the same order.
  //    We keep only the most recent snapshot.
  const { data: lines, error: linesError } = await supabase
    .from('crp_portal__ft_order_line')
    .select('pk_id_product, val_quantity, amt_unit_price, des_promotion, td_updated_at')
    .eq('pk_id_order', orderId)
    .eq('pfk_id_company', String(companyId))
    .order('td_updated_at', { ascending: false });

  if (linesError) handleCrpError('fetchOrderLinesByOrderId', linesError);
  if (!lines || lines.length === 0) return [];

  // Deduplicate: keep only rows from the most recent snapshot (max td_updated_at)
  const latestTimestamp = lines[0].td_updated_at;
  const latestLines = lines.filter((l) => l.td_updated_at === latestTimestamp);

  // 2. Fetch product names from dt_product (PK: pfk_id_company + pk_id_product + pk_ts_month)
  const uniqueProductIds = [...new Set(latestLines.map((l) => l.pk_id_product).filter(Boolean))];
  const productNameMap = new Map<string, string>();

  if (uniqueProductIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from('crp_portal__dt_product')
      .select('pk_id_product, des_product')
      .eq('pfk_id_company', String(companyId))
      .in('pk_id_product', uniqueProductIds)
      .eq('flg_deleted', 0)
      .order('pk_ts_month', { ascending: false })
      .limit(uniqueProductIds.length * 3);

    if (productsError) handleCrpError('fetchOrderLinesByOrderId:products', productsError);

    if (products) {
      for (const p of products) {
        // Keep first match (most recent month due to ordering)
        if (!productNameMap.has(p.pk_id_product)) {
          productNameMap.set(p.pk_id_product, p.des_product);
        }
      }
    }
  }

  // 3. Merge into OrderLineItem[]
  const items: OrderLineItem[] = latestLines.map((line) => {
    const qty = Number(line.val_quantity) || 1;
    const unitPrice = Number(line.amt_unit_price) || 0;
    const name = productNameMap.get(line.pk_id_product) || 'Producto desconocido';

    return {
      productId: line.pk_id_product,
      productName: name,
      quantity: qty,
      unitPrice,
      totalPrice: qty * unitPrice,
      promotion: line.des_promotion || null,
    };
  });

  // Sort by totalPrice desc
  items.sort((a, b) => b.totalPrice - a.totalPrice);

  return items;
}

/**
 * Fetch customer info (customerId + isNew) from ft_order_head for a given order.
 * "isNew" is determined by counting total orders for this customer (1 = new, 2+ = recurring).
 */
export async function fetchOrderCustomerInfo(orderId: string): Promise<OrderCustomerInfo> {
  const { data, error } = await supabase
    .from('crp_portal__ft_order_head')
    .select('cod_id_customer')
    .eq('pk_uuid_order', orderId)
    .limit(1)
    .maybeSingle();

  if (error) handleCrpError('fetchOrderCustomerInfo', error);

  const customerId = data?.cod_id_customer ?? null;
  if (!customerId) {
    return { customerId: null, isNewCustomer: false };
  }

  // Count distinct orders for this customer to determine new vs recurring
  // (ft_order_head can have duplicate rows for the same pk_uuid_order)
  const { data: orderRows, error: countError } = await supabase
    .from('crp_portal__ft_order_head')
    .select('pk_uuid_order')
    .eq('cod_id_customer', customerId)
    .limit(10);

  if (countError) handleCrpError('fetchOrderCustomerInfo:count', countError);

  const uniqueOrders = new Set(orderRows?.map((r) => r.pk_uuid_order) ?? []);

  return {
    customerId,
    isNewCustomer: uniqueOrders.size <= 1,
  };
}

/**
 * Fetch full customer profile: order history, metrics, etc.
 */
export async function fetchCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('crp_portal__ft_order_head')
    .select('pk_uuid_order, td_creation_time, amt_total_price, amt_refunds, pfk_id_portal')
    .eq('cod_id_customer', customerId)
    .order('td_creation_time', { ascending: false })
    .limit(200);

  if (error) handleCrpError('fetchCustomerProfile', error);
  if (!data || data.length === 0) {
    return {
      customerId,
      isNew: false,
      totalOrders: 0,
      totalSpent: 0,
      avgTicket: 0,
      totalRefunds: 0,
      firstOrderDate: '',
      lastOrderDate: '',
      orders: [],
    };
  }

  let totalSpent = 0;
  let totalRefunds = 0;

  // Deduplicate by pk_uuid_order (ft_order_head can have duplicate rows)
  const seenOrderIds = new Set<string>();
  const orders: CustomerOrderSummary[] = [];

  for (const row of data) {
    if (seenOrderIds.has(row.pk_uuid_order)) continue;
    seenOrderIds.add(row.pk_uuid_order);

    const amount = Number(row.amt_total_price) || 0;
    const refund = row.amt_refunds != null && Number(row.amt_refunds) > 0 ? Number(row.amt_refunds) : null;
    totalSpent += amount;
    if (refund) totalRefunds += refund;

    const date = row.td_creation_time
      ? new Date(row.td_creation_time).toISOString().slice(0, 10)
      : '';

    orders.push({
      orderId: row.pk_uuid_order,
      date,
      amount,
      refund,
      channel: portalToChannel(row.pfk_id_portal),
    });
  }

  const isNew = orders.length <= 1;
  const totalOrders = orders.length;
  const lastOrderDate = orders[0]?.date ?? '';
  const firstOrderDate = orders[orders.length - 1]?.date ?? '';

  return {
    customerId,
    isNew,
    totalOrders,
    totalSpent,
    avgTicket: totalOrders > 0 ? totalSpent / totalOrders : 0,
    totalRefunds,
    firstOrderDate,
    lastOrderDate,
    orders,
  };
}
