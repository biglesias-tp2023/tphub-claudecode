-- ============================================
-- Migration: 20260222_daily_alerts_rpc.sql
-- Description: 4 RPC functions for daily anomaly detection:
--   1. get_daily_order_anomalies — Orders (pedidos)
--   2. get_daily_review_anomalies — Reviews (resenas)
--   3. get_daily_ads_anomalies — Advertising (publicidad)
--   4. get_daily_promo_anomalies — Promotions (descuentos/promos)
--
-- Each function compares yesterday's metrics against the
-- baseline of the same day-of-week over the previous 6 weeks.
--
-- Date: 2026-02-22
-- ============================================


-- ============================================
-- RPC 1: get_daily_order_anomalies
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
AS $$
  WITH
  -- Dedup dimension tables: keep latest snapshot, then filter deleted
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
  -- Yesterday in Europe/Madrid timezone
  yesterday_date AS (
    SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d
  ),
  -- Aggregate orders from yesterday per company/store/address/channel
  yesterday_data AS (
    SELECT
      o.pfk_id_company AS cid,
      o.pfk_id_store AS sid,
      o.pfk_id_store_address AS aid,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(o.amt_total_price), 0) AS total_revenue
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
    GROUP BY o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  -- Baseline: average of same day-of-week over previous 6 weeks
  baseline_daily AS (
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
      COUNT(*)::numeric AS daily_orders,
      COALESCE(SUM(o.amt_total_price), 0) AS daily_revenue
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
    GROUP BY o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
  ),
  baseline AS (
    SELECT
      cid, sid, aid, ch,
      AVG(daily_orders) AS avg_orders,
      AVG(daily_revenue) AS avg_revenue,
      COALESCE(STDDEV(daily_orders), 0) AS sd_orders,
      COUNT(*)::bigint AS wks
    FROM baseline_daily
    GROUP BY cid, sid, aid, ch
  ),
  -- Detect anomalies via FULL OUTER JOIN
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
  -- Final: join with dimension tables for readable names
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
    ROUND(a.avg_orders_baseline, 1) AS avg_orders_baseline,
    ROUND(a.avg_revenue_baseline, 2) AS avg_revenue_baseline,
    ROUND(a.stddev_orders, 1) AS stddev_orders,
    ROUND(a.orders_dev, 1) AS orders_deviation_pct,
    ROUND(a.revenue_dev, 1) AS revenue_deviation_pct,
    a.weeks_with_data
  FROM anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  LEFT JOIN active_stores s ON s.pk_id_store = a.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = a.aid
  ORDER BY a.orders_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_order_anomalies(numeric) TO authenticated;

COMMENT ON FUNCTION get_daily_order_anomalies IS 'Detects order anomalies: compares yesterday orders per restaurant/channel against baseline (same day-of-week, previous 6 weeks). Returns rows where deviation <= threshold (default -20%). Handles dimension dedup, company status filter, and timezone conversion.';


-- ============================================
-- RPC 2: get_daily_review_anomalies
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
  store_id text,
  store_name text,
  address_id text,
  address_name text,
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
  -- Reviews from yesterday (ft_review FKs are TEXT, cast to integer for joins)
  reviews_yesterday AS (
    SELECT
      r.pfk_id_company::integer AS cid,
      r.pfk_id_store::integer AS sid,
      r.pfk_id_store_address::integer AS aid,
      CASE
        WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COUNT(*)::bigint AS total_reviews,
      COALESCE(AVG(r.val_rating), 0) AS avg_rating,
      COUNT(*) FILTER (WHERE r.val_rating <= 2)::bigint AS negative_count,
      COUNT(*) FILTER (WHERE r.val_rating >= 4)::bigint AS positive_count
    FROM crp_portal__ft_review r
    INNER JOIN active_companies ac ON ac.pk_id_company = r.pfk_id_company::integer
    CROSS JOIN yesterday_date yd
    WHERE (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
    GROUP BY r.pfk_id_company::integer, r.pfk_id_store::integer, r.pfk_id_store_address::integer,
      CASE
        WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  -- Baseline: same day-of-week over previous 6 weeks
  reviews_baseline_daily AS (
    SELECT
      r.pfk_id_company::integer AS cid,
      r.pfk_id_store::integer AS sid,
      r.pfk_id_store_address::integer AS aid,
      CASE
        WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date AS review_date,
      COUNT(*)::numeric AS daily_reviews,
      COALESCE(AVG(r.val_rating), 0) AS daily_avg_rating,
      COUNT(*) FILTER (WHERE r.val_rating <= 2)::numeric AS daily_negative_count
    FROM crp_portal__ft_review r
    INNER JOIN active_companies ac ON ac.pk_id_company = r.pfk_id_company::integer
    CROSS JOIN yesterday_date yd
    WHERE
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
    GROUP BY r.pfk_id_company::integer, r.pfk_id_store::integer, r.pfk_id_store_address::integer,
      CASE
        WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (r.ts_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
  ),
  reviews_baseline AS (
    SELECT
      cid, sid, aid, ch,
      AVG(daily_avg_rating) AS avg_rating,
      AVG(daily_negative_count) AS avg_negative_count,
      AVG(daily_reviews) AS avg_reviews,
      COUNT(*)::bigint AS wks
    FROM reviews_baseline_daily
    GROUP BY cid, sid, aid, ch
  ),
  -- Detect anomalies
  review_anomalies AS (
    SELECT
      y.cid, y.sid, y.aid, y.ch,
      y.total_reviews,
      y.avg_rating AS y_avg_rating,
      y.negative_count AS y_negative_count,
      b.avg_rating AS b_avg_rating,
      b.avg_negative_count AS b_avg_negative_count,
      b.wks,
      -- Anomaly type detection (priority order)
      CASE
        -- Low rating: yesterday avg < threshold AND baseline was good (>= 4.0)
        WHEN y.avg_rating < p_rating_threshold AND b.avg_rating >= 4.0
          THEN 'low_rating'
        -- Negative spike: negative count yesterday >> baseline average
        WHEN b.avg_negative_count > 0
          AND y.negative_count::numeric > b.avg_negative_count * (1 + p_negative_spike_pct / 100.0)
          THEN 'negative_spike'
        -- Rating drop: significant drop from baseline
        WHEN b.avg_rating > 0
          AND ((y.avg_rating - b.avg_rating) / b.avg_rating) * 100 <= -10
          THEN 'rating_drop'
        ELSE NULL
      END AS atype,
      -- Deviation metrics
      CASE
        WHEN b.avg_rating > 0 THEN
          ROUND(((y.avg_rating - b.avg_rating) / b.avg_rating) * 100, 1)
        ELSE NULL
      END AS rating_dev,
      CASE
        WHEN b.avg_negative_count > 0 THEN
          ROUND(((y.negative_count::numeric - b.avg_negative_count) / b.avg_negative_count) * 100, 1)
        ELSE NULL
      END AS neg_spike
    FROM reviews_yesterday y
    INNER JOIN reviews_baseline b
      ON y.cid = b.cid AND y.sid = b.sid AND y.aid = b.aid AND y.ch = b.ch
    WHERE
      b.wks >= 3
      AND y.total_reviews >= p_min_reviews
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
    a.total_reviews AS yesterday_reviews,
    ROUND(a.y_avg_rating, 2) AS yesterday_avg_rating,
    a.y_negative_count AS yesterday_negative_count,
    ROUND(a.b_avg_rating, 2) AS baseline_avg_rating,
    ROUND(a.b_avg_negative_count, 1) AS baseline_avg_negative_count,
    a.rating_dev AS rating_deviation_pct,
    a.neg_spike AS negative_spike_pct,
    a.wks AS weeks_with_data
  FROM review_anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  LEFT JOIN active_stores s ON s.pk_id_store = a.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = a.aid
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype
      WHEN 'low_rating' THEN 1
      WHEN 'negative_spike' THEN 2
      WHEN 'rating_drop' THEN 3
    END,
    a.rating_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_review_anomalies(numeric, numeric, numeric) TO authenticated;

COMMENT ON FUNCTION get_daily_review_anomalies IS 'Detects review anomalies: compares yesterday reviews per restaurant/channel against baseline (same day-of-week, previous 6 weeks). Detects low ratings, negative review spikes, and rating drops. Requires minimum review count to avoid noise.';


-- ============================================
-- RPC 3: get_daily_ads_anomalies
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
  store_id text,
  store_name text,
  address_id text,
  address_name text,
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
  -- Ads from yesterday (ft_advertising_hp FKs are TEXT, cast to integer for joins)
  ads_yesterday AS (
    SELECT
      a.pfk_id_company::integer AS cid,
      a.pfk_id_store::integer AS sid,
      a.pfk_id_store_address::integer AS aid,
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COALESCE(SUM(a.amt_ad_spent), 0) AS total_ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS total_ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::bigint AS total_impressions,
      COALESCE(SUM(a.val_clicks), 0)::bigint AS total_clicks,
      COALESCE(SUM(a.val_orders), 0)::bigint AS total_ad_orders
    FROM crp_portal__ft_advertising_hp a
    INNER JOIN active_companies ac ON ac.pk_id_company = a.pfk_id_company::integer
    CROSS JOIN yesterday_date yd
    WHERE (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date = yd.d
    GROUP BY a.pfk_id_company::integer, a.pfk_id_store::integer, a.pfk_id_store_address::integer,
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  -- Baseline: same day-of-week over previous 6 weeks
  ads_baseline_daily AS (
    SELECT
      a.pfk_id_company::integer AS cid,
      a.pfk_id_store::integer AS sid,
      a.pfk_id_store_address::integer AS aid,
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date AS ad_date,
      COALESCE(SUM(a.amt_ad_spent), 0) AS daily_ad_spent,
      COALESCE(SUM(a.amt_revenue), 0) AS daily_ad_revenue,
      COALESCE(SUM(a.val_impressions), 0)::numeric AS daily_impressions,
      COALESCE(SUM(a.val_clicks), 0)::numeric AS daily_clicks,
      COALESCE(SUM(a.val_orders), 0)::numeric AS daily_ad_orders
    FROM crp_portal__ft_advertising_hp a
    INNER JOIN active_companies ac ON ac.pk_id_company = a.pfk_id_company::integer
    CROSS JOIN yesterday_date yd
    WHERE
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
    GROUP BY a.pfk_id_company::integer, a.pfk_id_store::integer, a.pfk_id_store_address::integer,
      CASE
        WHEN a.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN a.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (a.pk_ts_hour AT TIME ZONE 'Europe/Madrid')::date
  ),
  ads_baseline AS (
    SELECT
      cid, sid, aid, ch,
      AVG(daily_ad_spent) AS avg_ad_spent,
      AVG(daily_ad_revenue) AS avg_ad_revenue,
      AVG(CASE WHEN daily_ad_spent > 0 THEN daily_ad_revenue / daily_ad_spent ELSE NULL END) AS avg_roas,
      AVG(daily_impressions) AS avg_impressions,
      COUNT(*)::bigint AS wks
    FROM ads_baseline_daily
    GROUP BY cid, sid, aid, ch
  ),
  -- Detect anomalies
  ads_anomalies AS (
    SELECT
      y.cid, y.sid, y.aid, y.ch,
      y.total_ad_spent,
      y.total_ad_revenue,
      CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END AS y_roas,
      y.total_impressions,
      y.total_clicks,
      y.total_ad_orders,
      b.avg_ad_spent,
      b.avg_roas,
      b.avg_impressions,
      b.wks,
      -- Anomaly type detection (priority order)
      CASE
        -- Low ROAS: spending but poor return
        WHEN y.total_ad_spent >= p_spend_threshold
          AND y.total_ad_spent > 0
          AND (y.total_ad_revenue / y.total_ad_spent) < p_roas_threshold
          THEN 'low_roas'
        -- Spend spike: spending much more than baseline but ROAS dropped
        WHEN b.avg_ad_spent > 0
          AND y.total_ad_spent > b.avg_ad_spent * (1 + p_spend_deviation_pct / 100.0)
          AND b.avg_roas IS NOT NULL AND b.avg_roas > 0
          AND (CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END) < b.avg_roas * 0.8
          THEN 'spend_spike'
        -- Impressions drop: visibility crashed (>50% drop)
        WHEN b.avg_impressions > 0
          AND y.total_impressions::numeric < b.avg_impressions * 0.5
          AND y.total_ad_spent >= p_spend_threshold
          THEN 'impressions_drop'
        ELSE NULL
      END AS atype,
      -- Deviation metrics
      CASE
        WHEN b.avg_roas IS NOT NULL AND b.avg_roas > 0 THEN
          ROUND(((CASE WHEN y.total_ad_spent > 0 THEN y.total_ad_revenue / y.total_ad_spent ELSE 0 END - b.avg_roas) / b.avg_roas) * 100, 1)
        ELSE NULL
      END AS roas_dev,
      CASE
        WHEN b.avg_ad_spent > 0 THEN
          ROUND(((y.total_ad_spent - b.avg_ad_spent) / b.avg_ad_spent) * 100, 1)
        ELSE NULL
      END AS spend_dev,
      CASE
        WHEN b.avg_impressions > 0 THEN
          ROUND(((y.total_impressions::numeric - b.avg_impressions) / b.avg_impressions) * 100, 1)
        ELSE NULL
      END AS impressions_dev
    FROM ads_yesterday y
    INNER JOIN ads_baseline b
      ON y.cid = b.cid AND y.sid = b.sid AND y.aid = b.aid AND y.ch = b.ch
    WHERE
      b.wks >= 3
      AND y.total_ad_spent >= p_spend_threshold
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
    ROUND(a.total_ad_spent, 2) AS yesterday_ad_spent,
    ROUND(a.total_ad_revenue, 2) AS yesterday_ad_revenue,
    ROUND(a.y_roas, 2) AS yesterday_roas,
    a.total_impressions AS yesterday_impressions,
    a.total_clicks AS yesterday_clicks,
    a.total_ad_orders AS yesterday_ad_orders,
    ROUND(a.avg_ad_spent, 2) AS baseline_avg_ad_spent,
    ROUND(a.avg_roas, 2) AS baseline_avg_roas,
    ROUND(a.avg_impressions, 0) AS baseline_avg_impressions,
    a.roas_dev AS roas_deviation_pct,
    a.spend_dev AS spend_deviation_pct,
    a.impressions_dev AS impressions_deviation_pct,
    a.wks AS weeks_with_data
  FROM ads_anomalies a
  LEFT JOIN active_companies ac ON ac.pk_id_company = a.cid
  LEFT JOIN active_stores s ON s.pk_id_store = a.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = a.aid
  WHERE a.atype IS NOT NULL
  ORDER BY
    CASE a.atype
      WHEN 'low_roas' THEN 1
      WHEN 'spend_spike' THEN 2
      WHEN 'impressions_drop' THEN 3
    END,
    a.roas_dev ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_daily_ads_anomalies(numeric, numeric, numeric) TO authenticated;

COMMENT ON FUNCTION get_daily_ads_anomalies IS 'Detects advertising anomalies: compares yesterday ads metrics per restaurant/channel against baseline (same day-of-week, previous 6 weeks). Detects low ROAS, spend spikes without returns, and impressions drops. Requires minimum spend to avoid noise.';


-- ============================================
-- RPC 4: get_daily_promo_anomalies
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
  -- Promo data from yesterday (same table as orders: ft_order_head, integer FKs)
  promos_yesterday AS (
    SELECT
      o.pfk_id_company AS cid,
      o.pfk_id_store AS sid,
      o.pfk_id_store_address AS aid,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END AS ch,
      COUNT(*)::bigint AS total_orders,
      COALESCE(SUM(o.amt_total_price), 0) AS total_revenue,
      COALESCE(SUM(o.amt_promotions), 0) AS total_promos,
      CASE
        WHEN SUM(o.amt_total_price) > 0
        THEN (COALESCE(SUM(o.amt_promotions), 0) / SUM(o.amt_total_price)) * 100
        ELSE 0
      END AS promo_rate
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
    GROUP BY o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  -- Baseline: same day-of-week over previous 6 weeks
  promos_baseline_daily AS (
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
      COALESCE(SUM(o.amt_total_price), 0) AS daily_revenue,
      COALESCE(SUM(o.amt_promotions), 0) AS daily_promos,
      CASE
        WHEN SUM(o.amt_total_price) > 0
        THEN (COALESCE(SUM(o.amt_promotions), 0) / SUM(o.amt_total_price)) * 100
        ELSE 0
      END AS daily_promo_rate
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
    GROUP BY o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END,
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
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
  -- Detect anomalies
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
      -- Anomaly type detection (priority order)
      CASE
        -- High promo rate: yesterday rate > threshold AND baseline was significantly lower
        WHEN y.promo_rate > p_promo_rate_threshold
          AND b.avg_promo_rate < p_promo_rate_threshold
          THEN 'high_promo_rate'
        -- Promo spend spike: spending much more on promos than baseline
        WHEN b.avg_promos > 0
          AND y.total_promos > b.avg_promos * (1 + p_promo_spike_pct / 100.0)
          THEN 'promo_spike'
        -- Promo rate spike: rate jumped significantly even if baseline was already >0
        WHEN b.avg_promo_rate > 0
          AND ((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100 > p_promo_spike_pct
          THEN 'promo_rate_spike'
        ELSE NULL
      END AS atype,
      -- Deviation metrics
      CASE
        WHEN b.avg_promo_rate > 0 THEN
          ROUND(((y.promo_rate - b.avg_promo_rate) / b.avg_promo_rate) * 100, 1)
        ELSE NULL
      END AS promo_rate_dev,
      CASE
        WHEN b.avg_promos > 0 THEN
          ROUND(((y.total_promos - b.avg_promos) / b.avg_promos) * 100, 1)
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
    ROUND(a.total_revenue, 2) AS yesterday_revenue,
    ROUND(a.total_promos, 2) AS yesterday_promos,
    ROUND(a.y_promo_rate, 1) AS yesterday_promo_rate,
    ROUND(a.avg_promos, 2) AS baseline_avg_promos,
    ROUND(a.avg_promo_rate, 1) AS baseline_avg_promo_rate,
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

COMMENT ON FUNCTION get_daily_promo_anomalies IS 'Detects promotion anomalies: compares yesterday promo metrics (amt_promotions from ft_order_head) per restaurant/channel against baseline (same day-of-week, previous 6 weeks). Detects high promo rates, promo spend spikes, and promo rate spikes. Requires minimum orders to avoid noise.';
