# Prompt para Claude Code — Sistema de Alertas Diarias ThinkPaladar

## Instrucciones de uso

1. Abre Claude Code en el directorio raiz de TPHub
2. Copia todo el bloque de abajo (desde "---INICIO DEL PROMPT---" hasta "---FIN DEL PROMPT---")
3. Reemplaza las secciones marcadas con `[COMPLETAR]` con tu informacion real
4. Pega el prompt completo en Claude Code

---INICIO DEL PROMPT---

## Contexto del proyecto

Estoy construyendo un sistema de alertas diarias para TPHub, nuestra plataforma interna de BI para consultores de delivery (restaurantes en Glovo, UberEats, JustEat en Espana). El proyecto TPHub ya existe y usa:

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7
- **Backend/DB**: Supabase (PostgreSQL)
- **Hosting**: Vercel (SPA con `vercel.json` que hace rewrite a `index.html`)
- **Datos**: Pedidos diarios de restaurantes por canal almacenados en Supabase

## Que quiero construir (MVP)

Un sistema que cada manana (L-V, 7:30h CET) compare los pedidos de AYER de cada restaurante/canal contra la media de los mismos dias de la semana durante las 6 semanas anteriores. Si la desviacion es mayor al 20%, envia una alerta por Slack agrupada por consultor responsable.

## Arquitectura objetivo

```
Vercel Cron (7:30 CET) ─► Vercel Serverless Function (api/alerts/daily.ts)
                                      │
                                      ├── 1. Verifica auth (Bearer CRON_SECRET)
                                      ├── 2. Llama RPC get_daily_anomalies(-20)
                                      ├── 3. Consulta profiles para mapear consultor → empresas
                                      ├── 4. Agrupa anomalias por consultor
                                      ├── 5. Formatea mensaje con Claude API (claude-sonnet-4-5-20250929)
                                      └── 6. Envia a Slack via Incoming Webhook
```

## Schema de la base de datos (tablas relevantes)

### CONCEPTO CRITICO: Multi-Portal ID Grouping

Las tablas dimensionales (`dt_store`, `dt_address`) contienen **registros duplicados** para la misma marca/direccion cuando operan en multiples plataformas (Glovo, UberEats, JustEat).

**Ejemplo**: La marca "26KG Pasta Fresca" puede tener 3 `pk_id_store` diferentes (uno por portal). La direccion "C/ Mozart 5" puede tener 3 `pk_id_address` diferentes.

**Implicacion para alertas**: En `ft_order_head`, cada pedido referencia el ID especifico del portal. Esto significa que la **granularidad por portal es natural**: `pfk_id_store_address=100` (Glovo) y `pfk_id_store_address=200` (UberEats) son la misma direccion fisica pero IDs distintos. El RPC debe agrupar por `pfk_id_store_address + pfk_id_portal`, y la comparacion historica se hace contra el mismo `pfk_id_store_address` + mismo dia de la semana. Esto es **correcto** porque queremos detectar "este restaurante en Glovo cayo" independientemente de UberEats.

### CONCEPTO CRITICO: Dimension Table Snapshots

Todas las tablas dimensionales tienen **snapshots mensuales** (`pk_ts_month`) y un flag de borrado suave (`flg_deleted`):

- Cada entidad puede aparecer multiples veces (una por mes)
- `flg_deleted = 0` → activa, `flg_deleted = 1` → eliminada
- **Regla**: Siempre deduplicar primero por PK (quedarse con el snapshot mas reciente), luego filtrar `flg_deleted != 0`
- **NUNCA** filtrar `flg_deleted` antes de deduplicar (un registro puede estar activo en enero y borrado en febrero)

**En el RPC**: Para los JOINs con tablas dimensionales (nombres legibles), usar subconsultas con `DISTINCT ON (pk_id_xxx) ORDER BY pk_ts_month DESC` y filtrar `flg_deleted = 0`.

### CONCEPTO CRITICO: `dt_address` NO tiene `pfk_id_store`

La tabla de direcciones (`dt_address`) **NO tiene relacion directa con marcas** (`dt_store`). La relacion address→brand viene del campo `pfk_id_store` en la tabla de **pedidos** (`ft_order_head`). Para obtener el nombre de marca de un restaurante en el RPC, hay que hacer JOIN a traves de los pedidos: `ft_order_head.pfk_id_store` → `dt_store.pk_id_store`.

### Tabla de pedidos: `crp_portal__ft_order_head`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_uuid_order` | text | PK unica del pedido |
| `pfk_id_company` | number | FK empresa |
| `pfk_id_store` | number | FK marca/brand |
| `pfk_id_store_address` | number | FK restaurante/direccion |
| `pfk_id_portal` | text | ID del portal de delivery |
| `td_creation_time` | timestamp | Fecha/hora del pedido (en UTC) |
| `amt_total_price` | numeric | Importe total EUR |
| `amt_promotions` | numeric | Descuentos EUR (nullable) |
| `amt_refunds` | numeric | Reembolsos EUR (nullable) |
| `cod_id_customer` | text | ID cliente (nullable) |
| `flg_customer_new` | boolean | Flag cliente nuevo (nullable) |

**Nota**: Esta tabla de hechos NO tiene `pk_ts_month` ni `flg_deleted` — es transaccional, no dimensional.

### Mapeo Portal ID → Canal

| Portal ID | Canal |
|-----------|-------|
| `E22BC362` o `E22BC362-2` | Glovo |
| `3CCD6861` | UberEats |
| Cualquier otro | other |

**Usar CASE WHEN** exactamente como en los RPCs existentes:
```sql
CASE
  WHEN o.pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo'
  WHEN o.pfk_id_portal = '3CCD6861' THEN 'ubereats'
  ELSE 'other'
END AS channel
```

### Tabla de empresas: `crp_portal__dt_company`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_id_company` | number | PK |
| `des_company_name` | text | Nombre empresa |
| `des_status` | text | Estado: 'Onboarding', 'Cliente Activo', 'Stand By', 'PiP', etc. |
| `des_key_account_manager` | text (nullable) | KAM asignado (nombre del consultor en CRP) |
| `url_paladar_portal` | text (nullable) | URL al portal del cliente |
| `td_firma_contrato` | text (nullable) | Fecha firma contrato |
| `flg_deleted` | number | 0=activa, 1=eliminada |
| `pk_ts_month` | text | Snapshot mensual (YYYY-MM-01) |

**FILTRO OBLIGATORIO**: Solo incluir empresas con status valido:
```sql
des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')
```

### Tabla de marcas: `crp_portal__dt_store`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_id_store` | number | PK |
| `des_store` | text | Nombre marca |
| `pfk_id_company` | number | FK empresa |
| `flg_deleted` | number | 0=activa, 1=eliminada |
| `pk_ts_month` | text | Snapshot mensual |

### Tabla de restaurantes/direcciones: `crp_portal__dt_address`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_id_address` | number | PK |
| `des_address` | text | Direccion completa |
| `pfk_id_company` | number | FK empresa |
| `flg_deleted` | number | 0=activa, 1=eliminada |
| `pk_ts_month` | text | Snapshot mensual |

**IMPORTANTE**: Esta tabla **NO tiene** `pfk_id_store` ni `pfk_id_business_area` como columnas reales. Estas columnas no existen en la tabla aunque aparezcan en tipos TypeScript como opcionales por seguridad.

### Tabla de portales: `crp_portal__dt_portal`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_id_portal` | number | PK |
| `des_portal` | text | Nombre del portal (Glovo, UberEats...) |
| `flg_deleted` | number | 0=activo |
| `pk_ts_month` | text | Snapshot mensual |

### Tabla de consultores: `profiles`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | uuid | PK |
| `email` | text | Email del consultor |
| `full_name` | text | Nombre completo |
| `role` | text | 'consultant', 'admin', 'manager' |
| `assigned_company_ids` | text[] | Array de company IDs asignados (como strings) |
| `slack_user_id` | text (nullable) | **NUEVA** — Slack User ID (ej: 'U04ABCDEF') para menciones directas |

**Nota**: `assigned_company_ids` contiene strings (ej: `['1', '23', '45']`), no numeros. Al comparar con `pfk_id_company` (number) del RPC, convertir con `::text`.

**Nota sobre `slack_user_id`**: Esta columna hay que crearla con una migracion (ver Paso 0). El Slack User ID se obtiene desde Slack: perfil del usuario → "..." → "Copy member ID". Formato: `U` seguido de 8-10 caracteres alfanumericos (ej: `U04ABCDEF`). Si un consultor no tiene `slack_user_id`, se muestra su nombre sin mencion.

### Tabla de resenas: `crp_portal__ft_review`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pk_id_review` | text | PK unica de la resena |
| `fk_id_order` | text | FK al pedido resenado |
| `pfk_id_company` | text | FK empresa |
| `pfk_id_store` | text | FK marca/brand |
| `pfk_id_store_address` | text | FK restaurante/direccion |
| `pfk_id_portal` | text | ID del portal de delivery |
| `ts_creation_time` | timestamp | Fecha/hora de la resena |
| `val_rating` | number | Valoracion 1-5 estrellas |

**Clasificacion de ratings:**
- **Positiva**: `val_rating >= 4` (4 y 5 estrellas)
- **Negativa**: `val_rating <= 2` (1 y 2 estrellas)
- **Neutral**: `val_rating = 3`

**Nota**: Esta tabla es transaccional (como `ft_order_head`), NO tiene `pk_ts_month` ni `flg_deleted`. Los tipos de las FKs (`pfk_id_company`, `pfk_id_store`, `pfk_id_store_address`) son **text** (a diferencia de `ft_order_head` donde son number).

### Tabla de publicidad: `crp_portal__ft_advertising_hp`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `pfk_id_company` | text | FK empresa |
| `pfk_id_store` | text | FK marca/brand |
| `pfk_id_store_address` | text | FK restaurante/direccion |
| `pfk_id_portal` | text | ID del portal de delivery |
| `pk_ts_hour` | timestamp | Timestamp por hora (granularidad horaria) |
| `amt_ad_spent` | numeric | Gasto en publicidad EUR |
| `amt_revenue` | numeric | Revenue atribuido a los ads EUR |
| `val_impressions` | bigint | Numero de impresiones |
| `val_clicks` | bigint | Numero de clicks |
| `val_orders` | bigint | Pedidos atribuidos a los ads |

**Nota**: Esta tabla tiene granularidad **horaria** (`pk_ts_hour`), no por pedido individual. Para agregar por dia, filtrar `pk_ts_hour` por rango de fecha. Los tipos de las FKs son **text**.

**KPIs derivados de ads:**
- **ROAS** = `amt_revenue / NULLIF(amt_ad_spent, 0)` (Return on Ad Spend)
- **CPC** = `amt_ad_spent / NULLIF(val_clicks, 0)` (Cost per Click)
- **CTR** = `val_clicks / NULLIF(val_impressions, 0) * 100` (Click-Through Rate)
- **Conversion Rate** = `val_orders / NULLIF(val_clicks, 0) * 100`

## Lo que necesito que construyas

### Paso 0: Migracion — Columna `slack_user_id` en `profiles`

Crear archivo: `supabase/migrations/20260222_profiles_slack_user_id.sql`

```sql
-- Add Slack User ID column to profiles for direct mentions in alerts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_user_id text;

COMMENT ON COLUMN profiles.slack_user_id IS 'Slack User ID (e.g. U04ABCDEF) for @mentions in daily alert messages. Obtain from Slack profile → Copy member ID.';
```

Migracion simple, sin downtime. Los valores se rellenan manualmente desde el admin o directamente en Supabase Table Editor.

### Paso 1: Funciones SQL — RPCs de anomalias

Crear archivo: `supabase/migrations/20260222_daily_alerts_rpc.sql`

**IMPORTANTE**: Seguir EXACTAMENTE el mismo patron de los RPCs existentes en el proyecto. Referencia: `supabase/migrations/20260220100000_combined_orders_ads_rpc.sql`. Ese archivo usa:

- `LANGUAGE sql STABLE`
- `GRANT EXECUTE ON FUNCTION ... TO authenticated;`
- `COMMENT ON FUNCTION ...`
- CTEs con el mismo estilo de mapeo de canales (CASE WHEN portal IDs)

Crear **3 funciones RPC** en el mismo archivo de migracion (o separados si son muy largos):

---

#### RPC 1: `get_daily_order_anomalies` (Pedidos)

```sql
-- Parametros:
--   p_threshold numeric: porcentaje de caida para anomalia (ej: -20 = caida del 20%)
--
-- Retorna una fila por cada combinacion restaurante/canal con anomalia en PEDIDOS
```

**Logica de la query (CTEs en orden):**

1. **CTE `active_companies`**: Deduplicar y filtrar empresas activas
   - `DISTINCT ON (pk_id_company) ... ORDER BY pk_id_company, pk_ts_month DESC`
   - Filtrar `flg_deleted = 0`
   - Filtrar `des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')`
   - Incluir `des_company_name` y `des_key_account_manager`

2. **CTE `active_stores`**: Deduplicar marcas activas
   - `DISTINCT ON (pk_id_store) ... ORDER BY pk_id_store, pk_ts_month DESC`
   - Filtrar `flg_deleted = 0`
   - Incluir `des_store` y `pfk_id_company`

3. **CTE `active_addresses`**: Deduplicar direcciones activas
   - `DISTINCT ON (pk_id_address) ... ORDER BY pk_id_address, pk_ts_month DESC`
   - Filtrar `flg_deleted = 0`
   - Incluir `des_address` y `pfk_id_company`

4. **CTE `yesterday_date`**: Calcular la fecha de ayer en timezone Europe/Madrid
   - `SELECT ((NOW() AT TIME ZONE 'Europe/Madrid')::date - 1) AS d`

5. **CTE `yesterday`**: Agregar pedidos de ayer por empresa/marca/direccion/canal
   - Convertir `td_creation_time` a Europe/Madrid para comparar: `(td_creation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')::date`
   - Solo pedidos de empresas en `active_companies`
   - Agrupar por: `pfk_id_company, pfk_id_store, pfk_id_store_address, channel`
   - Canal via CASE WHEN (ver mapeo portal IDs arriba)
   - Campos: company_id, store_id, address_id, channel, total_orders, total_revenue

6. **CTE `baseline`**: Agregar media del mismo dia de la semana en las 6 semanas anteriores
   - Mismo dia = `EXTRACT(ISODOW FROM fecha_madrid)` coincide con el ISODOW de ayer
   - Rango: entre ayer - 42 dias y ayer - 1 dia (6 semanas antes hasta anteayer)
   - Solo pedidos de empresas en `active_companies`
   - Agrupar por: `pfk_id_company, pfk_id_store, pfk_id_store_address, channel`
   - Campos: mismos + `AVG(orders)`, `AVG(revenue)`, `STDDEV(orders)`, `COUNT(DISTINCT semana)` as weeks_with_data

7. **CTE `anomalies`**: FULL OUTER JOIN yesterday con baseline
   - **FULL OUTER JOIN** (no LEFT JOIN) para capturar:
     - Restaurantes con datos ayer pero sin baseline (nuevos, no alertar)
     - Restaurantes con baseline pero sin datos ayer (posible cierre → -100%)
   - Calcular desviacion: `((yesterday_orders - avg_orders) / NULLIF(avg_orders, 0)) * 100`
   - Filtrar: `orders_deviation_pct <= p_threshold`
   - Excluir: `weeks_with_data < 3`

8. **SELECT final**: JOIN anomalies con CTEs dimensionales
   - JOIN `active_companies` para `des_company_name` y `des_key_account_manager`
   - JOIN `active_stores` para `des_store` (nombre de marca)
   - JOIN `active_addresses` para `des_address` (direccion legible)
   - Ordenar por desviacion ascendente (peores primero)

**Columnas de retorno:**

```
company_id, company_name, key_account_manager,
store_id, store_name,
address_id, address_name,
channel,
yesterday_orders, yesterday_revenue,
avg_orders_baseline, avg_revenue_baseline,
stddev_orders, orders_deviation_pct, revenue_deviation_pct,
weeks_with_data
```

**Notas sobre los JOINs dimensionales:**
- `active_stores` se une por `pk_id_store = anomalies.store_id` (el store_id viene de `ft_order_head.pfk_id_store`, NO de `dt_address`)
- `active_addresses` se une por `pk_id_address = anomalies.address_id`
- `active_companies` se une por `pk_id_company = anomalies.company_id`
- Usar LEFT JOIN para los dimensionales (por si un registro no tiene match en la dimension)

---

#### RPC 2: `get_daily_review_anomalies` (Resenas)

```sql
-- Parametros:
--   p_min_reviews numeric: minimo de resenas ayer para considerarla (ej: 3, evita ruido de 1 resena mala)
--   p_rating_threshold numeric: rating medio por debajo del cual alertar (ej: 3.5)
--   p_negative_spike_pct numeric: % de aumento en resenas negativas vs baseline (ej: 50 = +50%)
--
-- Retorna una fila por cada combinacion restaurante/canal con anomalia en REVIEWS
```

**Logica:**

Misma estructura de CTEs dimensionales (`active_companies`, `active_stores`, `active_addresses`, `yesterday_date`) que en el RPC de pedidos — se pueden reutilizar si se hace en una sola funcion, o duplicar si son funciones separadas.

1. **CTE `reviews_yesterday`**: Agregar resenas de ayer por empresa/marca/direccion/canal
   - Tabla: `crp_portal__ft_review`
   - Convertir `ts_creation_time` a Europe/Madrid
   - Solo empresas en `active_companies`
   - Campos: company_id, store_id, address_id, channel, total_reviews, avg_rating, negative_count (val_rating <= 2), positive_count (val_rating >= 4)

2. **CTE `reviews_baseline`**: Media de resenas del mismo dia de la semana en 6 semanas anteriores
   - Misma logica de ISODOW y rango 42 dias
   - Campos: avg_reviews, avg_rating_baseline, avg_negative_count, weeks_with_data

3. **CTE `review_anomalies`**: JOIN + deteccion
   - **Anomalia tipo 1**: Rating medio de ayer < `p_rating_threshold` (ej: < 3.5) Y baseline era >= 4.0
   - **Anomalia tipo 2**: Pico de resenas negativas: `negative_count ayer` > `avg_negative_baseline * (1 + p_negative_spike_pct/100)`
   - **Anomalia tipo 3**: Caida de rating: `((avg_rating_ayer - avg_rating_baseline) / NULLIF(avg_rating_baseline, 0)) * 100 <= p_threshold_similar_a_orders`
   - Solo si `total_reviews ayer >= p_min_reviews` (evitar ruido)
   - Solo si `weeks_with_data >= 3`

4. **SELECT final**: JOIN con dimensionales para nombres legibles

**Columnas de retorno:**

```
company_id, company_name, key_account_manager,
store_id, store_name,
address_id, address_name,
channel,
anomaly_type,              -- 'low_rating' | 'negative_spike' | 'rating_drop'
yesterday_reviews, yesterday_avg_rating, yesterday_negative_count,
baseline_avg_rating, baseline_avg_negative_count,
rating_deviation_pct, negative_spike_pct,
weeks_with_data
```

**Nota sobre tipos de FK en `ft_review`**: Los campos `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address` son **text** (no number como en `ft_order_head`). Los JOINs con las CTEs dimensionales necesitan cast: `r.pfk_id_company::integer = ac.pk_id_company`.

---

#### RPC 3: `get_daily_ads_anomalies` (Publicidad)

```sql
-- Parametros:
--   p_roas_threshold numeric: ROAS minimo aceptable (ej: 3.0 = retorno de 3x)
--   p_spend_threshold numeric: gasto minimo ayer para considerar (ej: 10 EUR, evitar ruido)
--   p_spend_deviation_pct numeric: % de aumento en gasto sin retorno vs baseline (ej: 50)
--
-- Retorna una fila por cada combinacion restaurante/canal con anomalia en ADS
```

**Logica:**

1. **CTE `ads_yesterday`**: Agregar metricas de ads de ayer por empresa/marca/direccion/canal
   - Tabla: `crp_portal__ft_advertising_hp`
   - Filtrar `pk_ts_hour` por fecha de ayer (rango de 00:00 a 23:59 Europe/Madrid)
   - Solo empresas en `active_companies`
   - Campos: company_id, store_id, address_id, channel, total_ad_spent, total_ad_revenue, total_impressions, total_clicks, total_ad_orders
   - Calcular: `roas = total_ad_revenue / NULLIF(total_ad_spent, 0)`

2. **CTE `ads_baseline`**: Media de ads del mismo dia de la semana en 6 semanas anteriores
   - Campos: avg_ad_spent, avg_ad_revenue, avg_roas, avg_impressions, weeks_with_data

3. **CTE `ads_anomalies`**: JOIN + deteccion
   - **Anomalia tipo 1**: ROAS bajo — `roas_ayer < p_roas_threshold` Y `total_ad_spent >= p_spend_threshold` (gastando pero sin retorno)
   - **Anomalia tipo 2**: Pico de gasto — gasto ayer > baseline * 1.5 pero revenue no subio proporcionalmente (ROAS cayo)
   - **Anomalia tipo 3**: Caida de impresiones — impresiones ayer cayeron > 50% vs baseline (posible problema de campaña)
   - Solo si `total_ad_spent ayer >= p_spend_threshold` (ignorar restaurantes sin ads)
   - Solo si `weeks_with_data >= 3`

4. **SELECT final**: JOIN con dimensionales

**Columnas de retorno:**

```
company_id, company_name, key_account_manager,
store_id, store_name,
address_id, address_name,
channel,
anomaly_type,              -- 'low_roas' | 'spend_spike' | 'impressions_drop'
yesterday_ad_spent, yesterday_ad_revenue, yesterday_roas,
yesterday_impressions, yesterday_clicks, yesterday_ad_orders,
baseline_avg_ad_spent, baseline_avg_roas, baseline_avg_impressions,
roas_deviation_pct, spend_deviation_pct, impressions_deviation_pct,
weeks_with_data
```

**Nota sobre tipos de FK en `ft_advertising_hp`**: Los campos `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address` son **text** (como en `ft_review`). Los JOINs con dimensionales necesitan cast a integer.

**Nota sobre `pk_ts_hour`**: A diferencia de `td_creation_time` (UTC), verificar si `pk_ts_hour` ya esta en Europe/Madrid o en UTC. Si esta en UTC, aplicar la misma conversion de timezone.

### Paso 2: Vercel Serverless Function — `api/alerts/daily.ts`

El proyecto actual es un **Vite SPA desplegado en Vercel**. No es Next.js. Para serverless functions, crear archivos en el directorio `api/` en la raiz del proyecto.

**Formato de Vercel Serverless Functions (Node.js runtime):**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ...
}
```

**Logica de la funcion:**

```typescript
// 1. Solo aceptar POST
if (req.method !== 'POST') return res.status(405).end();

// 2. Verificar auth
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// 3. Crear cliente Supabase con service role key
//    import { createClient } from '@supabase/supabase-js';
//    Usar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (NO anon key)

// 4. Llamar las 3 RPCs en paralelo
const threshold = Number(process.env.ALERT_THRESHOLD ?? -20);

const [ordersResult, reviewsResult, adsResult] = await Promise.all([
  supabase.rpc('get_daily_order_anomalies', { p_threshold: threshold }),
  supabase.rpc('get_daily_review_anomalies', {
    p_min_reviews: 3,
    p_rating_threshold: 3.5,
    p_negative_spike_pct: 50
  }),
  supabase.rpc('get_daily_ads_anomalies', {
    p_roas_threshold: 3.0,
    p_spend_threshold: 10,
    p_spend_deviation_pct: 50
  }),
]);

// 5. Si error en alguna query, notificar a Slack y continuar con las que si funcionaron
const errors = [
  ordersResult.error && `Orders: ${ordersResult.error.message}`,
  reviewsResult.error && `Reviews: ${reviewsResult.error.message}`,
  adsResult.error && `Ads: ${adsResult.error.message}`,
].filter(Boolean);

if (errors.length > 0) {
  await sendSlack(`⚠️ Errores en alertas diarias:\n${errors.join('\n')}`);
  if (errors.length === 3) {
    return res.status(500).json({ errors });
  }
}

const orderAnomalies = ordersResult.data ?? [];
const reviewAnomalies = reviewsResult.data ?? [];
const adsAnomalies = adsResult.data ?? [];
const totalAnomalies = orderAnomalies.length + reviewAnomalies.length + adsAnomalies.length;

// 6. Si no hay anomalias en ninguna dimension, enviar "todo ok" y salir
if (totalAnomalies === 0) {
  await sendSlack('🟢 Todos los restaurantes dentro de rango normal ayer (pedidos, resenas y ads).');
  return res.status(200).json({ message: 'No anomalies', count: 0 });
}

// 7. Consultar perfiles de consultores (incluir slack_user_id para menciones)
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, full_name, assigned_company_ids, role, slack_user_id')
  .in('role', ['consultant', 'manager', 'admin']);

// 8. Agrupar TODAS las anomalias (orders + reviews + ads) por consultor
//    Para cada anomalia, buscar que consultor(es) tienen esa company_id
//    en su assigned_company_ids (text[])
//    NOTA: assigned_company_ids es text[] (ej: ['1', '23']), company_id del RPC es number
//    → convertir company_id a string para la comparacion
//    Anomalias sin consultor asignado → grupo "Sin asignar"
//    Incluir key_account_manager del RPC como contexto adicional
//
//    Estructura por consultor:
//    {
//      consultant: { name, email, slackUserId },  // slackUserId puede ser null
//      orders: [...orderAnomalies filtradas],
//      reviews: [...reviewAnomalies filtradas],
//      ads: [...adsAnomalies filtradas],
//    }
//
//    Para el header de cada seccion en Slack:
//    - Si slack_user_id existe: usar "<@U04ABCDEF>" (Slack lo renderiza como mencion con notificacion)
//    - Si no existe: usar el nombre en texto plano "*Maria Garcia*"

// 9. Para cada grupo de consultor, llamar a Claude API para formatear
//    Modelo: claude-sonnet-4-5-20250929
//    max_tokens: 800 (ampliado por 3 secciones, pero con limite)
//    Pasar las 3 listas de anomalias al prompt
//    Ver seccion "Formato del mensaje" abajo

// 10. Enviar mensaje formateado a Slack
//     Un unico mensaje al canal del equipo con secciones por consultor

// 11. Responder con resumen
return res.status(200).json({
  message: 'Alerts sent',
  order_anomalies: orderAnomalies.length,
  review_anomalies: reviewAnomalies.length,
  ads_anomalies: adsAnomalies.length,
  consultants_notified: Object.keys(grouped).length
});
```

### Formato del mensaje Slack

**System prompt para Claude API:**

```
Eres un analista de delivery para ThinkPaladar. Genera alertas concisas para consultores de restaurantes.
Formato Slack-friendly (emojis, negrita con *, breve). En espanol.
No inventes datos, usa solo los proporcionados. Maximo 3-4 lineas por restaurante.
Incluye una hipotesis breve de posible causa cuando la desviacion sea >30%.

Para PEDIDOS: Agrupa en 🔴 Criticos (>25% caida) y 🟡 Vigilancia (20-25% caida).
Para RESENAS: Usa ⭐ y muestra rating ayer vs media, numero de negativas.
Para ADS: Usa 📢 y muestra ROAS ayer vs media, gasto.

Al final de cada seccion indica cuantos restaurantes estan en rango normal.
Si una dimension (reviews o ads) no tiene anomalias, omitirla del mensaje.
```

**Ejemplo de output esperado:**

```
*📊 Alertas diarias — viernes 21 feb 2026*

👤 <@U04ABC123> ← Slack renderiza esto como mencion con notificacion push

*📦 Pedidos:*
🔴 *Restalia — 100 Montaditos* | C/ Gran Via 42 (Glovo) — 32 pedidos ayer (media 6 viernes: 45) → *-29%*
  _Posible causa: promocion de competencia o problema operativo_
🔴 *Sushi Factory — Sushi Roll* | Av. Diagonal 123 (Glovo) — 0 pedidos ayer (media: 34) → *-100%*
  _Posible causa: restaurante cerrado o desactivado en plataforma_
🟡 *Burger King — Burger House* | C/ Serrano 15 (UberEats) — 22 pedidos (media: 28) → *-21%*
🟢 48 restaurantes en rango normal

*⭐ Resenas:*
🔴 *Restalia — 100 Montaditos* | C/ Gran Via 42 (Glovo) — Rating ayer: *2.1* (media: 4.2) | 5 negativas (media: 1)
  _Posible causa: problema de calidad o tiempos de entrega_
🟢 51 restaurantes con reviews en rango normal

*📢 Publicidad:*
🔴 *Sushi Factory — Sushi Roll* | Av. Diagonal 123 (UberEats) — ROAS ayer: *0.8x* (media: 4.2x) | Gasto: 45€
  _Posible causa: segmentacion incorrecta o creatividad saturada_
🟢 20 restaurantes con ads en rango normal

---

👤 <@U04DEF456>

*📦 Pedidos:*
🔴 *Pizza Group — Pizza Roma* | Pl. Mayor 8 (Glovo) — 15 pedidos (media: 42) → *-64%*
  _Posible causa: incidencia grave o cambio de horarios_
🟢 35 restaurantes en rango normal

_Datos de ayer (viernes) vs media 6 viernes anteriores_
```

**Formato de mencion Slack**: `<@SLACK_USER_ID>` (ej: `<@U04ABC123>`). Slack lo renderiza como "@Maria Garcia" con highlight azul y envia notificacion push al usuario. Si el consultor no tiene `slack_user_id` en `profiles`, usar `*Nombre Completo*` en texto plano (sin notificacion).

**Estructura del mensaje por tipo de anomalia:**
- **Pedidos**: `Empresa — Marca | Direccion (Canal) — X pedidos ayer (media Y dias: Z) → W%`
- **Resenas**: `Empresa — Marca | Direccion (Canal) — Rating ayer: X (media: Y) | Z negativas (media: W)`
- **Ads**: `Empresa — Marca | Direccion (Canal) — ROAS ayer: Xx (media: Yx) | Gasto: Z€`

Los 3 RPCs devuelven `company_name`, `store_name`, `address_name` y `channel` para construir cada linea. Tambien `key_account_manager` como contexto adicional.

### Envio a Slack

```typescript
async function sendSlack(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not configured');
    return;
  }
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}
```

### Paso 3: Endpoint de test — `api/alerts/test.ts`

Crear `api/alerts/test.ts` que:

- Ejecute la misma logica que `daily.ts` pero **sin enviar a Slack ni llamar a Claude API**
- Acepte GET (para probar desde el navegador) y POST
- Autenticacion con el mismo `CRON_SECRET`
- Devuelva el JSON con:
  - Anomalias detectadas (raw del RPC)
  - Agrupacion por consultor
  - El mensaje que se habria formateado
- Util para testear sin spammear Slack ni gastar tokens de Claude

### Paso 4: Configuracion de Vercel Cron

Actualizar `vercel.json` para anadir el cron. El archivo ya existe con rewrites y headers de seguridad:

```json
{
  "crons": [
    {
      "path": "/api/alerts/daily",
      "schedule": "30 6 * * 1-5"
    }
  ]
}
```

> **Nota timezone**: `30 6 * * 1-5` = 6:30 UTC = 7:30 CET (horario de invierno). En verano (CEST, UTC+2) sera a las 8:30. Si quieres siempre 7:30 hora local, ajusta a `30 5 * * 1-5` en verano. Vercel cron usa UTC.

> **Nota rewrites**: Asegurate de que el rewrite existente `"source": "/(.*)"` NO intercepte las rutas `/api/`. Vercel prioriza serverless functions sobre rewrites, pero verificalo.

### Paso 5: Dependencias

Revisar `package.json` antes de instalar. Dependencias necesarias:

| Paquete | Ya instalado? | Para que |
|---------|---------------|----------|
| `@supabase/supabase-js` | Si (^2.90.1) | Cliente Supabase |
| `@anthropic-ai/sdk` | **No** — instalar | Cliente Claude API |
| `@vercel/node` | **No** — instalar como devDep | Tipos para serverless functions |

```bash
npm install @anthropic-ai/sdk
npm install -D @vercel/node
```

### Paso 6: Variables de entorno

Configurar en Vercel Dashboard (Settings → Environment Variables):

| Variable | Descripcion | Donde obtenerla |
|----------|-------------|-----------------|
| `SUPABASE_URL` | Ya deberia existir (`VITE_SUPABASE_URL`) | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | **Clave service_role** (NO anon key) | Supabase → Settings → API → service_role |
| `SLACK_WEBHOOK_URL` | URL del Incoming Webhook de Slack | [COMPLETAR: Crear en Slack → Apps → Incoming Webhooks] |
| `CRON_SECRET` | Bearer token para autenticar el cron | [COMPLETAR: Generar un UUID o string aleatorio largo] |
| `ANTHROPIC_API_KEY` | API key de Anthropic | [COMPLETAR: console.anthropic.com] |
| `ALERT_THRESHOLD` | Porcentaje de caida (opcional, default -20) | -20 |

**IMPORTANTE**: Las variables `VITE_*` NO estan disponibles en serverless functions (solo en el build del frontend). Necesitas crear `SUPABASE_URL` (sin prefijo VITE_) para el backend.

## Restricciones tecnicas

- **No instales dependencias nuevas** si ya existen en el proyecto. Revisa `package.json` antes.
- El webhook de Slack es un POST simple con `{ "text": "mensaje" }`, no necesita libreria.
- Pon hard limit de `max_tokens: 500` en la llamada a Claude para evitar costes descontrolados.
- Anade `console.log` en cada paso para debugging en Vercel Logs.
- Usa `try/catch` robusto en cada paso — si Claude API falla, envia el mensaje sin formateo fancy (template basico).
- **Timezone**: Todos los calculos de "ayer" deben usar `Europe/Madrid` tanto en SQL como en JS.
- **Dias sin datos**: Si un restaurante no tiene pedidos ayer pero si tiene baseline, reportar como -100%.
- **Fin de semana**: Incluir sabado y domingo en el analisis. Los consultores deciden si miran o no.

## Checklist de integridad del modelo de datos

Antes de dar por terminados los RPCs, verifica que cumplen todos estos puntos:

### General (aplica a los 3 RPCs)
- [ ] **Dimension dedup**: Todas las tablas dimensionales (dt_company, dt_store, dt_address) se deduplicaron con `DISTINCT ON (pk) ORDER BY pk_ts_month DESC` y filtradas por `flg_deleted = 0`
- [ ] **Company status**: Solo se incluyen empresas con `des_status IN ('Onboarding', 'Cliente Activo', 'Stand By', 'PiP')`
- [ ] **Canal mapping**: Usa `CASE WHEN pfk_id_portal IN ('E22BC362', 'E22BC362-2') THEN 'glovo' WHEN pfk_id_portal = '3CCD6861' THEN 'ubereats' ELSE 'other' END`
- [ ] **Timezone**: Timestamps se convierten de UTC a Europe/Madrid para calcular "ayer" y el dia de la semana
- [ ] **Multi-portal aware**: La granularidad es por `pfk_id_store_address + channel`
- [ ] **key_account_manager**: El campo `des_key_account_manager` de `dt_company` se incluye en el retorno
- [ ] **weeks_with_data >= 3**: Solo alertar restaurantes con al menos 3 semanas de historico

### Pedidos (get_daily_order_anomalies)
- [ ] **Store name via orders**: El nombre de marca viene de `ft_order_head.pfk_id_store → dt_store.pk_id_store`, NO via `dt_address`
- [ ] **FULL OUTER JOIN**: Para capturar restaurantes con baseline pero 0 pedidos ayer (-100%)
- [ ] **FK types**: `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address` son **number** en `ft_order_head`

### Resenas (get_daily_review_anomalies)
- [ ] **FK types**: `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address` son **text** en `ft_review` → cast a integer para JOINs con dimensionales
- [ ] **Timestamp field**: Usa `ts_creation_time` (no `td_creation_time`)
- [ ] **Rating classification**: Negativa = `val_rating <= 2`, Positiva = `val_rating >= 4`
- [ ] **Minimo de resenas**: Filtrar con `p_min_reviews` para evitar ruido (1 mala resena no es anomalia)

### Publicidad (get_daily_ads_anomalies)
- [ ] **FK types**: `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address` son **text** en `ft_advertising_hp` → cast a integer para JOINs
- [ ] **Timestamp field**: Usa `pk_ts_hour` (granularidad horaria, filtrar por rango de dia)
- [ ] **Gasto minimo**: Filtrar con `p_spend_threshold` para ignorar restaurantes sin ads activos
- [ ] **ROAS calculo**: `amt_revenue / NULLIF(amt_ad_spent, 0)` — evitar division por cero

## Estructura de archivos a crear

```
tphub/
├── api/
│   └── alerts/
│       ├── daily.ts       ← Serverless function principal
│       └── test.ts        ← Endpoint de testing
├── supabase/
│   └── migrations/
│       ├── 20260222_profiles_slack_user_id.sql  ← Columna slack_user_id en profiles
│       └── 20260222_daily_alerts_rpc.sql        ← 3 funciones SQL (orders, reviews, ads)
└── vercel.json            ← Actualizar con cron config
```

## Flujo de trabajo

Empieza por:

1. **Primero muestrame la funcion SQL** que crearias, ANTES de ejecutar nada, para que la revise.
2. Luego la serverless function `api/alerts/daily.ts`.
3. Luego el endpoint de test `api/alerts/test.ts`.
4. Finalmente las instrucciones de configuracion paso a paso.

**No ejecutes nada sin mi aprobacion en cada paso.**

---FIN DEL PROMPT---
