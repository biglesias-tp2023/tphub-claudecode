-- ============================================
-- Migration: 20260221_monthly_revenue_by_channel_rpc.sql
-- Description: Lightweight RPC that returns revenue, promos, and ads
--   grouped by MONTH + CHANNEL in a single call.
--   Replaces 6× get_orders_aggregation calls that timeout with many companies.
--
-- Key optimizations:
--   1. ONE call instead of 6 (one per month)
--   2. NO COUNT(DISTINCT) (the most expensive operation)
--   3. Groups by month + channel → returns ~12 rows total
--   4. Includes ads from ft_advertising_hp via FULL OUTER JOIN
-- Date: 2026-02-21
-- ============================================

DROP FUNCTION IF EXISTS get_monthly_revenue_by_channel(text[], text[], text[], timestamp, timestamp);

CREATE OR REPLACE FUNCTION get_monthly_revenue_by_channel(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  month_key text,
  channel text,
  total_revenue numeric,
  total_discounts numeric,
  total_ad_spent numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH order_monthly AS (
    SELECT
      to_char(o.td_creation_time, 'YYYY-MM') AS month_key,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS channel,
      COALESCE(SUM(o.amt_total_price), 0) AS total_revenue,
      COALESCE(SUM(o.amt_promotions), 0) AS total_discounts
    FROM crp_portal__ft_order_head o
    WHERE
      o.td_creation_time >= p_start_date
      AND o.td_creation_time <= p_end_date
      AND (p_company_ids IS NULL OR o.pfk_id_company::text = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR o.pfk_id_store::text = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR o.pfk_id_store_address::text = ANY(p_address_ids))
    GROUP BY 1, 2
  ),
  ads_monthly AS (
    SELECT
      to_char(a.pk_ts_hour, 'YYYY-MM') AS month_key,
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS channel,
      COALESCE(SUM(a.amt_ad_spent), 0) AS total_ad_spent
    FROM crp_portal__ft_advertising_hp a
    WHERE
      a.pk_ts_hour >= p_start_date
      AND a.pk_ts_hour <= p_end_date
      AND (p_company_ids IS NULL OR a.pfk_id_company::text = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR a.pfk_id_store::text = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR a.pfk_id_store_address::text = ANY(p_address_ids))
    GROUP BY 1, 2
  )
  SELECT
    COALESCE(o.month_key, a.month_key) AS month_key,
    COALESCE(o.channel, a.channel) AS channel,
    COALESCE(o.total_revenue, 0) AS total_revenue,
    COALESCE(o.total_discounts, 0) AS total_discounts,
    COALESCE(a.total_ad_spent, 0) AS total_ad_spent
  FROM order_monthly o
  FULL OUTER JOIN ads_monthly a
    ON o.month_key = a.month_key AND o.channel = a.channel
  ORDER BY month_key, channel;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_revenue_by_channel(text[], text[], text[], timestamp, timestamp) TO authenticated;

COMMENT ON FUNCTION get_monthly_revenue_by_channel IS 'Returns revenue, discounts, and ad spend grouped by month and channel. Lightweight alternative to calling get_orders_aggregation 6 times. No COUNT(DISTINCT), single call.';
