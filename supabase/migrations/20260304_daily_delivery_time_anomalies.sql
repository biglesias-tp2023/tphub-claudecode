-- ============================================
-- Migration: 20260304_daily_delivery_time_anomalies.sql
-- Description: RPC function for daily delivery time anomaly detection.
--   Alerts when average delivery time per restaurant/channel yesterday
--   exceeds an absolute threshold (default 40 minutes).
--   Delivery time = (ts_delivered - ts_accepted) in minutes,
--   filtered to valid range 1-179 min.
--
-- Date: 2026-03-04
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
  store_id text,
  store_name text,
  address_id text,
  address_name text,
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
  -- Yesterday delivery times (only valid: 1-179 min)
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
      AVG(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0) AS avg_delivery_min,
      COUNT(*)::bigint AS orders_with_time
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
      AND o.ts_accepted IS NOT NULL
      AND o.ts_delivered IS NOT NULL
      AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0 BETWEEN 1 AND 179
    GROUP BY o.pfk_id_company, o.pfk_id_store, o.pfk_id_store_address,
      CASE
        WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
        WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
        ELSE 'other'
      END
  ),
  -- Baseline: same day-of-week over previous 6 weeks
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
      AVG(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0) AS daily_avg_delivery_min
    FROM crp_portal__ft_order_head o
    INNER JOIN active_companies ac ON ac.pk_id_company = o.pfk_id_company
    CROSS JOIN yesterday_date yd
    WHERE
      (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
      AND EXTRACT(ISODOW FROM (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
      AND o.ts_accepted IS NOT NULL
      AND o.ts_delivered IS NOT NULL
      AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60.0 BETWEEN 1 AND 179
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
      AVG(daily_avg_delivery_min) AS avg_delivery_min,
      COUNT(*)::bigint AS wks
    FROM baseline_daily
    GROUP BY cid, sid, aid, ch
  )
  -- Final: filter by absolute threshold (avg > p_max_minutes)
  SELECT
    y.cid::text AS company_id,
    COALESCE(ac.des_company_name, 'Desconocida') AS company_name,
    ac.des_key_account_manager AS key_account_manager,
    y.sid::text AS store_id,
    COALESCE(s.des_store, 'Desconocida') AS store_name,
    y.aid::text AS address_id,
    COALESCE(addr.des_address, 'Desconocida') AS address_name,
    y.ch AS channel,
    ROUND(y.avg_delivery_min::numeric, 1) AS yesterday_avg_delivery_min,
    y.orders_with_time AS yesterday_orders_with_time,
    ROUND(b.avg_delivery_min::numeric, 1) AS baseline_avg_delivery_min,
    CASE
      WHEN b.avg_delivery_min > 0 THEN
        ROUND((((y.avg_delivery_min - b.avg_delivery_min) / b.avg_delivery_min) * 100)::numeric, 1)
      ELSE NULL
    END AS delivery_time_deviation_pct,
    COALESCE(b.wks, 0)::bigint AS weeks_with_data
  FROM yesterday_data y
  LEFT JOIN baseline b
    ON y.cid = b.cid AND y.sid = b.sid AND y.aid = b.aid AND y.ch = b.ch
  LEFT JOIN active_companies ac ON ac.pk_id_company = y.cid
  LEFT JOIN active_stores s ON s.pk_id_store = y.sid
  LEFT JOIN active_addresses addr ON addr.pk_id_address = y.aid
  WHERE
    y.orders_with_time >= p_min_orders
    AND y.avg_delivery_min > p_max_minutes
  ORDER BY y.avg_delivery_min DESC;
$$;

GRANT EXECUTE ON FUNCTION get_daily_delivery_time_anomalies(numeric, numeric) TO authenticated;

COMMENT ON FUNCTION get_daily_delivery_time_anomalies IS 'Detects delivery time anomalies: alerts when average delivery time per restaurant/channel yesterday exceeds threshold (default 40 min). Uses ts_accepted→ts_delivered, filters valid range 1-179 min. Includes baseline comparison (same day-of-week, 6 weeks) for context.';
