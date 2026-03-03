-- ============================================
-- Migration: 20260303_finance_pnl_rpc.sql
-- Description: RPC for P&L dashboard — aggregates orders by
--              configurable period (week/month/quarter) with
--              portal-level breakdown.
--
-- Follows the same proven query pattern as get_monthly_revenue_by_channel:
--   1. Date filters are REQUIRED and come FIRST (enables index use)
--   2. CASE for channel mapping (avoids param-based date_trunc)
--   3. LANGUAGE sql + STABLE for auto type coercion
-- Date: 2026-03-03
-- ============================================

-- Drop all previous versions
DROP FUNCTION IF EXISTS get_pnl_periods(TEXT[], TEXT[], TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS get_pnl_periods(TEXT[], TEXT[], TEXT[], TIMESTAMP, TIMESTAMP, TEXT);

CREATE OR REPLACE FUNCTION get_pnl_periods(
  p_company_ids   TEXT[],
  p_brand_ids     TEXT[],
  p_address_ids   TEXT[],
  p_start_date    TIMESTAMP,
  p_end_date      TIMESTAMP,
  p_granularity   TEXT DEFAULT 'month'  -- 'week' | 'month' | 'quarter'
)
RETURNS TABLE (
  period_start  TEXT,
  portal_id     TEXT,
  revenue       NUMERIC,
  promos        NUMERIC,
  refunds       NUMERIC,
  order_count   BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE p_granularity
      WHEN 'week'    THEN to_char(date_trunc('week',    o.td_creation_time), 'YYYY-MM-DD')
      WHEN 'quarter' THEN to_char(date_trunc('quarter', o.td_creation_time), 'YYYY-MM-DD')
      ELSE                to_char(date_trunc('month',   o.td_creation_time), 'YYYY-MM-DD')
    END                                    AS period_start,
    CASE
      WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END                                    AS portal_id,
    COALESCE(SUM(o.amt_total_price), 0)    AS revenue,
    COALESCE(SUM(o.amt_promotions), 0)     AS promos,
    COALESCE(SUM(o.amt_refunds), 0)        AS refunds,
    COUNT(o.pk_uuid_order)                 AS order_count
  FROM crp_portal__ft_order_head o
  WHERE
        o.td_creation_time >= p_start_date
    AND o.td_creation_time <= p_end_date
    AND (p_company_ids  IS NULL OR o.pfk_id_company::TEXT        = ANY(p_company_ids))
    AND (p_brand_ids    IS NULL OR o.pfk_id_store::TEXT          = ANY(p_brand_ids))
    AND (p_address_ids  IS NULL OR o.pfk_id_store_address::TEXT  = ANY(p_address_ids))
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION get_pnl_periods(TEXT[], TEXT[], TEXT[], TIMESTAMP, TIMESTAMP, TEXT) TO authenticated;

COMMENT ON FUNCTION get_pnl_periods IS 'Aggregates order data by configurable period (week/month/quarter) with portal breakdown for the P&L Finance dashboard.';

NOTIFY pgrst, 'reload schema';
