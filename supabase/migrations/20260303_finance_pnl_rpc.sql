-- ============================================
-- Migration: 20260303_finance_pnl_rpc.sql
-- Description: RPC for P&L dashboard — aggregates orders by
--              configurable period (week/month/quarter) with
--              portal-level breakdown.
-- Date: 2026-03-03
-- ============================================

CREATE OR REPLACE FUNCTION get_pnl_periods(
  p_company_ids   TEXT[]        DEFAULT NULL,
  p_brand_ids     TEXT[]        DEFAULT NULL,
  p_address_ids   TEXT[]        DEFAULT NULL,
  p_start_date    TIMESTAMPTZ   DEFAULT NULL,
  p_end_date      TIMESTAMPTZ   DEFAULT NULL,
  p_granularity   TEXT          DEFAULT 'month'  -- 'week' | 'month' | 'quarter'
)
RETURNS TABLE (
  period_start  DATE,
  portal_id     TEXT,
  revenue       NUMERIC,
  promos        NUMERIC,
  refunds       NUMERIC,
  order_count   BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (date_trunc(p_granularity, o.td_creation_time AT TIME ZONE 'Europe/Madrid'))::DATE AS period_start,
    o.pfk_id_portal::TEXT                                                              AS portal_id,
    COALESCE(SUM(o.amt_total_price), 0)                                                AS revenue,
    COALESCE(SUM(o.amt_promotions), 0)                                                 AS promos,
    COALESCE(SUM(o.amt_refunds), 0)                                                    AS refunds,
    COUNT(o.pk_uuid_order)                                                             AS order_count
  FROM crp_portal__ft_order_head o
  WHERE
        (p_company_ids  IS NULL OR o.pfk_id_company::TEXT        = ANY(p_company_ids))
    AND (p_brand_ids    IS NULL OR o.pfk_id_store::TEXT          = ANY(p_brand_ids))
    AND (p_address_ids  IS NULL OR o.pfk_id_store_address::TEXT  = ANY(p_address_ids))
    AND (p_start_date   IS NULL OR o.td_creation_time           >= p_start_date)
    AND (p_end_date     IS NULL OR o.td_creation_time           <= p_end_date)
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pnl_periods(TEXT[], TEXT[], TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

COMMENT ON FUNCTION get_pnl_periods IS 'Aggregates order data by configurable period (week/month/quarter) with portal breakdown for the P&L Finance dashboard.';
