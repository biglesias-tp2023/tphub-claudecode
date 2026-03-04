-- Increase statement timeout for heavy RPC functions that process
-- many companies at once. Default Supabase timeout (~8s) is too short
-- when batch size is 20 companies over a 30-day date range.
--
-- Pattern: same as get_customer_segments_batch (SET statement_timeout = '120s')
-- Using 60s here — enough for 20-company batches without being excessive.

ALTER FUNCTION get_orders_aggregation(text[], text[], text[], text[], timestamp, timestamp)
  SET statement_timeout = '60s';

ALTER FUNCTION get_controlling_metrics(text[], timestamp, timestamp)
  SET statement_timeout = '60s';

ALTER FUNCTION get_reviews_aggregation(text[], text[], text[], text[], timestamp, timestamp)
  SET statement_timeout = '60s';
