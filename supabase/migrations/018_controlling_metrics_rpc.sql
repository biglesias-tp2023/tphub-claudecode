-- ============================================
-- Migration: 018_controlling_metrics_rpc.sql
-- Description: RPC function for Controlling dashboard metrics
-- Date: 2026-02-11
-- ============================================

-- Drop function if exists (for re-running)
DROP FUNCTION IF EXISTS get_controlling_metrics(text[], timestamp, timestamp);

/**
 * RPC Function: get_controlling_metrics
 *
 * Returns pre-aggregated metrics for the Controlling dashboard.
 * Aggregates at the most granular level: Company → Store → Address → Portal
 *
 * Parameters:
 *   p_company_ids: Array of company IDs to filter (as text)
 *   p_start_date: Start timestamp for the period
 *   p_end_date: End timestamp for the period
 *
 * Returns:
 *   pfk_id_company: Company ID
 *   pfk_id_store: Store/Brand ID
 *   pfk_id_store_address: Address ID
 *   pfk_id_portal: Portal ID (delivery platform)
 *   ventas: Total sales (amt_total_price)
 *   pedidos: Number of orders
 *   nuevos: Number of new customers
 *   descuentos: Total discounts (amt_promotions)
 *   reembolsos: Total refunds (amt_refunds)
 */
CREATE OR REPLACE FUNCTION get_controlling_metrics(
  p_company_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  pfk_id_company text,
  pfk_id_store text,
  pfk_id_store_address text,
  pfk_id_portal text,
  ventas numeric,
  pedidos bigint,
  nuevos bigint,
  descuentos numeric,
  reembolsos numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    o.pfk_id_company::text AS pfk_id_company,
    o.pfk_id_store::text AS pfk_id_store,
    o.pfk_id_store_address::text AS pfk_id_store_address,
    o.pfk_id_portal::text AS pfk_id_portal,
    COALESCE(SUM(o.amt_total_price), 0) AS ventas,
    COUNT(*)::bigint AS pedidos,
    COUNT(*) FILTER (WHERE o.flg_customer_new = true)::bigint AS nuevos,
    COALESCE(SUM(o.amt_promotions), 0) AS descuentos,
    COALESCE(SUM(o.amt_refunds), 0) AS reembolsos
  FROM crp_portal__ft_order_head o
  WHERE
    o.pfk_id_company::text = ANY(p_company_ids)
    AND o.td_creation_time >= p_start_date
    AND o.td_creation_time <= p_end_date
    AND o.pfk_id_store_address IS NOT NULL
  GROUP BY
    o.pfk_id_company,
    o.pfk_id_store,
    o.pfk_id_store_address,
    o.pfk_id_portal
  ORDER BY
    o.pfk_id_company,
    o.pfk_id_store,
    o.pfk_id_store_address,
    o.pfk_id_portal;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_controlling_metrics(text[], timestamp, timestamp) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_controlling_metrics IS 'Returns pre-aggregated metrics for the Controlling dashboard, grouped by company, store, address, and portal.';
