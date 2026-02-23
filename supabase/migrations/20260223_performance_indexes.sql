-- ============================================
-- Migration: 20260223_performance_indexes.sql
-- Description: Add composite indexes to CRP Portal fact tables
-- to prevent RPC timeouts (57014) on get_orders_aggregation
-- and get_controlling_metrics.
--
-- Tables affected (row counts as of 2026-02-23):
--   crp_portal__ft_order_head      ~1.5M rows (NO existing indexes)
--   crp_portal__ft_advertising_hp  ~58K rows  (NO existing indexes)
--   crp_portal__ft_review          (NO existing indexes)
--
-- Query patterns covered:
--   1. Filter by company + time range (get_controlling_metrics, daily anomalies)
--   2. Filter by time range only (get_orders_aggregation with NULL company)
--   3. Filter by company + time range on ads (get_controlling_metrics ads CTE)
--   4. Filter by company + time range on reviews (get_controlling_metrics review CTE)
--
-- Date: 2026-02-23
-- ============================================


-- ============================================
-- 1. crp_portal__ft_order_head indexes
-- ============================================

-- Primary composite: company + creation time
-- Covers: get_controlling_metrics, get_daily_order_anomalies, get_daily_promo_anomalies
CREATE INDEX IF NOT EXISTS idx_ft_order_head_company_time
  ON crp_portal__ft_order_head (pfk_id_company, td_creation_time);

-- Time-only index for unfiltered queries (p_company_ids IS NULL)
-- Covers: get_orders_aggregation when querying all companies
CREATE INDEX IF NOT EXISTS idx_ft_order_head_time
  ON crp_portal__ft_order_head (td_creation_time);


-- ============================================
-- 2. crp_portal__ft_advertising_hp indexes
-- ============================================

-- Primary composite: company + hour timestamp
-- Covers: get_controlling_metrics ads CTE, get_daily_ads_anomalies
CREATE INDEX IF NOT EXISTS idx_ft_advertising_hp_company_time
  ON crp_portal__ft_advertising_hp (pfk_id_company, pk_ts_hour);

-- Time-only index for unfiltered queries
-- Covers: get_orders_aggregation ads CTE when querying all companies
CREATE INDEX IF NOT EXISTS idx_ft_advertising_hp_time
  ON crp_portal__ft_advertising_hp (pk_ts_hour);


-- ============================================
-- 3. crp_portal__ft_review indexes
-- ============================================

-- Primary composite: company + creation time
-- Covers: get_controlling_metrics review CTE, get_daily_review_anomalies
CREATE INDEX IF NOT EXISTS idx_ft_review_company_time
  ON crp_portal__ft_review (pfk_id_company, ts_creation_time);

-- Time-only index for unfiltered queries
-- Covers: get_reviews_aggregation, get_reviews_heatmap
CREATE INDEX IF NOT EXISTS idx_ft_review_time
  ON crp_portal__ft_review (ts_creation_time);
