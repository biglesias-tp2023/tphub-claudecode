-- ============================================================
-- Migration: Fix product sales timeout + add LIMIT parameter
--
-- Problem: get_product_sales had no statement_timeout (default ~8s)
-- while other RPCs have 120s. For addresses with many orders,
-- the query times out silently and products don't show in reports.
--
-- Fixes:
-- 1. Add p_limit parameter (default 100) to avoid computing ALL products
--    when only top 5 are needed — massive speedup.
-- 2. Set statement_timeout = 120s to match other RPCs.
-- 3. Add index on ft_order_line for faster company+portal lookups.
--
-- Date: 2026-03-19
-- ============================================================

-- Drop existing function (signature changes — new parameter)
DROP FUNCTION IF EXISTS get_product_sales(text[], text[], text[], text[], timestamp, timestamp);

CREATE OR REPLACE FUNCTION get_product_sales(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  product_id text,
  product_name text,
  unit_price numeric,
  total_quantity bigint,
  total_revenue numeric,
  promo_order_ratio numeric
)
LANGUAGE sql STABLE
SET statement_timeout = '120s'
AS $$
  SELECT
    ol.pk_id_product AS product_id,
    p.des_product AS product_name,
    (array_agg(ol.amt_unit_price ORDER BY ol.td_updated_at DESC))[1] AS unit_price,
    SUM(ol.val_quantity)::bigint AS total_quantity,
    SUM(ol.val_quantity * ol.amt_unit_price) AS total_revenue,
    CASE
      WHEN COUNT(DISTINCT ol.pk_id_order) = 0 THEN 0
      ELSE COUNT(DISTINCT CASE WHEN COALESCE(oh.amt_promotions, 0) > 0 THEN ol.pk_id_order END)::numeric
           / COUNT(DISTINCT ol.pk_id_order)::numeric
    END AS promo_order_ratio
  FROM crp_portal__ft_order_line ol
  INNER JOIN crp_portal__ft_order_head oh
    ON ol.pk_id_order = oh.pk_uuid_order
    AND ol.pfk_id_company = oh.pfk_id_company::text
  INNER JOIN (
    SELECT DISTINCT ON (dp.pk_id_product, dp.pfk_id_company)
      dp.pk_id_product, dp.pfk_id_company::text AS pfk_id_company, dp.des_product
    FROM crp_portal__dt_product dp
    WHERE dp.flg_deleted = 0
    ORDER BY dp.pk_id_product, dp.pfk_id_company, dp.pk_ts_month DESC
  ) p
    ON ol.pk_id_product = p.pk_id_product
    AND ol.pfk_id_company = p.pfk_id_company
  WHERE
    oh.td_creation_time >= p_start_date
    AND oh.td_creation_time <= p_end_date
    AND (p_company_ids IS NULL OR ol.pfk_id_company = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR oh.pfk_id_store::text = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR oh.pfk_id_store_address::text = ANY(p_address_ids))
    AND (p_portal_ids IS NULL OR ol.pfk_id_portal = ANY(p_portal_ids))
    AND ol.pk_id_product IS NOT NULL
  GROUP BY ol.pk_id_product, p.des_product
  ORDER BY total_revenue DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_product_sales(text[], text[], text[], text[], timestamp, timestamp, int) TO authenticated;

-- Index to speed up order_line lookups by company + portal
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ft_order_line_company_portal
  ON crp_portal__ft_order_line (pfk_id_company, pfk_id_portal);
