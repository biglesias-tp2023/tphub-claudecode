-- ============================================
-- Fix: get_customer_segments_batch column ambiguity
-- ============================================
-- PL/pgSQL treats RETURNS TABLE columns as local variables,
-- causing "column reference is ambiguous" errors.
-- Fix: rename output columns with out_ prefix to avoid clash.
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_segments_batch(
  p_company_ids  text[],
  p_week_starts  timestamp[],
  p_week_ends    timestamp[]
)
RETURNS TABLE (
  week_idx             int,
  pfk_id_company       text,
  pfk_id_store         text,
  pfk_id_store_address text,
  pfk_id_portal        text,
  new_customers        bigint,
  occasional_customers bigint,
  frequent_customers   bigint
)
LANGUAGE sql
STABLE
SET statement_timeout = '120s'
AS $$
  WITH week_series AS (
    SELECT
      idx,
      p_week_starts[idx] AS ws,
      p_week_ends[idx]   AS we
    FROM generate_series(1, array_length(p_week_starts, 1)) AS idx
  ),
  week_customers AS (
    SELECT DISTINCT
      s.idx,
      o.pfk_id_company,
      o.pfk_id_store,
      o.pfk_id_store_address,
      o.pfk_id_portal,
      o.cod_id_customer
    FROM week_series s
    JOIN crp_portal__ft_order_head o
      ON o.td_creation_time >= s.ws
     AND o.td_creation_time <  s.we
     AND o.cod_id_customer IS NOT NULL
     AND o.pfk_id_company = ANY(p_company_ids)
  ),
  lookback AS (
    SELECT
      s.idx,
      oh.pfk_id_company,
      oh.cod_id_customer,
      COUNT(*) AS prior_orders
    FROM week_series s
    JOIN crp_portal__ft_order_head oh
      ON oh.td_creation_time >= (s.ws - interval '183 days')
     AND oh.td_creation_time <  s.ws
     AND oh.cod_id_customer IS NOT NULL
     AND oh.pfk_id_company = ANY(p_company_ids)
    GROUP BY s.idx, oh.pfk_id_company, oh.cod_id_customer
  ),
  classified AS (
    SELECT
      wc.idx,
      wc.pfk_id_company,
      wc.pfk_id_store,
      wc.pfk_id_store_address,
      wc.pfk_id_portal,
      CASE
        WHEN COALESCE(lb.prior_orders, 0) = 0  THEN 'new'
        WHEN lb.prior_orders <= 3               THEN 'occasional'
        ELSE 'frequent'
      END AS segment
    FROM week_customers wc
    LEFT JOIN lookback lb
      ON lb.idx = wc.idx
     AND lb.cod_id_customer = wc.cod_id_customer
     AND lb.pfk_id_company = wc.pfk_id_company
  )
  SELECT
    c.idx                                                    AS week_idx,
    c.pfk_id_company                                         AS pfk_id_company,
    c.pfk_id_store                                           AS pfk_id_store,
    c.pfk_id_store_address                                   AS pfk_id_store_address,
    c.pfk_id_portal                                          AS pfk_id_portal,
    COUNT(*) FILTER (WHERE c.segment = 'new')::bigint        AS new_customers,
    COUNT(*) FILTER (WHERE c.segment = 'occasional')::bigint AS occasional_customers,
    COUNT(*) FILTER (WHERE c.segment = 'frequent')::bigint   AS frequent_customers
  FROM classified c
  GROUP BY c.idx, c.pfk_id_company, c.pfk_id_store, c.pfk_id_store_address, c.pfk_id_portal
  ORDER BY c.idx;
$$;
