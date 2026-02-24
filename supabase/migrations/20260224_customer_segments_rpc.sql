-- ============================================
-- Customer Segments RPC (v2 - optimized)
-- Classifies customers by order frequency over a 183-day lookback window.
--
-- Strategy: Two independent scans + hash join (avoids correlated LEFT JOIN)
-- 1. week_customers: single scan for target week
-- 2. lookback: single scan for 183-day window, pre-aggregated per customer
-- 3. Hash join on (company, customer) → classify → aggregate by dimensions
-- ============================================

-- Index on cod_id_customer for the lookback join
CREATE INDEX IF NOT EXISTS idx_ft_order_head_customer
  ON crp_portal__ft_order_head (cod_id_customer);

CREATE OR REPLACE FUNCTION get_customer_segments(
  p_company_ids text[],
  p_week_start  timestamp,
  p_week_end    timestamp
)
RETURNS TABLE (
  pfk_id_company       text,
  pfk_id_store         text,
  pfk_id_store_address text,
  pfk_id_portal        text,
  new_customers        bigint,
  occasional_customers bigint,
  frequent_customers   bigint
)
LANGUAGE sql STABLE
AS $$
  WITH week_customers AS (
    -- Unique customer per dimension combination in the target week
    SELECT DISTINCT
      o.pfk_id_company,
      o.pfk_id_store,
      o.pfk_id_store_address,
      o.pfk_id_portal,
      o.cod_id_customer
    FROM crp_portal__ft_order_head o
    WHERE o.td_creation_time >= p_week_start
      AND o.td_creation_time <  p_week_end
      AND o.cod_id_customer IS NOT NULL
      AND o.pfk_id_company = ANY(p_company_ids)
  ),
  lookback AS (
    -- Pre-aggregate order counts per customer in the 183-day window BEFORE the week
    -- Single sequential scan with GROUP BY (no correlated subquery)
    SELECT
      pfk_id_company,
      cod_id_customer,
      COUNT(*) AS prior_orders
    FROM crp_portal__ft_order_head
    WHERE td_creation_time >= (p_week_start - interval '183 days')
      AND td_creation_time <  p_week_start
      AND cod_id_customer IS NOT NULL
      AND pfk_id_company = ANY(p_company_ids)
    GROUP BY pfk_id_company, cod_id_customer
  ),
  classified AS (
    -- Hash join week_customers ↔ lookback, then classify
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
$$;
