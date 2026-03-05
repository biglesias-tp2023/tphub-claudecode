-- ============================================
-- Migration: 20260304_optimize_daily_alerts_rpc.sql
-- Description: Fix timeout + optimize daily anomaly RPCs.
--   1. Add SET statement_timeout = '90s' to all 5 RPCs
--   2. Rewrite orders & promos to use single scan with
--      UTC range filtering (index-friendly) instead of
--      double scan with per-row timezone conversion.
--
-- Date: 2026-03-04
-- ============================================

-- ============================================
-- 1. Add statement_timeout to existing RPCs
--    (reviews, ads already work under 60s but adding safety)
-- ============================================

ALTER FUNCTION get_daily_review_anomalies(numeric, numeric, numeric)
  SET statement_timeout = '90s';

ALTER FUNCTION get_daily_ads_anomalies(numeric, numeric, numeric)
  SET statement_timeout = '90s';


-- ============================================
-- 2. Rewrite get_daily_order_anomalies
--    Key optimization: single scan with UTC range filter
-- ============================================

DROP FUNCTION IF EXISTS get_daily_order_anomalies(numeric);

CREATE OR REPLACE FUNCTION get_daily_order_anomalies(
  p_threshold numeric DEFAULT -20
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  store_id text,
  store_name text,
  address_id text,
  address_name text,
  channel text,
  yesterday_orders bigint,
  yesterday_revenue numeric,
  avg_orders_baseline numeric,
  avg_revenue_baseline numeric,
  stddev_orders numeric,
  orders_deviation_pct numeric,
  revenue_deviation_pct numeric,
  weeks_with_data bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '90s'
AS $$
  WITH
  -- Dedup dimension tables
  active_companies AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_company)
        pk_id_company, des_company_name, des_key_account_manager, des_status, flg_deleted
      FROM crp_portal__dt_company
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
      AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
  ),
  active_stores AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_store)
        pk_id_store, des_store, pfk_id_company, flg_deleted
      FROM crp_portal__dt_store
      ORDER BY pk_id_store, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
  ),
  active_addresses AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_address)
        pk_id_address, des_address, pfk_id_company, flg_deleted
      FROM crp_portal__dt_address
      ORDER BY pk_id_address, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
  ),
  -- Yesterday in Europe/Madrid
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  -- Pre-compute UTC boundaries for the full 43-day window (index-friendly)
  utc_range AS (
    SELECT
      ((yd.d - 42)::timestamp AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'UTC' AS range_start,
      ((yd.d + 1)::timestamp AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'UTC' AS range_end
    FROM yesterday_date yd
  ),
  -- SINGLE SCAN: fetch all orders in 43-day window, compute local date once
  all_orders AS (
    SELECT
      o.pfk_id_company AS cid,
      o.pfk_id_store AS sid,
      o.pfk_id_store_address AS aid,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS order_date,
      o.amt_total_price
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN utc_range ur
    WHERE o.td_creation_time >= ur.range_start
      AND o.td_creation_time < ur.range_end
  ),
  -- Yesterday aggregation (from single scan)
  yesterday_data AS (
    SELECT
      cid, sid, aid, ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(amt_total_price), 0) AS total_revenue
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date = yd.d
    GROUP BY cid, sid, aid, ch
  ),
  -- Baseline: same day-of-week from the single scan
  baseline_daily AS (
    SELECT
      cid, sid, aid, ch, order_date,
      COUNT(*)::numeric AS daily_orders,
      COALESCE(SUM(amt_total_price), 0) AS daily_revenue
    FROM all_orders ao
    CROSS JOIN yesterday_date yd
    WHERE order_date < yd.d
      AND EXTRACT(ISODOW FROM order_date) = EXTRACT(ISODOW FROM yd.d)
    GROUP BY cid, sid, aid, ch, order_date
  ),
  baseline AS (
    SELECT
      cid, sid, aid, ch,
      AVG(daily_orders) AS avg_orders,
      AVG(daily_revenue) AS avg_revenue,
      COALESCE(STDDEV(daily_orders)::numeric, 0) AS sd_orders,
      COUNT(*)::bigint AS wks
    FROM baseline_daily
    GROUP BY cid, sid, aid, ch
  ),
  -- Detect anomalies
  anomalies AS (
    SELECT
      COALESCE(y.cid, b.cid) AS cid,
      COALESCE(y.sid, b.sid) AS sid,
      COALESCE(y.aid, b.aid) AS aid,
      COALESCE(y.ch, b.ch) AS ch,
      COALESCE(y.total_orders, 0)::bigint AS yesterday_orders,
      COALESCE(y.total_revenue, 0) AS yesterday_revenue,
      b.avg_orders AS avg_orders_baseline,
      b.avg_revenue AS avg_revenue_baseline,
      b.sd_orders AS stddev_orders,
      ((COALESCE(y.total_orders, 0)::numeric - b.avg_orders) / b.avg_orders) * 100 AS orders_dev,
      CASE
        WHEN b.avg_revenue > 0 THEN
          ((COALESCE(y.total_revenue, 0) - b.avg_revenue) / b.avg_revenue) * 100
        ELSE NULL
      END AS revenue_dev,
      b.wks AS weeks_with_data
    FROM yesterday_data y
    FULL OUTER JOIN baseline b
      ON y.cid = b.cid AND y.sid = b.sid AND y.aid = b.aid AND y.ch = b.ch
    WHERE
      b.wks >= 3
      AND b.avg_orders > 0
      AND ((COALESCE(y.total_orders, 0)::numeric - b.avg_orders) / b.avg_orders) * 100 <= p_threshold
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    a.sid::text AS store_id,
    COALESCE(s.des_store, 'Desconocida') AS store_name,
    a.aid::text AS address_id,
    COALESCE(addr.des_address, 'Desconocida') AS address_name,
    a.ch AS channel,
    a.yesterday_orders,
    a.yesterday_revenue,
    ROUND(a.avg_orders_baseline::numeric, 1) AS avg_orders_baseline,
    ROUND(a.avg_revenue_baseline::numeric, 2) AS avg_revenue_baseline,
    ROUND(a.stddev_orders::numeric, 1) AS stddev_orders,
    ROUND(a.orders_dev::numeric, 1) AS orders_deviation_pct,
    ROUND(a.revenue_dev::numeric, 1) AS revenue_deviation_pct,
    a.weeks_with_data
  FROM anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  LEFT JOIN active_stores s ON s.pk_id_store = a.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = a.aid
  ORDER BY a.orders_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_order_anomalies(numeric) TO authenticated;


-- ============================================
-- 3. Rewrite get_daily_promo_anomalies (same optimization)
-- ============================================

DROP FUNCTION IF EXISTS get_daily_promo_anomalies(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION get_daily_promo_anomalies(
  p_promo_rate_threshold numeric DEFAULT 15,
  p_promo_spike_pct numeric DEFAULT 50,
  p_min_orders numeric DEFAULT 10
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  store_id text,
  store_name text,
  address_id text,
  address_name text,
  channel text,
  anomaly_type text,
  yesterday_orders bigint,
  yesterday_revenue numeric,
  yesterday_promos numeric,
  yesterday_promo_rate numeric,
  baseline_avg_promos numeric,
  baseline_avg_promo_rate numeric,
  promo_rate_deviation_pct numeric,
  promo_spend_deviation_pct numeric,
  weeks_with_data bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '90s'
AS $$
  WITH
  active_companies AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_company)
        pk_id_company, des_company_name, des_key_account_manager, des_status, flg_deleted
      FROM crp_portal__dt_company
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
      AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
  ),
  active_stores AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_store)
        pk_id_store, des_store, pfk_id_company, flg_deleted
      FROM crp_portal__dt_store
      ORDER BY pk_id_store, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
  ),
  active_addresses AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_address)
        pk_id_address, des_address, pfk_id_company, flg_deleted
      FROM crp_portal__dt_address
      ORDER BY pk_id_address, pk_ts_month DESC
    ) deduped
    WHERE COALESCE(flg_deleted, 0) != 1
  ),
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  utc_range AS (
    SELECT
      ((yd.d - 42)::timestamp AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'UTC' AS range_start,
      ((yd.d + 1)::timestamp AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'UTC' AS range_end
    FROM yesterday_date yd
  ),
  -- SINGLE SCAN with UTC range filter
  all_orders AS (
    SELECT
      o.pfk_id_company AS cid,
      o.pfk_id_store AS sid,
      o.pfk_id_store_address AS aid,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS order_date,
      o.amt_total_price,
      o.amt_promotions
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN utc_range ur
    WHERE o.td_creation_time >= ur.range_start
      AND o.td_creation_time < ur.range_end
  ),
  -- Yesterday promo data
  promos_yesterday AS (
    SELECT
      cid, sid, aid, ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(amt_total_price), 0) AS total_revenue,
      COALESCE(SUM(amt_promotions), 0) AS total_promos,
      CASE
        WHEN SUM(amt_total_price) > 0
        THEN (COALESCE(SUM(amt_promotions), 0) / SUM(amt_total_price)) * 100
        ELSE 0
      END AS promo_rate
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date = yd.d
    GROUP BY cid, sid, aid, ch
  ),
  -- Baseline from single scan
  promos_baseline_daily AS (
    SELECT
      cid, sid, aid, ch, order_date,
      COALESCE(SUM(amt_total_price), 0) AS daily_revenue,
      COALESCE(SUM(amt_promotions), 0) AS daily_promos,
      CASE
        WHEN SUM(amt_total_price) > 0
        THEN (COALESCE(SUM(amt_promotions), 0) / SUM(amt_total_price)) * 100
        ELSE 0
      END AS daily_promo_rate
    FROM all_orders ao
    CROSS JOIN yesterday_date yd
    WHERE order_date < yd.d
      AND EXTRACT(ISODOW FROM order_date) = EXTRACT(ISODOW FROM yd.d)
    GROUP BY cid, sid, aid, ch, order_date
  ),
  promos_baseline AS (
    SELECT
      cid, sid, aid, ch,
      AVG(daily_promos) AS avg_promos,
      AVG(daily_promo_rate) AS avg_promo_rate,
      COUNT(*)::bigint AS wks
    FROM promos_baseline_daily
    GROUP BY cid, sid, aid, ch
  ),
  promo_anomalies AS (
    SELECT
      y.cid, y.sid, y.aid, y.ch,
      y.total_orders,
      y.total_revenue,
      y.total_promos,
      y.promo_rate AS y_promo_rate,
      b.avg_promos,
      b.avg_promo_rate,
      b.wks,
      CASE
        WHEN y.promo_rate > p_promo_rate_threshold
          AND b.avg_promo_rate < p_promo_rate_threshold
          THEN 'high_promo_rate'
        WHEN b.avg_promos > 0
          AND y.total_promos > b.avg_promos * (1 + p_promo_spike_pct / 100.0)
          THEN 'promo_spike'
        WHEN b.avg_promo_rate > 0
          AND ((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100 > p_promo_spike_pct
          THEN 'promo_rate_spike'
        ELSE NULL
      END AS atype,
      CASE
        WHEN b.avg_promo_rate > 0 THEN
          ROUND((((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100)::numeric, 1)
        ELSE NULL
      END AS promo_rate_dev,
      CASE
        WHEN b.avg_promos > 0 THEN
          ROUND((((y.total_promos - b.avg_promos) / b.avg_promos) * 100)::numeric, 1)
        ELSE NULL
      END AS promo_spend_dev
    FROM promos_yesterday y
    INNER JOIN promos_baseline b
      ON y.cid = b.cid AND y.sid = b.sid AND y.aid = b.aid AND y.ch = b.ch
    WHERE
      b.wks >= 3
      AND y.total_orders >= p_min_orders
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    a.sid::text AS store_id,
    COALESCE(s.des_store, 'Desconocida') AS store_name,
    a.aid::text AS address_id,
    COALESCE(addr.des_address, 'Desconocida') AS address_name,
    a.ch AS channel,
    a.atype AS anomaly_type,
    a.total_orders AS yesterday_orders,
    ROUND(a.total_revenue::numeric, 2) AS yesterday_revenue,
    ROUND(a.total_promos::numeric, 2) AS yesterday_promos,
    ROUND(a.y_promo_rate::numeric, 1) AS yesterday_promo_rate,
    ROUND(a.avg_promos::numeric, 2) AS baseline_avg_promos,
    ROUND(a.avg_promo_rate::numeric, 1) AS baseline_avg_promo_rate,
    a.promo_rate_dev AS promo_rate_deviation_pct,
    a.promo_spend_dev AS promo_spend_deviation_pct,
    a.wks AS weeks_with_data
  FROM promo_anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  LEFT JOIN active_stores s ON s.pk_id_store = a.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = a.aid
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype
      WHEN 'high_promo_rate' THEN 1
      WHEN 'promo_spike' THEN 2
      WHEN 'promo_rate_spike' THEN 3
    END,
    a.promo_rate_dev DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_promo_anomalies(numeric, numeric, numeric) TO authenticated;
