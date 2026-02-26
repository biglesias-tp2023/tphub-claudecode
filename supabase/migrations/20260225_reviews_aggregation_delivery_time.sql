-- ============================================
-- Migration: 20260225_reviews_aggregation_delivery_time.sql
-- Description: Add avg_delivery_time_minutes to get_reviews_aggregation RPC
-- Date: 2026-02-25
--
-- Adds LEFT JOIN to ft_order_head to compute average delivery time per channel
-- directly in the aggregation RPC. This avoids the sequential raw→order-details
-- query pattern for the scorecard.
-- ============================================

DROP FUNCTION IF EXISTS get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp);

CREATE OR REPLACE FUNCTION get_reviews_aggregation(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  channel text,
  total_reviews bigint,
  avg_rating numeric,
  positive_reviews bigint,
  negative_reviews bigint,
  rating_1 bigint,
  rating_2 bigint,
  rating_3 bigint,
  rating_4 bigint,
  rating_5 bigint,
  avg_delivery_time_minutes numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END AS channel,
    COUNT(*)::bigint AS total_reviews,
    COALESCE(AVG(r.val_rating), 0) AS avg_rating,
    COUNT(*) FILTER (WHERE r.val_rating >= 4)::bigint AS positive_reviews,
    COUNT(*) FILTER (WHERE r.val_rating <= 2)::bigint AS negative_reviews,
    COUNT(*) FILTER (WHERE r.val_rating = 1)::bigint AS rating_1,
    COUNT(*) FILTER (WHERE r.val_rating = 2)::bigint AS rating_2,
    COUNT(*) FILTER (WHERE r.val_rating = 3)::bigint AS rating_3,
    COUNT(*) FILTER (WHERE r.val_rating = 4)::bigint AS rating_4,
    COUNT(*) FILTER (WHERE r.val_rating = 5)::bigint AS rating_5,
    AVG(
      CASE
        WHEN o.ts_accepted IS NOT NULL
         AND o.ts_delivered IS NOT NULL
         AND EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60 BETWEEN 1 AND 179
        THEN ROUND(EXTRACT(EPOCH FROM (o.ts_delivered - o.ts_accepted)) / 60)
        ELSE NULL
      END
    ) AS avg_delivery_time_minutes
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
  GROUP BY
    CASE
      WHEN r.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN r.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END;
$$;

GRANT EXECUTE ON FUNCTION get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;

COMMENT ON FUNCTION get_reviews_aggregation IS 'Returns pre-aggregated review metrics grouped by delivery channel (glovo/ubereats/other). Includes rating distribution (1-5), positive (>=4) and negative (<=2) counts, and average delivery time from order timestamps.';
