-- ============================================================
-- RPC: get_product_sales (v2)
-- Adds promo_order_ratio: fraction of orders containing this product
-- that had amt_promotions > 0 on the order head.
-- Used to tag "promo products" when ratio >= 0.75.
-- ============================================================

-- Drop existing function first (return type changed — cannot use CREATE OR REPLACE alone)
DROP FUNCTION IF EXISTS get_product_sales(text[], text[], text[], text[], timestamp, timestamp);

CREATE OR REPLACE FUNCTION get_product_sales(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
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
AS $$
  SELECT
    ol.pk_id_product AS product_id,
    p.des_product AS product_name,
    (array_agg(ol.amt_unit_price ORDER BY ol.td_updated_at DESC))[1] AS unit_price,
    SUM(ol.val_quantity)::bigint AS total_quantity,
    SUM(ol.val_quantity * ol.amt_unit_price) AS total_revenue,
    -- Ratio of distinct orders with promotions > 0 vs total distinct orders
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
    SELECT DISTINCT ON (pk_id_product, pfk_id_company)
      pk_id_product, pfk_id_company::text AS pfk_id_company, des_product
    FROM crp_portal__dt_product
    WHERE flg_deleted = 0
    ORDER BY pk_id_product, pfk_id_company, pk_ts_month DESC
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
  ORDER BY total_revenue DESC;
$$;
