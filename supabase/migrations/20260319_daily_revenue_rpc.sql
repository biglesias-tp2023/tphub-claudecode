-- Daily revenue by channel RPC for Calendar view
-- Returns daily revenue breakdown by channel for a date range

CREATE OR REPLACE FUNCTION get_daily_revenue_by_channel(
  p_company_ids   BIGINT[],
  p_start_date    DATE,
  p_end_date      DATE,
  p_brand_ids     TEXT[]    DEFAULT NULL,
  p_address_ids   TEXT[]    DEFAULT NULL
)
RETURNS TABLE (
  date_key       TEXT,
  channel        TEXT,
  total_revenue  NUMERIC,
  total_orders   BIGINT,
  total_ad_spent NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(o.td_creation_time, 'YYYY-MM-DD')   AS date_key,
    CASE o.pfk_id_portal
      WHEN 'E22BC362-2' THEN 'glovo'
      WHEN '3CCD6861'   THEN 'ubereats'
      ELSE 'justeat'
    END                                           AS channel,
    COALESCE(SUM(o.amt_total_price), 0)           AS total_revenue,
    COUNT(o.pk_uuid_order)                        AS total_orders,
    COALESCE(SUM(o.amt_promotions), 0)            AS total_ad_spent
  FROM crp_portal__ft_order_head o
  WHERE o.pfk_id_company = ANY(p_company_ids)
    AND o.td_creation_time >= p_start_date
    AND o.td_creation_time <  (p_end_date + INTERVAL '1 day')
    AND (p_brand_ids   IS NULL OR o.pfk_id_store         = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR o.pfk_id_store_address = ANY(p_address_ids))
  GROUP BY
    to_char(o.td_creation_time, 'YYYY-MM-DD'),
    o.pfk_id_portal
  ORDER BY date_key, channel;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_revenue_by_channel TO authenticated, anon;
