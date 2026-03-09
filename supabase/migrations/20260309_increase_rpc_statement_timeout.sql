-- ============================================
-- Migration: Increase statement timeout for heavy RPCs
--
-- The previous timeout of 60s (20260304_rpc_statement_timeout.sql) is
-- being hit as the database grows. With the frontend now using smaller
-- batches (RPC_BATCH_SIZE 10→5) individual calls are lighter, but we
-- increase the safety margin to 120s to prevent transient timeouts
-- under load.
--
-- Date: 2026-03-09
-- ============================================

ALTER FUNCTION get_orders_aggregation(text[], text[], text[], text[], timestamp, timestamp)
  SET statement_timeout = '120s';

ALTER FUNCTION get_controlling_metrics(text[], timestamp, timestamp)
  SET statement_timeout = '120s';

ALTER FUNCTION get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp)
  SET statement_timeout = '120s';

-- Also ensure the customer segments batch has ample time
ALTER FUNCTION get_customer_segments_batch(text[], text[], text[])
  SET statement_timeout = '120s';
