-- ============================================
-- Migration: 20260221_ads_daily_timeseries_rpc.sql
-- Description: RPC to return daily timeseries of advertising metrics
--   from crp_portal__ft_advertising_hp, aggregated by day.
--   Used by the Marketing (Beta) page for the stacked area chart.
-- Date: 2026-02-21
-- ============================================

CREATE OR REPLACE FUNCTION get_ads_daily_timeseries(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  day date,
  impressions bigint,
  clicks bigint,
  orders bigint,
  ad_spent numeric,
  ad_revenue numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date AS day,
    COALESCE(SUM(a.val_impressions), 0)::bigint AS impressions,
    COALESCE(SUM(a.val_clicks), 0)::bigint AS clicks,
    COALESCE(SUM(a.val_orders), 0)::bigint AS orders,
    COALESCE(SUM(a.amt_ad_spent), 0) AS ad_spent,
    COALESCE(SUM(a.amt_revenue), 0) AS ad_revenue
  FROM crp_portal__ft_advertising_hp a
  WHERE
    a.pk_ts_hour >= p_start_date
    AND a.pk_ts_hour <= p_end_date
    AND (p_company_ids IS NULL OR a.pfk_id_company::text = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR a.pfk_id_store::text = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR a.pfk_id_store_address::text = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR a.pfk_id_portal = ANY(p_channel_portal_ids))
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_ads_daily_timeseries(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;

COMMENT ON FUNCTION get_ads_daily_timeseries IS 'Returns daily timeseries of advertising metrics (impressions, clicks, orders, spend, revenue) from crp_portal__ft_advertising_hp. Used by the Marketing dashboard chart.';
