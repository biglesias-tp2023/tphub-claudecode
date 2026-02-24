-- ============================================
-- RPC: get_ads_weekly_heatmap
-- ============================================
-- Aggregates advertising data by (day_of_week, hour_of_day)
-- from crp_portal__ft_advertising_hp.
-- Used by the "Inversión en ADS por horas" heatmap
-- in the Controlling detail panel.
--
-- day_of_week uses ISODOW: 1=Monday, 7=Sunday
-- hour_of_day: 0-23 (Europe/Madrid timezone)
-- ============================================

CREATE OR REPLACE FUNCTION get_ads_weekly_heatmap(
  p_company_ids TEXT[] DEFAULT NULL,
  p_brand_ids TEXT[] DEFAULT NULL,
  p_address_ids TEXT[] DEFAULT NULL,
  p_channel_portal_ids TEXT[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  day_of_week INT,
  hour_of_day INT,
  ad_spent NUMERIC,
  impressions BIGINT,
  clicks BIGINT,
  orders BIGINT,
  ad_revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(ISODOW FROM a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::INT AS day_of_week,
    EXTRACT(HOUR FROM a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::INT AS hour_of_day,
    COALESCE(SUM(a.amt_ad_spent), 0)::NUMERIC AS ad_spent,
    COALESCE(SUM(a.val_impressions), 0)::BIGINT AS impressions,
    COALESCE(SUM(a.val_clicks), 0)::BIGINT AS clicks,
    COALESCE(SUM(a.val_orders), 0)::BIGINT AS orders,
    COALESCE(SUM(a.amt_revenue), 0)::NUMERIC AS ad_revenue
  FROM crp_portal__ft_advertising_hp a
  WHERE
    (p_company_ids IS NULL OR a.pfk_id_company::TEXT = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR a.pfk_id_store::TEXT = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR a.pfk_id_store_address::TEXT = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR a.pfk_id_portal::TEXT = ANY(p_channel_portal_ids))
    AND (p_start_date IS NULL OR a.pk_ts_hour >= p_start_date)
    AND (p_end_date IS NULL OR a.pk_ts_hour <= p_end_date)
  GROUP BY day_of_week, hour_of_day
  ORDER BY day_of_week, hour_of_day;
END;
$$;
