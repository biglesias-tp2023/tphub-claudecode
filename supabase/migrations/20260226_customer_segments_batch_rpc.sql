-- ============================================
-- Migration: Customer Segments Batch RPC
-- Date: 2026-02-25
-- ============================================
-- Replaces 8 parallel calls to get_customer_segments with a single
-- batch call that processes all weeks sequentially in one connection.
--
-- Why: The individual RPC hits the 8-second statement timeout when
-- 8 instances run in parallel. The batch version:
-- 1. Uses a single connection (avoids parallel contention)
-- 2. PostgreSQL reuses buffer cache across iterations (lookback windows overlap ~97%)
-- 3. Sets statement_timeout to 120s for this specific function
-- ============================================

-- Covering index for the lookback JOIN (company + customer + time)
CREATE INDEX IF NOT EXISTS idx_ft_order_head_company_customer_time
  ON crp_portal__ft_order_head (pfk_id_company, cod_id_customer, td_creation_time);

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
LANGUAGE plpgsql
STABLE
SET statement_timeout = '120s'
AS $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..array_length(p_week_starts, 1) LOOP
    RETURN QUERY
    WITH week_customers AS (
      SELECT DISTINCT
        o.pfk_id_company,
        o.pfk_id_store,
        o.pfk_id_store_address,
        o.pfk_id_portal,
        o.cod_id_customer
      FROM crp_portal__ft_order_head o
      WHERE o.td_creation_time >= p_week_starts[i]
        AND o.td_creation_time <  p_week_ends[i]
        AND o.cod_id_customer IS NOT NULL
        AND o.pfk_id_company = ANY(p_company_ids)
    ),
    lookback AS (
      SELECT
        pfk_id_company,
        cod_id_customer,
        COUNT(*) AS prior_orders
      FROM crp_portal__ft_order_head
      WHERE td_creation_time >= (p_week_starts[i] - interval '183 days')
        AND td_creation_time <  p_week_starts[i]
        AND cod_id_customer IS NOT NULL
        AND pfk_id_company = ANY(p_company_ids)
      GROUP BY pfk_id_company, cod_id_customer
    ),
    classified AS (
      SELECT
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
        ON lb.cod_id_customer = wc.cod_id_customer
        AND lb.pfk_id_company = wc.pfk_id_company
    )
    SELECT
      i AS week_idx,
      c.pfk_id_company,
      c.pfk_id_store,
      c.pfk_id_store_address,
      c.pfk_id_portal,
      COUNT(*) FILTER (WHERE c.segment = 'new')        AS new_customers,
      COUNT(*) FILTER (WHERE c.segment = 'occasional') AS occasional_customers,
      COUNT(*) FILTER (WHERE c.segment = 'frequent')   AS frequent_customers
    FROM classified c
    GROUP BY
      c.pfk_id_company,
      c.pfk_id_store,
      c.pfk_id_store_address,
      c.pfk_id_portal;
  END LOOP;
END;
$$;
