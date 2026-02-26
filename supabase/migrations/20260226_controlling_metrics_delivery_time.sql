-- ============================================
-- Migration: 20260226_controlling_metrics_delivery_time.sql
-- Description: Add avg_delivery_time and delivery_time_count to
--   get_controlling_metrics RPC. Calculates delivery time from
--   ts_accepted/ts_delivered in the order_metrics CTE (no extra JOIN).
-- Date: 2026-02-26
-- ============================================

DROP FUNCTION IF EXISTS get_controlling_metrics(text[], timestamp, timestamp);

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
  reembolsos numeric,
  promoted_orders bigint,
  -- Advertising fields
  ad_spent numeric,
  ad_revenue numeric,
  impressions bigint,
  clicks bigint,
  ad_orders bigint,
  -- Review fields
  avg_rating numeric,
  total_reviews bigint,
  -- Delivery time fields
  avg_delivery_time numeric,
  delivery_time_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH order_metrics AS (
    SELECT
      o.pfk_id_company::text AS pfk_id_company,
      o.pfk_id_store::text AS pfk_id_store,
      o.pfk_id_store_address::text AS pfk_id_store_address,
      o.pfk_id_portal::text AS pfk_id_portal,
      COALESCE(SUM(o.amt_total_price), 0) AS ventas,
      COUNT(*)::bigint AS pedidos,
      COUNT(*) FILTER (WHERE o.flg_customer_new = true)::bigint AS nuevos,
      COALESCE(SUM(o.amt_promotions), 0) AS descuentos,
      COALESCE(SUM(o.amt_refunds), 0) AS reembolsos,
      COUNT(*) FILTER (WHERE o.amt_promotions > 0)::bigint AS promoted_orders,
      -- Delivery time: average of valid times (1-179 min)
      AVG(
        CASE
          WHEN o.ts_accepted IS NOT NULL
           AND o.ts_delivered IS NOT NULL
           AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60 BETWEEN 1 AND 179
          THEN ROUND(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60)
          ELSE NULL
        END
      ) AS avg_delivery_time,
      COUNT(
        CASE
          WHEN o.ts_accepted IS NOT NULL
           AND o.ts_delivered IS NOT NULL
           AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60 BETWEEN 1 AND 179
          THEN 1
          ELSE NULL
        END
      )::bigint AS delivery_time_count
    FROM crp_portal__ft_order_head o
    WHERE
      o.pfk_id_company::text = ANY(p_company_ids)
      AND o.td_creation_time >= p_start_date
      AND o.td_creation_time <= p_end_date
      AND o.pfk_id_store_address IS NOT NULL
    GROUP BY
      o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address, o.pfk_id_portal
  ),
  ads_metrics AS (
    SELECT
      a.pfk_id_company::text AS pfk_id_company,
      a.pfk_id_store::text AS pfk_id_store,
      a.pfk_id_store_address::text AS pfk_id_store_address,
      a.pfk_id_portal::text AS pfk_id_portal,
      COALESCE(SUM(a.amt_ad_spent), 0) AS ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::bigint AS impressions,
      COALESCE(SUM(a.val_clicks), 0)::bigint AS clicks,
      COALESCE(SUM(a.val_orders), 0)::bigint AS ad_orders
    FROM crp_portal__ft_advertising_hp a
    WHERE
      a.pfk_id_company::text = ANY(p_company_ids)
      AND a.pk_ts_hour >= p_start_date
      AND a.pk_ts_hour <= p_end_date
    GROUP BY
      a.pfk_id_company, a.pfk_id_store, a.pfk_id_store_address, a.pfk_id_portal
  ),
  review_metrics AS (
    SELECT
      r.pfk_id_company::text AS pfk_id_company,
      r.pfk_id_store::text AS pfk_id_store,
      r.pfk_id_store_address::text AS pfk_id_store_address,
      r.pfk_id_portal::text AS pfk_id_portal,
      COALESCE(AVG(r.val_rating), 0) AS avg_rating,
      COUNT(*)::bigint AS total_reviews
    FROM crp_portal__ft_review r
    WHERE
      r.pfk_id_company::text = ANY(p_company_ids)
      AND r.ts_creation_time >= p_start_date
      AND r.ts_creation_time < p_end_date + interval '1 day'
    GROUP BY
      r.pfk_id_company, r.pfk_id_store, r.pfk_id_store_address, r.pfk_id_portal
  ),
  orders_ads AS (
    SELECT
      COALESCE(o.pfk_id_company, a.pfk_id_company) AS pfk_id_company,
      COALESCE(o.pfk_id_store, a.pfk_id_store) AS pfk_id_store,
      COALESCE(o.pfk_id_store_address, a.pfk_id_store_address) AS pfk_id_store_address,
      COALESCE(o.pfk_id_portal, a.pfk_id_portal) AS pfk_id_portal,
      COALESCE(o.ventas, 0) AS ventas,
      COALESCE(o.pedidos, 0) AS pedidos,
      COALESCE(o.nuevos, 0) AS nuevos,
      COALESCE(o.descuentos, 0) AS descuentos,
      COALESCE(o.reembolsos, 0) AS reembolsos,
      COALESCE(o.promoted_orders, 0) AS promoted_orders,
      COALESCE(a.ad_spent, 0) AS ad_spent,
      COALESCE(a.ad_revenue, 0) AS ad_revenue,
      COALESCE(a.impressions, 0) AS impressions,
      COALESCE(a.clicks, 0) AS clicks,
      COALESCE(a.ad_orders, 0) AS ad_orders,
      o.avg_delivery_time,
      COALESCE(o.delivery_time_count, 0) AS delivery_time_count
    FROM order_metrics o
    FULL OUTER JOIN ads_metrics a
      ON o.pfk_id_company = a.pfk_id_company
      AND o.pfk_id_store = a.pfk_id_store
      AND o.pfk_id_store_address = a.pfk_id_store_address
      AND o.pfk_id_portal = a.pfk_id_portal
  )
  SELECT
    COALESCE(oa.pfk_id_company, rv.pfk_id_company) AS pfk_id_company,
    COALESCE(oa.pfk_id_store, rv.pfk_id_store) AS pfk_id_store,
    COALESCE(oa.pfk_id_store_address, rv.pfk_id_store_address) AS pfk_id_store_address,
    COALESCE(oa.pfk_id_portal, rv.pfk_id_portal) AS pfk_id_portal,
    COALESCE(oa.ventas, 0) AS ventas,
    COALESCE(oa.pedidos, 0) AS pedidos,
    COALESCE(oa.nuevos, 0) AS nuevos,
    COALESCE(oa.descuentos, 0) AS descuentos,
    COALESCE(oa.reembolsos, 0) AS reembolsos,
    COALESCE(oa.promoted_orders, 0) AS promoted_orders,
    COALESCE(oa.ad_spent, 0) AS ad_spent,
    COALESCE(oa.ad_revenue, 0) AS ad_revenue,
    COALESCE(oa.impressions, 0) AS impressions,
    COALESCE(oa.clicks, 0) AS clicks,
    COALESCE(oa.ad_orders, 0) AS ad_orders,
    COALESCE(rv.avg_rating, 0) AS avg_rating,
    COALESCE(rv.total_reviews, 0) AS total_reviews,
    COALESCE(oa.avg_delivery_time, 0) AS avg_delivery_time,
    COALESCE(oa.delivery_time_count, 0) AS delivery_time_count
  FROM orders_ads oa
  FULL OUTER JOIN review_metrics rv
    ON oa.pfk_id_company = rv.pfk_id_company
    AND oa.pfk_id_store = rv.pfk_id_store
    AND oa.pfk_id_store_address = rv.pfk_id_store_address
    AND oa.pfk_id_portal = rv.pfk_id_portal
  ORDER BY
    COALESCE(oa.pfk_id_company, rv.pfk_id_company),
    COALESCE(oa.pfk_id_store, rv.pfk_id_store),
    COALESCE(oa.pfk_id_store_address, rv.pfk_id_store_address),
    COALESCE(oa.pfk_id_portal, rv.pfk_id_portal);
$$;

GRANT EXECUTE ON FUNCTION get_controlling_metrics(text[], timestamp, timestamp) TO authenticated;

COMMENT ON FUNCTION get_controlling_metrics IS 'Returns pre-aggregated order + advertising + review metrics for the Controlling dashboard, grouped by company, store, address, and portal. Includes avg delivery time from order timestamps. Uses CTEs with FULL OUTER JOIN for zero additional round-trips.';
