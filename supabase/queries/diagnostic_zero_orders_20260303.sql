-- ============================================
-- Diagnóstico: restaurantes con "0 pedidos" en alerta del 3 marzo
-- ¿Son reales los 0 o es ruido por volumen bajo?
--
-- Ejecutar en Supabase SQL Editor.
-- Muestra para cada empresa+canal alertada con "0 pedidos":
--   - Pedidos reales del 3 marzo (ayer)
--   - Media de pedidos de los martes anteriores (6 semanas)
--   - Si realmente es anómalo o es ruido (media < 3 pedidos)
--
-- Date: 2026-03-04
-- ============================================

WITH yesterday AS (
  SELECT '2026-03-03'::date AS d
),
-- Pedidos del 3 marzo por company + channel
yesterday_orders AS (
  SELECT
    o.pfk_id_company,
    CASE
      WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END AS channel,
    COUNT(*) AS orders_yesterday,
    COALESCE(SUM(o.amt_total_price), 0) AS revenue_yesterday
  FROM crp_portal__ft_order_head o, yesterday yd
  WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date = yd.d
  GROUP BY 1, 2
),
-- Baseline: martes anteriores (6 semanas)
baseline AS (
  SELECT
    o.pfk_id_company,
    CASE
      WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
      WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
      ELSE 'other'
    END AS channel,
    COUNT(DISTINCT (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date) AS days_with_data,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date), 0), 1) AS avg_daily_orders,
    ROUND(AVG(o.amt_total_price)::numeric, 2) AS avg_ticket
  FROM crp_portal__ft_order_head o, yesterday yd
  WHERE (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date
        BETWEEN (yd.d - 42) AND (yd.d - 1)
    AND EXTRACT(ISODOW FROM (o.td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date)
        = EXTRACT(ISODOW FROM yd.d)
  GROUP BY 1, 2
),
-- Nombres de dimensiones
companies AS (
  SELECT DISTINCT ON (pk_id_company) pk_id_company, des_company_name
  FROM crp_portal__dt_company
  ORDER BY pk_id_company, pk_ts_month DESC
)
SELECT
  COALESCE(c.des_company_name, 'Desconocida') AS empresa,
  COALESCE(b.channel, y.channel) AS canal,
  COALESCE(y.orders_yesterday, 0) AS pedidos_3mar,
  b.avg_daily_orders AS media_martes,
  b.days_with_data AS martes_con_datos,
  CASE
    WHEN b.avg_daily_orders IS NULL THEN 'SIN BASELINE'
    WHEN b.avg_daily_orders < 3 THEN 'RUIDO (media<3)'
    WHEN COALESCE(y.orders_yesterday, 0) = 0 THEN 'REAL 0 PEDIDOS'
    ELSE 'OK'
  END AS diagnostico
FROM baseline b
FULL OUTER JOIN yesterday_orders y
  ON b.pfk_id_company = y.pfk_id_company
  AND b.channel = y.channel
LEFT JOIN companies c ON c.pk_id_company = COALESCE(b.pfk_id_company, y.pfk_id_company)
WHERE COALESCE(y.orders_yesterday, 0) = 0
  AND b.avg_daily_orders > 0
ORDER BY b.avg_daily_orders DESC NULLS LAST;
