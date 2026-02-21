-- ============================================
-- Migration: 20260218_orders_aggregation_rpc.sql
-- Description: RPC function for orders aggregation by channel
-- Date: 2026-02-18
--
-- Replaces the JS-side aggregation in fetchCrpOrdersAggregated()
-- which downloaded all raw orders (50k+ rows) and aggregated in the browser.
-- Now the DB returns ~3 rows (one per channel) with pre-calculated totals.
-- ============================================

-- Drop function if exists (for re-running)
DROP FUNCTION IF EXISTS get_orders_aggregation;

/**
 * RPC Function: get_orders_aggregation
 *
 * Returns pre-aggregated order metrics grouped by delivery channel.
 * Maps portal IDs to channel names:
 *   - E22BC362, E22BC362-2 → 'glovo'
 *   - 3CCD6861 → 'ubereats'
 *   - everything else → 'other'
 *
 * Parameters:
 *   p_company_ids: Array of company IDs (NULL = no filter)
 *   p_brand_ids: Array of brand/store IDs (NULL = no filter)
 *   p_address_ids: Array of address IDs (NULL = no filter)
 *   p_channel_portal_ids: Array of portal IDs to filter (NULL = all channels)
 *   p_start_date: Start timestamp
 *   p_end_date: End timestamp
 *
 * Returns one row per channel with:
 *   channel: 'glovo' | 'ubereats' | 'other'
 *   total_revenue: SUM(amt_total_price)
 *   total_orders: COUNT(*)
 *   total_discounts: SUM(amt_promotions)
 *   total_refunds: SUM(amt_refunds)
 *   unique_customers: COUNT(DISTINCT cod_id_customer)
 */
CREATE OR REPLACE FUNCTION get_orders_aggregation(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  channel text,
  total_revenue numeric,
  total_orders bigint,
  total_discounts numeric,
  total_refunds numeric,
  unique_customers bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END AS channel,
    COALESCE(SUM(o.amt_total_price), 0) AS total_revenue,
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(o.amt_promotions), 0) AS total_discounts,
    COALESCE(SUM(o.amt_refunds), 0) AS total_refunds,
    COUNT(DISTINCT o.cod_id_customer)::bigint AS unique_customers
  FROM crp_portal__ft_order_head o
  WHERE
    o.td_creation_time >= p_start_date
    AND o.td_creation_time <= p_end_date
    AND (p_company_ids IS NULL OR o.pfk_id_company::text = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR o.pfk_id_store::text = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR o.pfk_id_store_address::text = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR o.pfk_id_portal = ANY(p_channel_portal_ids))
  GROUP BY
    CASE
      WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_orders_aggregation(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_orders_aggregation IS 'Returns pre-aggregated order metrics grouped by delivery channel (glovo/ubereats/other). Replaces client-side aggregation of raw orders.';
