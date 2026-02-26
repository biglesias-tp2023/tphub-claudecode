-- ============================================
-- Migration: 20260225_reviews_raw_rpc.sql
-- Description: RPC function for fetching raw reviews with order details (JOIN)
-- Date: 2026-02-25
--
-- Replaces the 2-query pattern (fetch reviews → fetch order details) with a
-- single RPC that JOINs ft_review with ft_order_head to return delivery time,
-- refund amount, and order total alongside each review.
-- ============================================

DROP FUNCTION IF EXISTS get_reviews_raw;

/**
 * RPC Function: get_reviews_raw
 *
 * Returns raw review records with order details via LEFT JOIN to ft_order_head.
 * Calculates delivery_time_minutes server-side from ts_accepted/ts_delivered.
 *
 * Parameters:
 *   p_company_ids: Array of company IDs (NULL = no filter)
 *   p_brand_ids: Array of brand/store IDs (NULL = no filter)
 *   p_address_ids: Array of address IDs (NULL = no filter)
 *   p_channel_portal_ids: Array of portal IDs to filter (NULL = all channels)
 *   p_start_date: Start timestamp
 *   p_end_date: End timestamp
 *   p_limit: Maximum number of rows to return (default 200)
 *
 * Returns review fields plus:
 *   delivery_time_minutes: ROUND((ts_delivered - ts_accepted) / 60), filtered 1-179 min
 *   amt_refunds: Refund amount from the order (NULL if no order match)
 *   amt_total_price: Total order price (NULL if no order match)
 */
CREATE OR REPLACE FUNCTION get_reviews_raw(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  pk_id_review text,
  fk_id_order text,
  pfk_id_company text,
  pfk_id_store text,
  pfk_id_store_address text,
  pfk_id_portal text,
  ts_creation_time timestamp,
  val_rating smallint,
  txt_comment text,
  delivery_time_minutes integer,
  amt_refunds numeric,
  amt_total_price numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.pk_id_review::text,
    r.fk_id_order::text,
    r.pfk_id_company::text,
    r.pfk_id_store::text,
    r.pfk_id_store_address::text,
    r.pfk_id_portal::text,
    r.ts_creation_time,
    r.val_rating,
    r.txt_comment,
    CASE
      WHEN o.ts_accepted IS NOT NULL
       AND o.ts_delivered IS NOT NULL
       AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60 BETWEEN 1 AND 179
      THEN ROUND(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60)::integer
      ELSE NULL
    END AS delivery_time_minutes,
    o.amt_refunds,
    o.amt_total_price
  FROM crp_portal__ft_review r
  LEFT JOIN crp_portal__ft_order_head o
    ON r.fk_id_order = o.pk_uuid_order
  WHERE
    r.ts_creation_time >= p_start_date
    AND r.ts_creation_time <= p_end_date
    AND (p_company_ids IS NULL OR r.pfk_id_company::text = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR r.pfk_id_store::text = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR r.pfk_id_store_address::text = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR r.pfk_id_portal = ANY(p_channel_portal_ids))
  ORDER BY r.ts_creation_time DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_reviews_raw(text[], text[], text[], text[], timestamp, timestamp, integer) TO authenticated;

COMMENT ON FUNCTION get_reviews_raw IS 'Returns raw review records with order details (delivery time, refunds, total price) via LEFT JOIN to ft_order_head. Replaces the sequential 2-query pattern.';
