-- ============================================
-- Migration: 20260220_combined_orders_ads_rpc.sql
-- Description: Extend RPCs to include advertising data (ads) from
--   crp_portal__ft_advertising_hp alongside order data, using CTEs
--   with FULL OUTER JOIN. Zero additional Supabase calls.
-- Date: 2026-02-20
-- ============================================

-- ============================================
-- RPC 1: get_orders_aggregation (extended with ads)
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
  -- Advertising fields
  total_ad_spent numeric,
  total_ad_revenue numeric,
  total_impressions bigint,
  total_clicks bigint,
  total_ad_orders bigint
)
LANGUAGE sql
STABLE
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
      AND (p_company_ids IS NULL OR o.pfk_id_company::text = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR o.pfk_id_store::text = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR o.pfk_id_store_address::text = ANY(p_address_ids))
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
      AND (p_company_ids IS NULL OR a.pfk_id_company::text = ANY(p_company_ids))
      AND (p_brand_ids IS NULL OR a.pfk_id_store::text = ANY(p_brand_ids))
      AND (p_address_ids IS NULL OR a.pfk_id_store_address::text = ANY(p_address_ids))
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

COMMENT ON FUNCTION get_orders_aggregation IS 'Returns pre-aggregated order + advertising metrics grouped by delivery channel (glovo/ubereats/other). Uses CTEs with FULL OUTER JOIN for zero additional round-trips.';


-- ============================================
-- RPC 2: get_controlling_metrics (extended with ads)
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
  total_reviews bigint
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
      COUNT(*) FILTER (WHERE o.amt_promotions > 0)::bigint AS promoted_orders
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
      COALESCE(a.ad_orders, 0) AS ad_orders
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
    COALESCE(rv.total_reviews, 0) AS total_reviews
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

COMMENT ON FUNCTION get_controlling_metrics IS 'Returns pre-aggregated order + advertising metrics for the Controlling dashboard, grouped by company, store, address, and portal. Uses CTEs with FULL OUTER JOIN for zero additional round-trips.';
