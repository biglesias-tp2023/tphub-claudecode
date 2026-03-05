-- ============================================
-- Migration: 20260304_aggregate_by_company_channel.sql
-- Description: Rewrite all 5 daily alert RPCs to aggregate at
--   company + channel level (not store + address).
--   Fixes false positives from stale/migrated store IDs.
--   Adds p_min_avg_orders to order anomalies to filter noise
--   from low-volume restaurants (media < 3 pedidos).
--
-- Date: 2026-03-04
-- ============================================


-- ============================================
-- 1. get_daily_order_anomalies
-- ============================================

DROP FUNCTION IF EXISTS get_daily_order_anomalies(numeric);
DROP FUNCTION IF EXISTS get_daily_order_anomalies(numeric, numeric);

CREATE OR REPLACE FUNCTION get_daily_order_anomalies(
  p_threshold numeric DEFAULT -20,
  p_min_avg_orders numeric DEFAULT 3
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  channel text,
  yesterday_orders bigint,
  yesterday_revenue numeric,
  avg_orders_baseline numeric,
  avg_revenue_baseline numeric,
  orders_deviation_pct numeric,
  revenue_deviation_pct numeric,
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
        pk_id_company, des_company_name, des_key_account_manager
      FROM crp_portal__dt_company
      WHERE COALESCE(flg_deleted, 0) != 1
        AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
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
  all_orders AS (
    SELECT
      o.pfk_id_company AS cid,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS order_date,
      o.amt_total_price
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    INNER JOIN crp_portal__dt_store s
      ON o.pfk_id_company = s.pfk_id_company
      AND o.pfk_id_store = s.pk_id_store
      AND s.pk_ts_month = date_trunc('month', current_timestamp)
    INNER JOIN crp_portal__dt_address a
      ON o.pfk_id_company = a.pfk_id_company
      AND o.pfk_id_store_address = a.pk_id_address
      AND a.pk_ts_month = date_trunc('month', current_timestamp)
    CROSS JOIN utc_range ur
    WHERE o.td_creation_time >= ur.range_start
      AND o.td_creation_time < ur.range_end
      AND o.pfk_id_portal != 'E22BC362'
      AND s.flg_deleted = '0'
      AND a.flg_deleted = '0'
  ),
  yesterday_data AS (
    SELECT
      cid, ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(amt_total_price), 0) AS total_revenue
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date = yd.d
    GROUP BY cid, ch
  ),
  baseline_daily AS (
    SELECT
      cid, ch, order_date,
      COUNT(*)::numeric AS daily_orders,
      COALESCE(SUM(amt_total_price), 0) AS daily_revenue
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date < yd.d
      AND EXTRACT(ISODOW FROM order_date) = EXTRACT(ISODOW FROM yd.d)
    GROUP BY cid, ch, order_date
  ),
  baseline AS (
    SELECT
      cid, ch,
      AVG(daily_orders) AS avg_orders,
      AVG(daily_revenue) AS avg_revenue,
      COUNT(*)::bigint AS wks
    FROM baseline_daily
    GROUP BY cid, ch
  ),
  anomalies AS (
    SELECT
      COALESCE(y.cid, b.cid) AS cid,
      COALESCE(y.ch, b.ch) AS ch,
      COALESCE(y.total_orders, 0)::bigint AS yesterday_orders,
      COALESCE(y.total_revenue, 0) AS yesterday_revenue,
      b.avg_orders,
      b.avg_revenue,
      ((COALESCE(y.total_orders, 0)::numeric - b.avg_orders) / b.avg_orders) * 100 AS orders_dev,
      CASE
        WHEN b.avg_revenue > 0 THEN
          ((COALESCE(y.total_revenue, 0) - b.avg_revenue) / b.avg_revenue) * 100
        ELSE NULL
      END AS revenue_dev,
      b.wks
    FROM yesterday_data y
    FULL OUTER JOIN baseline b ON y.cid = b.cid AND y.ch = b.ch
    WHERE
      b.wks >= 3
      AND b.avg_orders >= p_min_avg_orders
      AND ((COALESCE(y.total_orders, 0)::numeric - b.avg_orders) / b.avg_orders) * 100 <= p_threshold
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    a.ch AS channel,
    a.yesterday_orders,
    ROUND(a.yesterday_revenue::numeric, 2) AS yesterday_revenue,
    ROUND(a.avg_orders::numeric, 1) AS avg_orders_baseline,
    ROUND(a.avg_revenue::numeric, 2) AS avg_revenue_baseline,
    ROUND(a.orders_dev::numeric, 1) AS orders_deviation_pct,
    ROUND(a.revenue_dev::numeric, 1) AS revenue_deviation_pct,
    a.wks AS weeks_with_data
  FROM anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  ORDER BY a.orders_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_order_anomalies(numeric, numeric) TO authenticated;

COMMENT ON FUNCTION get_daily_order_anomalies IS
  'Detects order anomalies at company+channel level. Compares yesterday vs baseline (same day-of-week, 6 weeks). '
  'p_min_avg_orders (default 3) filters out low-volume restaurants that generate noise alerts.';


-- ============================================
-- 2. get_daily_review_anomalies
-- ============================================

DROP FUNCTION IF EXISTS get_daily_review_anomalies(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION get_daily_review_anomalies(
  p_min_reviews numeric DEFAULT 3,
  p_rating_threshold numeric DEFAULT 3.5,
  p_negative_spike_pct numeric DEFAULT 50
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  channel text,
  anomaly_type text,
  yesterday_reviews bigint,
  yesterday_avg_rating numeric,
  yesterday_negative_count bigint,
  baseline_avg_rating numeric,
  baseline_avg_negative_count numeric,
  rating_deviation_pct numeric,
  negative_spike_pct numeric,
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
        pk_id_company, des_company_name, des_key_account_manager
      FROM crp_portal__dt_company
      WHERE COALESCE(flg_deleted, 0) != 1
        AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
  ),
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  reviews_yesterday AS (
    SELECT
      r.pfk_id_company AS cid,
      CASE
        WHEN r.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COUNT(*)::bigint AS total_reviews,
      COALESCE(AVG(r.val_rating), 0) AS avg_rating,
      COUNT(*) FILTER (WHERE r.val_rating <= 2)::bigint AS negative_count
    FROM crp_portal__ft_review r
    INNER JOIN active_companies ac ON ac.pk_id_company::text = r.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
      AND r.pfk_id_portal != 'E22BC362'
    GROUP BY r.pfk_id_company,
      CASE
        WHEN r.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  reviews_baseline_daily AS (
    SELECT
      r.pfk_id_company AS cid,
      CASE
        WHEN r.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS review_date,
      COUNT(*)::numeric AS daily_reviews,
      COALESCE(AVG(r.val_rating), 0) AS daily_avg_rating,
      COUNT(*) FILTER (WHERE r.val_rating <= 2)::numeric AS daily_negative_count
    FROM crp_portal__ft_review r
    INNER JOIN active_companies ac ON ac.pk_id_company::text = r.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
      AND r.pfk_id_portal != 'E22BC362'
    GROUP BY r.pfk_id_company,
      CASE
        WHEN r.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
  ),
  reviews_baseline AS (
    SELECT
      cid, ch,
      AVG(daily_avg_rating) AS avg_rating,
      AVG(daily_negative_count) AS avg_negative_count,
      COUNT(*)::bigint AS wks
    FROM reviews_baseline_daily
    GROUP BY cid, ch
  ),
  review_anomalies AS (
    SELECT
      y.cid, y.ch,
      y.total_reviews,
      y.avg_rating AS y_avg_rating,
      y.negative_count AS y_negative_count,
      b.avg_rating AS b_avg_rating,
      b.avg_negative_count AS b_avg_negative_count,
      b.wks,
      CASE
        WHEN y.avg_rating < p_rating_threshold AND b.avg_rating >= 4.0 THEN 'low_rating'
        WHEN b.avg_negative_count > 0
          AND y.negative_count::numeric > b.avg_negative_count * (1 + p_negative_spike_pct / 100.0)
          THEN 'negative_spike'
        WHEN b.avg_rating > 0
          AND ((y.avg_rating - b.avg_rating) / b.avg_rating) * 100 <= -10
          THEN 'rating_drop'
        ELSE NULL
      END AS atype,
      CASE
        WHEN b.avg_rating > 0 THEN
          ROUND((((y.avg_rating - b.avg_rating) / b.avg_rating) * 100)::numeric, 1)
        ELSE NULL
      END AS rating_dev,
      CASE
        WHEN b.avg_negative_count > 0 THEN
          ROUND((((y.negative_count::numeric - b.avg_negative_count) / b.avg_negative_count) * 100)::numeric, 1)
        ELSE NULL
      END AS neg_spike
    FROM reviews_yesterday y
    INNER JOIN reviews_baseline b ON y.cid = b.cid AND y.ch = b.ch
    WHERE b.wks >= 3 AND y.total_reviews >= p_min_reviews
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    a.ch AS channel,
    a.atype AS anomaly_type,
    a.total_reviews AS yesterday_reviews,
    ROUND(a.y_avg_rating::numeric, 2) AS yesterday_avg_rating,
    a.y_negative_count AS yesterday_negative_count,
    ROUND(a.b_avg_rating::numeric, 2) AS baseline_avg_rating,
    ROUND(a.b_avg_negative_count::numeric, 1) AS baseline_avg_negative_count,
    a.rating_dev AS rating_deviation_pct,
    a.neg_spike AS negative_spike_pct,
    a.wks AS weeks_with_data
  FROM review_anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company::text = a.cid
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype WHEN 'low_rating' THEN 1 WHEN 'negative_spike' THEN 2 WHEN 'rating_drop' THEN 3 END,
    a.rating_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_review_anomalies(numeric, numeric, numeric) TO authenticated;


-- ============================================
-- 3. get_daily_ads_anomalies
-- ============================================

DROP FUNCTION IF EXISTS get_daily_ads_anomalies(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION get_daily_ads_anomalies(
  p_roas_threshold numeric DEFAULT 3.0,
  p_spend_threshold numeric DEFAULT 10,
  p_spend_deviation_pct numeric DEFAULT 50
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  channel text,
  anomaly_type text,
  yesterday_ad_spent numeric,
  yesterday_ad_revenue numeric,
  yesterday_roas numeric,
  yesterday_impressions bigint,
  yesterday_clicks bigint,
  yesterday_ad_orders bigint,
  baseline_avg_ad_spent numeric,
  baseline_avg_roas numeric,
  baseline_avg_impressions numeric,
  roas_deviation_pct numeric,
  spend_deviation_pct numeric,
  impressions_deviation_pct numeric,
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
        pk_id_company, des_company_name, des_key_account_manager
      FROM crp_portal__dt_company
      WHERE COALESCE(flg_deleted, 0) != 1
        AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
  ),
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  ads_yesterday AS (
    SELECT
      a.pfk_id_company AS cid,
      CASE
        WHEN a.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COALESCE(SUM(a.amt_ad_spent), 0) AS total_ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS total_ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::bigint AS total_impressions,
      COALESCE(SUM(a.val_clicks), 0)::bigint AS total_clicks,
      COALESCE(SUM(a.val_orders), 0)::bigint AS total_ad_orders
    FROM crp_portal__ft_advertising_hp a
    INNER JOIN active_companies ac ON ac.pk_id_company::text = a.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date = yd.d
      AND a.pfk_id_portal != 'E22BC362'
    GROUP BY a.pfk_id_company,
      CASE
        WHEN a.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  ads_baseline_daily AS (
    SELECT
      a.pfk_id_company AS cid,
      CASE
        WHEN a.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date AS ad_date,
      COALESCE(SUM(a.amt_ad_spent), 0) AS daily_ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS daily_ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::numeric AS daily_impressions
    FROM crp_portal__ft_advertising_hp a
    INNER JOIN active_companies ac ON ac.pk_id_company::text = a.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date) = EXTRACT(ISODOW FROM yd.d)
      AND a.pfk_id_portal != 'E22BC362'
    GROUP BY a.pfk_id_company,
      CASE
        WHEN a.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date
  ),
  ads_baseline AS (
    SELECT
      cid, ch,
      AVG(daily_ad_spent) AS avg_ad_spent,
      AVG(CASE WHEN daily_ad_spent > 0 THEN daily_ad_revenue / daily_ad_spent ELSE NULL END) AS avg_roas,
      AVG(daily_impressions) AS avg_impressions,
      COUNT(*)::bigint AS wks
    FROM ads_baseline_daily
    GROUP BY cid, ch
  ),
  ads_anomalies AS (
    SELECT
      y.cid, y.ch,
      y.total_ad_spent, y.total_ad_revenue,
      CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END AS y_roas,
      y.total_impressions, y.total_clicks, y.total_ad_orders,
      b.avg_ad_spent, b.avg_roas, b.avg_impressions, b.wks,
      CASE
        WHEN y.total_ad_spent >= p_spend_threshold AND y.total_ad_spent > 0
          AND (y.total_ad_revenue / y.total_ad_spent) < p_roas_threshold
          THEN 'low_roas'
        WHEN b.avg_ad_spent > 0
          AND y.total_ad_spent > b.avg_ad_spent * (1 + p_spend_deviation_pct / 100.0)
          AND b.avg_roas IS NOT NULL AND b.avg_roas > 0
          AND (CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END) < b.avg_roas * 0.8
          THEN 'spend_spike'
        WHEN b.avg_impressions > 0
          AND y.total_impressions::numeric < b.avg_impressions * 0.5
          AND y.total_ad_spent >= p_spend_threshold
          THEN 'impressions_drop'
        ELSE NULL
      END AS atype,
      CASE WHEN b.avg_roas IS NOT NULL AND b.avg_roas > 0 THEN
        ROUND((((CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END - b.avg_roas) / b.avg_roas) * 100)::numeric, 1)
      ELSE NULL END AS roas_dev,
      CASE WHEN b.avg_ad_spent > 0 THEN
        ROUND((((y.total_ad_spent - b.avg_ad_spent) / b.avg_ad_spent) * 100)::numeric, 1)
      ELSE NULL END AS spend_dev,
      CASE WHEN b.avg_impressions > 0 THEN
        ROUND((((y.total_impressions::numeric - b.avg_impressions) / b.avg_impressions) * 100)::numeric, 1)
      ELSE NULL END AS impressions_dev
    FROM ads_yesterday y
    INNER JOIN ads_baseline b ON y.cid = b.cid AND y.ch = b.ch
    WHERE b.wks >= 3 AND y.total_ad_spent >= p_spend_threshold
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    a.ch AS channel,
    a.atype AS anomaly_type,
    ROUND(a.total_ad_spent::numeric, 2) AS yesterday_ad_spent,
    ROUND(a.total_ad_revenue::numeric, 2) AS yesterday_ad_revenue,
    ROUND(a.y_roas::numeric, 2) AS yesterday_roas,
    a.total_impressions AS yesterday_impressions,
    a.total_clicks AS yesterday_clicks,
    a.total_ad_orders AS yesterday_ad_orders,
    ROUND(a.avg_ad_spent::numeric, 2) AS baseline_avg_ad_spent,
    ROUND(a.avg_roas::numeric, 2) AS baseline_avg_roas,
    ROUND(a.avg_impressions::numeric, 0) AS baseline_avg_impressions,
    a.roas_dev AS roas_deviation_pct,
    a.spend_dev AS spend_deviation_pct,
    a.impressions_dev AS impressions_deviation_pct,
    a.wks AS weeks_with_data
  FROM ads_anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company::text = a.cid
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype WHEN 'low_roas' THEN 1 WHEN 'spend_spike' THEN 2 WHEN 'impressions_drop' THEN 3 END,
    a.roas_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_ads_anomalies(numeric, numeric, numeric) TO authenticated;


-- ============================================
-- 4. get_daily_promo_anomalies
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
        pk_id_company, des_company_name, des_key_account_manager
      FROM crp_portal__dt_company
      WHERE COALESCE(flg_deleted, 0) != 1
        AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
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
  all_orders AS (
    SELECT
      o.pfk_id_company AS cid,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS order_date,
      o.amt_total_price,
      o.amt_promotions
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    INNER JOIN crp_portal__dt_store s
      ON o.pfk_id_company = s.pfk_id_company
      AND o.pfk_id_store = s.pk_id_store
      AND s.pk_ts_month = date_trunc('month', current_timestamp)
    INNER JOIN crp_portal__dt_address a
      ON o.pfk_id_company = a.pfk_id_company
      AND o.pfk_id_store_address = a.pk_id_address
      AND a.pk_ts_month = date_trunc('month', current_timestamp)
    CROSS JOIN utc_range ur
    WHERE o.td_creation_time >= ur.range_start
      AND o.td_creation_time < ur.range_end
      AND o.pfk_id_portal != 'E22BC362'
      AND s.flg_deleted = '0'
      AND a.flg_deleted = '0'
  ),
  promos_yesterday AS (
    SELECT
      cid, ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(amt_total_price), 0) AS total_revenue,
      COALESCE(SUM(amt_promotions), 0) AS total_promos,
      CASE WHEN SUM(amt_total_price) > 0
        THEN (COALESCE(SUM(amt_promotions), 0) / SUM(amt_total_price)) * 100
        ELSE 0
      END AS promo_rate
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date = yd.d
    GROUP BY cid, ch
  ),
  promos_baseline_daily AS (
    SELECT
      cid, ch, order_date,
      COALESCE(SUM(amt_total_price), 0) AS daily_revenue,
      COALESCE(SUM(amt_promotions), 0) AS daily_promos,
      CASE WHEN SUM(amt_total_price) > 0
        THEN (COALESCE(SUM(amt_promotions), 0) / SUM(amt_total_price)) * 100
        ELSE 0
      END AS daily_promo_rate
    FROM all_orders
    CROSS JOIN yesterday_date yd
    WHERE order_date < yd.d
      AND EXTRACT(ISODOW FROM order_date) = EXTRACT(ISODOW FROM yd.d)
    GROUP BY cid, ch, order_date
  ),
  promos_baseline AS (
    SELECT
      cid, ch,
      AVG(daily_promos) AS avg_promos,
      AVG(daily_promo_rate) AS avg_promo_rate,
      COUNT(*)::bigint AS wks
    FROM promos_baseline_daily
    GROUP BY cid, ch
  ),
  promo_anomalies AS (
    SELECT
      y.cid, y.ch,
      y.total_orders, y.total_revenue, y.total_promos,
      y.promo_rate AS y_promo_rate,
      b.avg_promos, b.avg_promo_rate, b.wks,
      CASE
        WHEN y.promo_rate > p_promo_rate_threshold AND b.avg_promo_rate < p_promo_rate_threshold
          THEN 'high_promo_rate'
        WHEN b.avg_promos > 0 AND y.total_promos > b.avg_promos * (1 + p_promo_spike_pct / 100.0)
          THEN 'promo_spike'
        WHEN b.avg_promo_rate > 0
          AND ((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100 > p_promo_spike_pct
          THEN 'promo_rate_spike'
        ELSE NULL
      END AS atype,
      CASE WHEN b.avg_promo_rate > 0 THEN
        ROUND((((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100)::numeric, 1)
      ELSE NULL END AS promo_rate_dev,
      CASE WHEN b.avg_promos > 0 THEN
        ROUND((((y.total_promos - b.avg_promos) / b.avg_promos) * 100)::numeric, 1)
      ELSE NULL END AS promo_spend_dev
    FROM promos_yesterday y
    INNER JOIN promos_baseline b ON y.cid = b.cid AND y.ch = b.ch
    WHERE b.wks >= 3 AND y.total_orders >= p_min_orders
  )
  SELECT
    a.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
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
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype WHEN 'high_promo_rate' THEN 1 WHEN 'promo_spike' THEN 2 WHEN 'promo_rate_spike' THEN 3 END,
    a.promo_rate_dev DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_promo_anomalies(numeric, numeric, numeric) TO authenticated;


-- ============================================
-- 5. get_daily_delivery_time_anomalies
-- ============================================

DROP FUNCTION IF EXISTS get_daily_delivery_time_anomalies(numeric, numeric);

CREATE OR REPLACE FUNCTION get_daily_delivery_time_anomalies(
  p_max_minutes numeric DEFAULT 40,
  p_min_orders numeric DEFAULT 5
)
RETURNS TABLE (
  company_id text,
  company_name text,
  key_account_manager text,
  channel text,
  yesterday_avg_delivery_min numeric,
  yesterday_orders_with_time bigint,
  baseline_avg_delivery_min numeric,
  delivery_time_deviation_pct numeric,
  weeks_with_data bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  WITH
  active_companies AS (
    SELECT * FROM (
      SELECT DISTINCT ON (pk_id_company)
        pk_id_company, des_company_name, des_key_account_manager
      FROM crp_portal__dt_company
      WHERE COALESCE(flg_deleted, 0) != 1
        AND des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
      ORDER BY pk_id_company, pk_ts_month DESC
    ) deduped
  ),
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  yesterday_data AS (
    SELECT
      o.pfk_id_company AS cid,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      AVG(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0) AS avg_delivery_min,
      COUNT(*)::bigint AS orders_with_time
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    INNER JOIN crp_portal__dt_store s
      ON o.pfk_id_company = s.pfk_id_company
      AND o.pfk_id_store = s.pk_id_store
      AND s.pk_ts_month = date_trunc('month', current_timestamp)
    INNER JOIN crp_portal__dt_address a
      ON o.pfk_id_company = a.pfk_id_company
      AND o.pfk_id_store_address = a.pk_id_address
      AND a.pk_ts_month = date_trunc('month', current_timestamp)
    CROSS JOIN yesterday_date yd
    WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
      AND o.pfk_id_portal != 'E22BC362'
      AND s.flg_deleted = '0'
      AND a.flg_deleted = '0'
      AND o.ts_accepted IS NOT NULL
      AND o.ts_delivered IS NOT NULL
      AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0 BETWEEN 1 AND 179
    GROUP BY o.pfk_id_company,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  baseline_daily AS (
    SELECT
      o.pfk_id_company AS cid,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS order_date,
      AVG(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0) AS daily_avg_delivery_min
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    INNER JOIN crp_portal__dt_store s
      ON o.pfk_id_company = s.pfk_id_company
      AND o.pfk_id_store = s.pk_id_store
      AND s.pk_ts_month = date_trunc('month', current_timestamp)
    INNER JOIN crp_portal__dt_address a
      ON o.pfk_id_company = a.pfk_id_company
      AND o.pfk_id_store_address = a.pk_id_address
      AND a.pk_ts_month = date_trunc('month', current_timestamp)
    CROSS JOIN yesterday_date yd
    WHERE
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
      AND o.pfk_id_portal != 'E22BC362'
      AND s.flg_deleted = '0'
      AND a.flg_deleted = '0'
      AND o.ts_accepted IS NOT NULL
      AND o.ts_delivered IS NOT NULL
      AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0 BETWEEN 1 AND 179
    GROUP BY o.pfk_id_company,
      CASE
        WHEN o.pfk_id_portal = 'E22BC362-2' THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
  ),
  baseline AS (
    SELECT
      cid, ch,
      AVG(daily_avg_delivery_min) AS avg_delivery_min,
      COUNT(*)::bigint AS wks
    FROM baseline_daily
    GROUP BY cid, ch
  )
  SELECT
    y.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    y.ch AS channel,
    ROUND(y.avg_delivery_min::numeric, 1) AS yesterday_avg_delivery_min,
    y.orders_with_time AS yesterday_orders_with_time,
    ROUND(b.avg_delivery_min::numeric, 1) AS baseline_avg_delivery_min,
    CASE WHEN b.avg_delivery_min > 0 THEN
      ROUND((((y.avg_delivery_min - b.avg_delivery_min) / b.avg_delivery_min) * 100)::numeric, 1)
    ELSE NULL END AS delivery_time_deviation_pct,
    COALESCE(b.wks, 0)::bigint AS weeks_with_data
  FROM yesterday_data y
  LEFT JOIN baseline b ON y.cid = b.cid AND y.ch = b.ch
  LEFT JOIN active_companies ac ON ac.pk_id_company = y.cid
  WHERE
    y.orders_with_time >= p_min_orders
    AND y.avg_delivery_min > p_max_minutes
  ORDER BY y.avg_delivery_min DESC;
$$;

GRANT EXECUTE ON FUNCTION get_daily_delivery_time_anomalies(numeric, numeric) TO authenticated;
