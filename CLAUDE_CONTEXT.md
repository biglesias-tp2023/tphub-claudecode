# CLAUDE_CONTEXT - Módulo Controlling

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript 5.9 + Vite 7 |
| Estilos | TailwindCSS 4 |
| Auth + Data | Supabase |
| State (cliente) | Zustand |
| State (servidor) | React Query |

## Ruta del Módulo

```
/controlling → src/pages/controlling/ControllingPage.tsx
```

## Archivos Principales

| Archivo | Función |
|---------|---------|
| `src/pages/controlling/ControllingPage.tsx` | Página principal, tabla de jerarquía, KPIs |
| `src/services/crp-portal/orders.ts` | Servicio de datos, agregación de métricas |
| `src/features/controlling/hooks/useControllingData.ts` | Hook de orquestación |
| `src/features/controlling/hooks/useOrdersData.ts` | React Query hook para pedidos |
| `src/stores/filtersStore.ts` | Estado de filtros (Zustand) |

## Estructura de Base de Datos

### Tablas Dimensionales (dt_*)

| Tabla | PK | Campos Principales |
|-------|----|--------------------|
| `crp_portal__dt_company` | `pk_id_company` | `des_company_name`, `pk_ts_month` |
| `crp_portal__dt_store` | `pk_id_store` | `des_store`, `pfk_id_company`, `pk_ts_month` |
| `crp_portal__dt_address` | `pk_id_address` | `des_address`, `pfk_id_company`, `pk_ts_month` |
| `crp_portal__dt_portal` | `pk_id_portal` | `des_portal`, `pk_ts_month` |

### Tabla de Hechos

| Tabla | Campos |
|-------|--------|
| `crp_portal__ft_order_head` | `pk_uuid_order`, `pfk_id_company`, `pfk_id_store`, `pfk_id_store_address`, `pfk_id_portal`, `amt_total_price`, `flg_customer_new`, `td_creation_time` |

## Relaciones Entre Tablas

```
ft_order_head
  ├── pfk_id_company → dt_company.pk_id_company
  ├── pfk_id_store → dt_store.pk_id_store
  ├── pfk_id_store_address → dt_address.pk_id_address
  └── pfk_id_portal → dt_portal.pk_id_portal
```

### ⚠️ IMPORTANTE: dt_address NO tiene pfk_id_store

- `dt_address` solo tiene `pfk_id_company`
- La relación address → store se determina via los pedidos (`ft_order_head`)
- Si una address no tiene pedidos, se asigna a TODOS los stores de su company

## Tipos de Datos

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `pk_id_company` | BIGINT | `77388125382` |
| `pk_id_store` | VARCHAR (hex) | `D4F7FBA0`, `A2708C21` |
| `pk_id_address` | VARCHAR (hex) | `42C91094`, `73CFF81B` |
| `pk_id_portal` | VARCHAR | `E22BC362-2`, `3CCD6861` |

## Separador de Keys Compuestas

Se usa `::` para separar niveles en keys compuestas:

```
portalKey = `${companyId}::${storeId}::${addressId}::${portalId}`
addressKey = `${companyId}::${storeId}::${addressId}`
storeKey = `${companyId}::${storeId}`
```

## Jerarquía de 4 Niveles

```
Company (nivel 1)
  └── Store/Brand (nivel 2)
        └── Address (nivel 3)
              └── Portal/Channel (nivel 4)
```

### Formato de Nombres

```
${nombre} (${id})

Ejemplo:
- Enzo's Pizza (79754430698)
- Enzo's Pizza (A2708C21)
- Calle Nicaragua 123 (42C91094)
- Glovo (E22BC362-2)
```

## Métricas

| Métrica | Cálculo |
|---------|---------|
| **Ventas** | `SUM(amt_total_price)` |
| **Pedidos** | `COUNT(*)` |
| **Ticket Medio** | `Ventas / Pedidos` |
| **Nuevos** | `COUNT(*) WHERE flg_customer_new = true` |
| **% Nuevos** | `(Nuevos / Pedidos) * 100` |

## Agregación Bottom-Up

Las métricas se agregan de abajo hacia arriba:

```
Portal (nivel 4) → Agregar directamente de ft_order_head
    ↓ SUM
Address (nivel 3) → Suma de todos sus Portals
    ↓ SUM
Store (nivel 2) → Suma de todas sus Addresses
    ↓ SUM
Company (nivel 1) → Suma de todos sus Stores
```

**IMPORTANTE**: `ticketMedio` y `porcentajeNuevos` se calculan DESPUÉS de sumar, no se suman directamente.

## ⚠️ REGLA FUNDAMENTAL: Filtrado de Dimensiones

**TODAS** las tablas de dimensiones (dt_company, dt_store, dt_address, dt_portal) tienen snapshots mensuales (`pk_ts_month`) y campo `flg_deleted`.

### Patrón OBLIGATORIO

```
1. Fetch SIN filtrar flg_deleted, ORDER BY pk_ts_month DESC
2. Deduplicar por PK (primer registro = snapshot más reciente)
3. Filtrar flg_deleted !== 0
```

**NUNCA usar `.eq('flg_deleted', 0)` en la query de Supabase directamente.**

### ¿Por qué este orden?

Un registro puede tener `flg_deleted=0` en Enero y `flg_deleted=1` en Febrero. Si filtras antes de deduplicar, coges el de Enero (activo pero obsoleto). **El snapshot más reciente es la verdad.**

### Uso

```typescript
import { deduplicateAndFilterDeleted } from '@/services/crp-portal/utils';

// Fetch sin filtrar flg_deleted
const { data } = await supabase
  .from('crp_portal__dt_store')
  .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
  .order('pk_ts_month', { ascending: false });

// Deduplicar y filtrar
const activeStores = deduplicateAndFilterDeleted(data, s => s.pk_id_store);
```

## Portal IDs

| Portal ID | Canal |
|-----------|-------|
| `E22BC362-2` | Glovo |
| `3CCD6861` | UberEats |
| `E22BC362-2-2` | Glovo Nuevo |
