-- ============================================
-- Migration: 20260304_fix_rpc_index_usage.sql
-- Description: Fix performance issue in RPC WHERE clauses.
--
-- Problem: All RPCs use `column::text = ANY(text_array)` — the ::text cast
-- creates an expression that prevents PostgreSQL from using the composite
-- indexes on (pfk_id_company, td_creation_time). Since the columns are
-- already text, removing the redundant cast enables index scans.
--
-- Fix: Remove `::text` from WHERE clause column references.
--
-- Date: 2026-03-04
-- ============================================


-- ============================================
-- 1. get_orders_aggregation
-- ============================================

DROP FUNCTION IF EXISTS get_orders_aggregation(text[], text[], text[], text[], timestamp, timestamp);

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
  unique_customers bigint,
  total_ad_spent numeric,
  total_ad_revenue numeric,
  total_impressions bigint,
  total_clicks bigint,
  total_ad_orders bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  WITH order_agg AS (
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
      AND (p_company_ids IS NULL OR o.pfk_id_company = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR o.pfk_id_store = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR o.pfk_id_store_address = ANY(p_address_ids))
      AND (p_channel_portal_ids IS NULL OR o.pfk_id_portal = ANY(p_channel_portal_ids))
    GROUP BY 1
  ),
  ads_agg AS (
    SELECT
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS channel,
      COALESCE(SUM(a.amt_ad_spent), 0) AS total_ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS total_ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::bigint AS total_impressions,
      COALESCE(SUM(a.val_clicks), 0)::bigint AS total_clicks,
      COALESCE(SUM(a.val_orders), 0)::bigint AS total_ad_orders
    FROM crp_portal__ft_advertising_hp a
    WHERE
      a.pk_ts_hour >= p_start_date
      AND a.pk_ts_hour <= p_end_date
      AND (p_company_ids IS NULL OR a.pfk_id_company = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR a.pfk_id_store = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR a.pfk_id_store_address = ANY(p_address_ids))
      AND (p_channel_portal_ids IS NULL OR a.pfk_id_portal = ANY(p_channel_portal_ids))
    GROUP BY 1
  )
  SELECT
    COALESCE(o.channel, a.channel) AS channel,
    COALESCE(o.total_revenue, 0) AS total_revenue,
    COALESCE(o.total_orders, 0) AS total_orders,
    COALESCE(o.total_discounts, 0) AS total_discounts,
    COALESCE(o.total_refunds, 0) AS total_refunds,
    COALESCE(o.unique_customers, 0) AS unique_customers,
    COALESCE(a.total_ad_spent, 0) AS total_ad_spent,
    COALESCE(a.total_ad_revenue, 0) AS total_ad_revenue,
    COALESCE(a.total_impressions, 0) AS total_impressions,
    COALESCE(a.total_clicks, 0) AS total_clicks,
    COALESCE(a.total_ad_orders, 0) AS total_ad_orders
  FROM order_agg o
  FULL OUTER JOIN ads_agg a ON o.channel = a.channel;
$$;

GRANT EXECUTE ON FUNCTION get_orders_aggregation(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;


-- ============================================
-- 2. get_controlling_metrics
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
  ad_spent numeric,
  ad_revenue numeric,
  impressions bigint,
  clicks bigint,
  ad_orders bigint,
  avg_rating numeric,
  total_reviews bigint,
  avg_delivery_time numeric,
  delivery_time_count bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  WITH order_metrics AS (
    SELECT
      o.pfk_id_company,
      o.pfk_id_store,
      o.pfk_id_store_address,
      o.pfk_id_portal,
      COALESCE(SUM(o.amt_total_price), 0) AS ventas,
      COUNT(*)::bigint AS pedidos,
      COUNT(*) FILTER (WHERE o.flg_customer_new = true)::bigint AS nuevos,
      COALESCE(SUM(o.amt_promotions), 0) AS descuentos,
      COALESCE(SUM(o.amt_refunds), 0) AS reembolsos,
      COUNT(*) FILTER (WHERE o.amt_promotions > 0)::bigint AS promoted_orders,
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
      o.pfk_id_company = ANY(p_company_ids)
      AND o.td_creation_time >= p_start_date
      AND o.td_creation_time <= p_end_date
      AND o.pfk_id_store_address IS NOT NULL
    GROUP BY
      o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address, o.pfk_id_portal
  ),
  ads_metrics AS (
    SELECT
      a.pfk_id_company,
      a.pfk_id_store,
      a.pfk_id_store_address,
      a.pfk_id_portal,
      COALESCE(SUM(a.amt_ad_spent), 0) AS ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::bigint AS impressions,
      COALESCE(SUM(a.val_clicks), 0)::bigint AS clicks,
      COALESCE(SUM(a.val_orders), 0)::bigint AS ad_orders
    FROM crp_portal__ft_advertising_hp a
    WHERE
      a.pfk_id_company = ANY(p_company_ids)
      AND a.pk_ts_hour >= p_start_date
      AND a.pk_ts_hour <= p_end_date
    GROUP BY
      a.pfk_id_company, a.pfk_id_store, a.pfk_id_store_address, a.pfk_id_portal
  ),
  review_metrics AS (
    SELECT
      r.pfk_id_company,
      r.pfk_id_store,
      r.pfk_id_store_address,
      r.pfk_id_portal,
      COALESCE(AVG(r.val_rating), 0) AS avg_rating,
      COUNT(*)::bigint AS total_reviews
    FROM crp_portal__ft_review r
    WHERE
      r.pfk_id_company = ANY(p_company_ids)
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


-- ============================================
-- 3. get_reviews_aggregation
-- ============================================

DROP FUNCTION IF EXISTS get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp);

CREATE OR REPLACE FUNCTION get_reviews_aggregation(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  channel text,
  total_reviews bigint,
  avg_rating numeric,
  positive_reviews bigint,
  negative_reviews bigint,
  rating_1 bigint,
  rating_2 bigint,
  rating_3 bigint,
  rating_4 bigint,
  rating_5 bigint,
  avg_delivery_time_minutes numeric
)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  SELECT
    CASE
      WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END AS channel,
    COUNT(*)::bigint AS total_reviews,
    COALESCE(AVG(r.val_rating), 0) AS avg_rating,
    COUNT(*) FILTER (WHERE r.val_rating >= 4)::bigint AS positive_reviews,
    COUNT(*) FILTER (WHERE r.val_rating <= 2)::bigint AS negative_reviews,
    COUNT(*) FILTER (WHERE r.val_rating = 1)::bigint AS rating_1,
    COUNT(*) FILTER (WHERE r.val_rating = 2)::bigint AS rating_2,
    COUNT(*) FILTER (WHERE r.val_rating = 3)::bigint AS rating_3,
    COUNT(*) FILTER (WHERE r.val_rating = 4)::bigint AS rating_4,
    COUNT(*) FILTER (WHERE r.val_rating = 5)::bigint AS rating_5,
    AVG(
      CASE
        WHEN o.ts_accepted IS NOT NULL
         AND o.ts_delivered IS NOT NULL
         AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60 BETWEEN 1 AND 179
        THEN ROUND(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60)
        ELSE NULL
      END
    ) AS avg_delivery_time_minutes
  FROM crp_portal__ft_review r
  LEFT JOIN crp_portal__ft_order_head o
    ON r.fk_id_order = o.pk_uuid_order
  WHERE
    r.ts_creation_time >= p_start_date
    AND r.ts_creation_time <= p_end_date
    AND (p_company_ids IS NULL OR r.pfk_id_company = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR r.pfk_id_store = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR r.pfk_id_store_address = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR r.pfk_id_portal = ANY(p_channel_portal_ids))
  GROUP BY
    CASE
      WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END;
$$;

GRANT EXECUTE ON FUNCTION get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;
