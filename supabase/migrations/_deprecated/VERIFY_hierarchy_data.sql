-- ============================================
-- DATA VERIFICATION: Hierarchical Table (Controlling)
-- ============================================
-- Run these queries to verify data exists for the
-- Address and Channel levels in the Controlling table
-- ============================================

-- 1. Verify addresses exist by company
SELECT
  'Addresses by Company' as query_name,
  pfk_id_company,
  COUNT(*) as address_count
FROM crp_portal__dt_address
WHERE flg_deleted = false OR flg_deleted IS NULL
GROUP BY pfk_id_company
ORDER BY address_count DESC
LIMIT 20;

-- 2. Verify orders exist with address data
SELECT
  'Orders with Address' as query_name,
  pfk_id_company,
  pfk_id_store_address,
  COUNT(*) as order_count,
  SUM(amt_total_price) as total_revenue
FROM crp_portal__ft_order_head
WHERE pfk_id_store_address IS NOT NULL
GROUP BY pfk_id_company, pfk_id_store_address
ORDER BY order_count DESC
LIMIT 20;

-- 3. Check for orders WITHOUT address (potential data issue)
SELECT
  'Orders WITHOUT Address' as query_name,
  pfk_id_company,
  COUNT(*) as order_count_no_address,
  MIN(td_creation_time) as earliest_order,
  MAX(td_creation_time) as latest_order
FROM crp_portal__ft_order_head
WHERE pfk_id_store_address IS NULL
GROUP BY pfk_id_company
ORDER BY order_count_no_address DESC;

-- 4. Verify portal/channel data exists in orders
SELECT
  'Orders by Portal/Channel' as query_name,
  pfk_id_company,
  pfk_id_portal,
  COUNT(*) as order_count,
  SUM(amt_total_price) as total_revenue
FROM crp_portal__ft_order_head
WHERE pfk_id_portal IS NOT NULL
GROUP BY pfk_id_company, pfk_id_portal
ORDER BY order_count DESC
LIMIT 30;

-- 5. Verify portal dimension table
SELECT
  'Portal Dimension Table' as query_name,
  pk_id_portal,
  des_portal,
  COUNT(*) OVER() as total_portals
FROM crp_portal__dt_portal
LIMIT 10;

-- 6. Cross-reference: addresses that HAVE orders vs addresses that DON'T
WITH addresses_with_orders AS (
  SELECT DISTINCT pfk_id_store_address
  FROM crp_portal__ft_order_head
  WHERE pfk_id_store_address IS NOT NULL
),
all_addresses AS (
  SELECT pk_id_address
  FROM crp_portal__dt_address
  WHERE flg_deleted = false OR flg_deleted IS NULL
)
SELECT
  'Address Order Coverage' as query_name,
  (SELECT COUNT(*) FROM all_addresses) as total_addresses,
  (SELECT COUNT(*) FROM addresses_with_orders) as addresses_with_orders,
  (SELECT COUNT(*) FROM all_addresses WHERE pk_id_address NOT IN (SELECT pfk_id_store_address FROM addresses_with_orders)) as addresses_without_orders;

-- 7. Sample: addresses with their order counts and revenue
SELECT
  'Top Addresses by Revenue' as query_name,
  a.pk_id_address,
  a.des_address,
  a.pfk_id_company,
  COUNT(o.pk_uuid_order) as order_count,
  SUM(o.amt_total_price) as total_revenue
FROM crp_portal__dt_address a
LEFT JOIN crp_portal__ft_order_head o ON a.pk_id_address = o.pfk_id_store_address
WHERE a.flg_deleted = false OR a.flg_deleted IS NULL
GROUP BY a.pk_id_address, a.des_address, a.pfk_id_company
ORDER BY total_revenue DESC NULLS LAST
LIMIT 20;

-- 8. Sample: Check date range of orders
SELECT
  'Order Date Range' as query_name,
  MIN(td_creation_time) as earliest_order,
  MAX(td_creation_time) as latest_order,
  COUNT(*) as total_orders,
  COUNT(DISTINCT DATE(td_creation_time)) as days_with_orders
FROM crp_portal__ft_order_head;

-- 9. Recent orders (last 30 days) - verify current data exists
SELECT
  'Recent Orders (30 days)' as query_name,
  DATE(td_creation_time) as order_date,
  COUNT(*) as order_count,
  SUM(amt_total_price) as daily_revenue
FROM crp_portal__ft_order_head
WHERE td_creation_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(td_creation_time)
ORDER BY order_date DESC
LIMIT 30;

-- ============================================
-- DIAGNOSIS SUMMARY
-- ============================================
-- If queries 1 & 2 return data: addresses and orders are linked correctly
-- If query 3 shows many orders without address: data quality issue
-- If query 6 shows addresses_without_orders > 0: some addresses have no sales
-- This is expected - those addresses won't appear in the hierarchy metrics
