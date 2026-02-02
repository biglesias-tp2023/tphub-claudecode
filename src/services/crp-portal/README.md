# CRP Portal Service

Servicio de acceso a datos del CRP Portal (ThinkPaladar).

## Tablas

### Dimensionales (dt_*)

#### dt_company
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pk_id_company` | BIGINT | ID único de compañía |
| `des_company_name` | VARCHAR | Nombre de la compañía |
| `pk_ts_month` | DATE | Snapshot mensual |

#### dt_store
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pk_id_store` | VARCHAR | ID único del store (hex) |
| `des_store` | VARCHAR | Nombre del store/marca |
| `pfk_id_company` | BIGINT | FK a dt_company |
| `pk_ts_month` | DATE | Snapshot mensual |

#### dt_address
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pk_id_address` | VARCHAR | ID único de dirección (hex) |
| `des_address` | VARCHAR | Dirección física |
| `pfk_id_company` | BIGINT | FK a dt_company |
| `pk_ts_month` | DATE | Snapshot mensual |

⚠️ **IMPORTANTE**: `dt_address` NO tiene `pfk_id_store`. Las addresses pertenecen a companies, no directamente a stores.

#### dt_portal
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pk_id_portal` | VARCHAR | ID único del portal |
| `des_portal` | VARCHAR | Nombre del portal (Glovo, UberEats) |
| `pk_ts_month` | DATE | Snapshot mensual |

### Tabla de Hechos

#### ft_order_head
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pk_uuid_order` | UUID | ID único del pedido |
| `pfk_id_company` | BIGINT | FK a dt_company |
| `pfk_id_store` | VARCHAR | FK a dt_store |
| `pfk_id_store_address` | VARCHAR | FK a dt_address |
| `pfk_id_portal` | VARCHAR | FK a dt_portal |
| `amt_total_price` | FLOAT8 | Importe total |
| `amt_promotions` | FLOAT8 | Descuentos/promociones |
| `amt_refunds` | FLOAT8 | Reembolsos |
| `flg_customer_new` | BOOLEAN | Cliente nuevo |
| `cod_id_customer` | VARCHAR | ID del cliente |
| `td_creation_time` | TIMESTAMP | Fecha/hora del pedido |

## Relaciones

```
┌─────────────────┐
│   dt_company    │
│  pk_id_company  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│dt_store│ │dt_addr │
│  pfk   │ │  pfk   │
│company │ │company │
└────┬───┘ └────┬───┘
     │          │
     │    ┌─────┘
     │    │ (via ft_order_head)
     ▼    ▼
┌─────────────────┐
│  ft_order_head  │
│  pfk_id_store   │◄──── La relación addr→store
│  pfk_id_address │      se determina aquí
└─────────────────┘
```

## Construcción de Jerarquía

### 1. Obtener Dimensiones
```typescript
const dimensions = await fetchAllDimensions(companyIds);
// Deduplica por pk_ts_month DESC (más reciente primero)
```

### 2. Construir Mapeo Address → Store
```typescript
// Desde ft_order_head
const addressToStoreMap = new Map<string, string>();
for (const order of orders) {
  addressToStoreMap.set(order.pfk_id_store_address, order.pfk_id_store);
}
```

### 3. Agregar Métricas (Bottom-Up)
```
Portal: Agregar directamente de pedidos
Address: SUM(portals)
Store: SUM(addresses)
Company: SUM(stores)
```

### 4. Asignar Addresses a Stores
- **Con pedidos**: Al store específico del mapeo
- **Sin pedidos**: A TODOS los stores de la company

## Fórmulas de Métricas

| Métrica | Fórmula |
|---------|---------|
| Ventas | `SUM(amt_total_price)` |
| Pedidos | `COUNT(*)` |
| Ticket Medio | `ventas / pedidos` |
| Nuevos | `COUNT(*) WHERE flg_customer_new = true` |
| % Nuevos | `(nuevos / pedidos) * 100` |

**Nota**: Ticket Medio y % Nuevos se calculan DESPUÉS de sumar las métricas base.

## Portal IDs

| ID | Portal |
|----|--------|
| `E22BC362-2` | Glovo |
| `3CCD6861` | UberEats |
| `E22BC362-2-2` | Glovo Nuevo |

## Uso

```typescript
import { fetchHierarchyData } from '@/services/crp-portal';

const rows = await fetchHierarchyData(
  { companyIds: [123], startDate: '2026-01-01', endDate: '2026-01-31' },
  { companyIds: [123], startDate: '2025-12-01', endDate: '2025-12-31' }
);
```
