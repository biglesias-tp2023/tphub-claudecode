-- ============================================
-- VERIFY HIERARCHY DATA FOR CONTROLLING TABLE
-- ============================================
-- Execute these queries in Supabase SQL Editor to check
-- if addresses and portals have order data
-- ============================================

-- ============================================
-- 1. CHECK ADDRESSES BY COMPANY
-- ============================================
SELECT
  pfk_id_company as company_id,
  COUNT(*) as address_count
FROM crp_portal__dt_address
WHERE flg_deleted = false
GROUP BY pfk_id_company
ORDER BY address_count DESC;

-- ============================================
-- 2. CHECK ORDERS WITH ADDRESS
-- Shows orders that have pfk_id_store_address populated
-- ============================================
SELECT
  pfk_id_company as company_id,
  pfk_id_store_address as address_id,
  COUNT(*) as order_count,
  MIN(td_creation_time) as first_order,
  MAX(td_creation_time) as last_order
FROM crp_portal__ft_order_head
WHERE pfk_id_store_address IS NOT NULL
GROUP BY pfk_id_company, pfk_id_store_address
ORDER BY order_count DESC
LIMIT 30;

-- ============================================
-- 3. CHECK ORDERS BY PORTAL (CHANNEL)
-- ============================================
SELECT
  pfk_id_company as company_id,
  pfk_id_portal as portal_id,
  COUNT(*) as order_count,
  SUM(amt_total_price) as total_revenue
FROM crp_portal__ft_order_head
WHERE pfk_id_portal IS NOT NULL
GROUP BY pfk_id_company, pfk_id_portal
ORDER BY total_revenue DESC
LIMIT 30;

-- ============================================
-- 4. CHECK IF ADDRESSES HAVE MATCHING ORDERS
-- This is key: addresses only show if they have orders
-- ============================================
SELECT
  a.pk_id_address as address_id,
  a.des_address,
  a.pfk_id_company as company_id,
  COALESCE(o.order_count, 0) as order_count,
  COALESCE(o.total_revenue, 0) as total_revenue
FROM crp_portal__dt_address a
LEFT JOIN (
  SELECT
    pfk_id_store_address,
    COUNT(*) as order_count,
    SUM(amt_total_price) as total_revenue
  FROM crp_portal__ft_order_head
  WHERE td_creation_time >= NOW() - INTERVAL '30 days'
  GROUP BY pfk_id_store_address
) o ON a.pk_id_address = o.pfk_id_store_address
WHERE a.flg_deleted = false
ORDER BY order_count DESC
LIMIT 50;

-- ============================================
-- 5. CHECK PORTAL (CHANNEL) DIMENSION TABLE
-- ============================================
SELECT
  pk_id_portal as portal_id,
  des_portal as portal_name
FROM crp_portal__dt_portal
ORDER BY des_portal;

-- ============================================
-- 6. SUMMARY: Orders without address mapping
-- If this count is high, addresses won't show in hierarchy
-- ============================================
SELECT
  'Total orders' as metric,
  COUNT(*) as count
FROM crp_portal__ft_order_head
WHERE td_creation_time >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Orders WITH address' as metric,
  COUNT(*) as count
FROM crp_portal__ft_order_head
WHERE td_creation_time >= NOW() - INTERVAL '30 days'
AND pfk_id_store_address IS NOT NULL

UNION ALL

SELECT
  'Orders WITHOUT address' as metric,
  COUNT(*) as count
FROM crp_portal__ft_order_head
WHERE td_creation_time >= NOW() - INTERVAL '30 days'
AND pfk_id_store_address IS NULL;

-- ============================================
-- 7. CHECK A SPECIFIC COMPANY (replace ID)
-- ============================================
-- Replace 'YOUR_COMPANY_ID' with actual company ID

/*
SELECT
  a.pk_id_address,
  a.des_address,
  COUNT(o.pk_uuid_order) as order_count,
  SUM(o.amt_total_price) as revenue
FROM crp_portal__dt_address a
LEFT JOIN crp_portal__ft_order_head o
  ON a.pk_id_address = o.pfk_id_store_address
  AND o.td_creation_time >= NOW() - INTERVAL '30 days'
WHERE a.pfk_id_company = 'YOUR_COMPANY_ID'
  AND a.flg_deleted = false
GROUP BY a.pk_id_address, a.des_address
ORDER BY order_count DESC;
*/
