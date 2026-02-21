-- ============================================
-- Migration: 20260220_reviews_aggregation_rpc.sql
-- Description: RPC functions for reviews aggregation and heatmap
-- Date: 2026-02-20
--
-- Provides server-side aggregation of crp_portal__ft_review data
-- instead of downloading all 80K+ rows to the browser.
-- ============================================

-- ============================================
-- RPC 1: get_reviews_aggregation
-- ============================================

DROP FUNCTION IF EXISTS get_reviews_aggregation;

/**
 * RPC Function: get_reviews_aggregation
 *
 * Returns pre-aggregated review metrics grouped by delivery channel.
 * Maps portal IDs to channel names:
 *   - E22BC362, E22BC362-2 → 'glovo'
 *   - 3CCD6861 → 'ubereats'
 *   - everything else → 'other'
 *
 * Parameters:
 *   p_company_ids: Array of company IDs (NULL = no filter)
 *   p_brand_ids: Array of brand/store IDs (NULL = no filter)
 *   p_address_ids: Array of address IDs (NULL = no filter)
 *   p_channel_portal_ids: Array of portal IDs to filter (NULL = all channels)
 *   p_start_date: Start timestamp
 *   p_end_date: End timestamp
 *
 * Returns one row per channel with:
 *   channel: 'glovo' | 'ubereats' | 'other'
 *   total_reviews: COUNT(*)
 *   avg_rating: AVG(val_rating)
 *   positive_reviews: COUNT where val_rating >= 4
 *   negative_reviews: COUNT where val_rating <= 2
 *   rating_1..rating_5: Distribution counts
 */
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
  rating_5 bigint
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
    COUNT(*) FILTER (WHERE r.val_rating = 5)::bigint AS rating_5
  FROM crp_portal__ft_review r
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

COMMENT ON FUNCTION get_reviews_aggregation IS 'Returns pre-aggregated review metrics grouped by delivery channel (glovo/ubereats/other). Includes rating distribution (1-5), positive (>=4) and negative (<=2) counts.';

-- ============================================
-- RPC 2: get_reviews_heatmap
-- ============================================

DROP FUNCTION IF EXISTS get_reviews_heatmap;

/**
 * RPC Function: get_reviews_heatmap
 *
 * Returns negative reviews (rating <= 2) grouped by day of week and hour.
 * Used for the heatmap visualization in the Reputation dashboard.
 *
 * Day of week: 0=Monday, 6=Sunday (ISO standard)
 * Hour: 0-23
 */
CREATE OR REPLACE FUNCTION get_reviews_heatmap(
  p_company_ids text[],
  p_brand_ids text[],
  p_address_ids text[],
  p_channel_portal_ids text[],
  p_start_date timestamp,
  p_end_date timestamp
)
RETURNS TABLE (
  day_of_week integer,
  hour_of_day integer,
  review_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- EXTRACT(ISODOW ...) returns 1=Mon..7=Sun, we want 0=Mon..6=Sun
    (EXTRACT(ISODOW FROM r.ts_creation_time)::integer - 1) AS day_of_week,
    EXTRACT(HOUR FROM r.ts_creation_time)::integer AS hour_of_day,
    COUNT(*)::bigint AS review_count
  FROM crp_portal__ft_review r
  WHERE
    r.val_rating <= 2
    AND r.ts_creation_time >= p_start_date
    AND r.ts_creation_time <= p_end_date
    AND (p_company_ids IS NULL OR r.pfk_id_company::text = ANY(p_company_ids))
    AND (p_brand_ids IS NULL OR r.pfk_id_store::text = ANY(p_brand_ids))
    AND (p_address_ids IS NULL OR r.pfk_id_store_address::text = ANY(p_address_ids))
    AND (p_channel_portal_ids IS NULL OR r.pfk_id_portal = ANY(p_channel_portal_ids))
  GROUP BY
    (EXTRACT(ISODOW FROM r.ts_creation_time)::integer - 1),
    EXTRACT(HOUR FROM r.ts_creation_time)::integer;
$$;

GRANT EXECUTE ON FUNCTION get_reviews_heatmap(text[], text[], text[], text[], timestamp, timestamp) TO authenticated;

COMMENT ON FUNCTION get_reviews_heatmap IS 'Returns negative reviews (rating <= 2) grouped by day of week (0=Mon) and hour (0-23) for heatmap visualization.';
