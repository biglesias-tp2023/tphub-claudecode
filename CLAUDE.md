# TPHub - Contexto del Proyecto

## Que es este proyecto

**TPHub** es el portal interno de ThinkPaladar para consultores.

- **ThinkPaladar**: Consultoria de crecimiento para restaurantes en delivery (Glovo/UberEats/JustEat) en Espana
- **Usuarios**: Consultores internos que manejan 30-40 clientes cada uno
- **Proposito**: Dashboard de analytics, proyecciones de venta y gestion estrategica

## Navegacion del Portal

| Seccion | Ruta | Descripcion |
|---------|------|-------------|
| **Controlling** | `/controlling` | KPIs financieros, rendimiento por canal/marca/area |
| **Calendario** | `/calendar` | Gestion de campanas promocionales y eventos |
| **Estrategia** | `/strategic` | Proyeccion de ventas y objetivos estrategicos |
| **Objetivos** | `/objectives` | Objetivos de venta por restaurante/canal/mes |
| **Operaciones** | `/operations` | Gestion operativa de pedidos |
| **Clientes** | `/clients` | Gestion de cartera de clientes |
| **Reputacion** | `/reputation` | Valoraciones y resenas |
| **Mapas** | `/maps` | Visualizacion geografica |
| **Mercado** | `/market` | Analisis de mercado |
| **Admin** | `/admin` | Gestion de usuarios (solo admins) |

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 19 + TypeScript 5.9 + Vite 7 |
| Estilos | TailwindCSS 4 |
| Charts | Recharts |
| Auth + Data | Supabase |
| State (cliente) | Zustand |
| State (servidor) | React Query |
| Busqueda | Fuse.js |

## Jerarquia de Datos

```
Company -> Brand -> Area -> Restaurant -> Channel
Ej: Restalia -> 100 Montaditos -> Madrid -> Gran Via 42 -> Glovo
```

## Estructura de Carpetas

```
src/
├── components/
│   ├── ui/         # Primitivos (Button, Card, Input...)
│   ├── layout/     # TopBar, Sidebar, MainLayout
│   ├── charts/     # Wrappers de Recharts
│   └── common/     # MetricCard, ProtectedRoute
├── features/
│   ├── strategic/  # Proyeccion de ventas, objetivos
│   │   └── components/
│   │       ├── SalesProjection.tsx       # Dashboard con scorecards y chart
│   │       ├── SalesProjectionSetup.tsx  # Wizard de configuracion
│   │       └── SalesProjectionWarning.tsx
│   ├── controlling/
│   │   └── hooks/
│   │       ├── useControllingData.ts  # Orquestacion datos demo + reales
│   │       ├── useOrdersData.ts       # React Query hook para pedidos
│   │       └── index.ts               # Public exports
│   ├── calendar/
│   │   ├── components/
│   │   │   ├── CalendarView.tsx       # Vista principal del calendario
│   │   │   ├── CalendarGrid.tsx       # Grid mensual con dias
│   │   │   ├── CalendarDay.tsx        # Celda de dia individual
│   │   │   ├── CalendarSidebar.tsx    # Sidebar con filtros
│   │   │   ├── CampaignEditor/        # Wizard de creacion de campanas
│   │   │   └── CampaignEvent.tsx      # Renderizado de campana en calendario
│   │   ├── hooks/
│   │   │   ├── useCampaigns.ts        # CRUD campanas (localStorage demo)
│   │   │   ├── useCalendarEvents.ts   # Festivos y eventos
│   │   │   └── useWeather.ts          # Pronostico meteorologico
│   │   ├── services/
│   │   │   └── weatherApi.ts          # Open-Meteo API integration
│   │   └── config/
│   │       ├── platforms.ts           # Configuracion plataformas
│   │       └── weatherCodes.ts        # Mapeo codigos WMO a iconos
│   ├── dashboard/
│   │   └── components/
│   │       └── DashboardFilters/      # Filtros reutilizables
│   │           ├── ChannelSelector.tsx
│   │           ├── DateRangePicker/
│   │           └── ...
│   ├── clients/
│   └── ...
├── pages/
├── services/
│   └── crp-portal/  # CRP Portal Data Service (SOLID)
│       ├── types.ts      # Database types (DbCrpOrderHead, PORTAL_IDS)
│       ├── utils.ts      # Helper functions
│       ├── mappers.ts    # Data transformation
│       ├── companies.ts  # Company operations
│       ├── brands.ts     # Brand operations
│       ├── areas.ts      # Area operations
│       ├── restaurants.ts # Restaurant operations
│       ├── portals.ts    # Portal operations
│       ├── orders.ts     # Order data & aggregations (NEW)
│       └── index.ts      # Public API
├── stores/
│   └── filtersStore.ts   # Zustand stores para filtros globales y dashboard
├── hooks/
├── types/
└── constants/
```

## CRP Portal Service (SOLID)

Servicio de datos para el CRP Portal de ThinkPaladar, implementado siguiendo principios SOLID.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CRP Portal Service                        │
│                      (Public API)                            │
├─────────────────────────────────────────────────────────────┤
│  companies.ts  │  brands.ts  │  areas.ts  │  restaurants.ts │
│                │             │            │                  │
│  fetchCompanies│  fetchBrands│ fetchAreas │ fetchRestaurants│
│  fetchById     │  fetchById  │ fetchById  │ fetchById       │
├─────────────────────────────────────────────────────────────┤
│                       orders.ts                              │
│              (Order data & aggregations)                     │
│  fetchCrpOrdersRaw │ fetchCrpOrdersAggregated │ Comparison  │
├─────────────────────────────────────────────────────────────┤
│                      mappers.ts                              │
│           (Data transformation layer)                        │
├─────────────────────────────────────────────────────────────┤
│                       types.ts                               │
│    (Database types: DbCrpOrderHead, PORTAL_IDS, etc.)       │
├─────────────────────────────────────────────────────────────┤
│                       utils.ts                               │
│            (Shared utility functions)                        │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Portal ID Grouping (Deduplicacion por Nombre)

Las tablas dimensionales (`dt_store`, `dt_address`) contienen registros duplicados para la misma marca/direccion cuando operan en multiples plataformas (Glovo, UberEats, JustEat).

**Problema**: La misma marca "26KG Pasta Fresca" puede tener 4 IDs diferentes (uno por cada portal).

**Solucion**: Agrupacion por nombre que mantiene todos los IDs relacionados.

#### Tipos con allIds

```typescript
interface Brand {
  id: string;           // ID primario (mas reciente)
  allIds: string[];     // TODOS los IDs que comparten este nombre
  // ...otros campos
}

interface Restaurant {
  id: string;           // ID primario
  allIds: string[];     // TODOS los IDs que comparten esta direccion
  // ...otros campos
}
```

#### Funciones de Agrupacion (utils.ts)

| Funcion | Descripcion |
|---------|-------------|
| `groupByName` | Agrupa por nombre, devuelve primary + allIds |
| `groupAddressesByName` | Agrupa direcciones con normalizacion (C/, Calle, Carrer) |
| `normalizeAddress` | Normaliza direcciones para comparacion |

#### Flujo de Filtrado

1. Usuario selecciona marca "26KG Pasta Fresca" en UI
2. UI almacena el `id` primario (ej: "123")
3. `useControllingData` expande el ID a `allIds: ["123", "456", "789"]`
4. La query de pedidos usa TODOS los IDs
5. Se capturan pedidos de todas las plataformas

```typescript
// En useControllingData.ts
const expandedBrandIds = useMemo(
  () => expandBrandIds(brandIds, brands),
  [brandIds, brands]
);

// expandBrandIds busca la marca y devuelve brand.allIds
```

### Orders Service (Datos de Ventas Reales)

El modulo `orders.ts` proporciona acceso a datos de ventas reales desde la tabla `crp_portal__ft_order_head`.

#### Tabla de Origen: `crp_portal__ft_order_head`

| Campo | Columna | Descripcion |
|-------|---------|-------------|
| ID Pedido | `pk_uuid_order` | UUID unico del pedido |
| Compania | `pfk_id_company` | FK a dt_company |
| Marca | `pfk_id_store` | FK a dt_store |
| Direccion | `pfk_id_store_address` | FK a dt_address |
| Canal/Portal | `pfk_id_portal` | ID del portal de delivery |
| Fecha/Hora | `td_creation_time` | Timestamp de creacion |
| Importe Total | `amt_total_price` | EUR del pedido |
| Descuentos | `amt_promotions` | EUR en promociones |
| Reembolsos | `amt_refunds` | EUR reembolsado |

#### Mapeo de Canales (Portal IDs)

| Portal ID | Canal |
|-----------|-------|
| `E22BC362-2` | Glovo |
| `3CCD6861` | UberEats |
| *(pendiente)* | JustEat |

#### Funciones Disponibles

```typescript
import {
  fetchCrpOrdersRaw,
  fetchCrpOrdersAggregated,
  fetchCrpOrdersComparison,
  PORTAL_IDS
} from '@/services/crp-portal';

// Datos crudos de pedidos
const orders = await fetchCrpOrdersRaw({
  companyIds: [1, 2],
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});

// Datos agregados (totales, por canal)
const aggregation = await fetchCrpOrdersAggregated({
  companyIds: [1],
  channelIds: ['glovo', 'ubereats'],
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});
// Returns: {
//   totalRevenue, totalOrders, avgTicket, totalDiscounts, totalRefunds,
//   netRevenue, promotionRate, refundRate, avgDiscountPerOrder,
//   uniqueCustomers, ordersPerCustomer,
//   byChannel: { glovo, ubereats, justeat }
// }

// Comparacion con periodo anterior
const comparison = await fetchCrpOrdersComparison(currentParams, previousParams);
// Returns: {
//   current: OrdersAggregation,
//   previous: OrdersAggregation,
//   changes: {
//     revenueChange, ordersChange, avgTicketChange,
//     netRevenueChange, discountsChange, refundsChange,
//     promotionRateChange, refundRateChange,
//     uniqueCustomersChange, ordersPerCustomerChange
//   }
// }
```

#### KPIs Calculados

| KPI | Calculo | Fuente |
|-----|---------|--------|
| **Ventas** | `SUM(amt_total_price)` | Real |
| **Pedidos** | `COUNT(pk_uuid_order)` | Real |
| **Ticket Medio** | `Ventas / Pedidos` | Real |
| **Reembolsos** | `SUM(amt_refunds)` | Real |
| **Promos/Descuentos** | `SUM(amt_promotions)` | Real |
| **Net Revenue** | `Ventas - Reembolsos` | Real |
| **Promotion Rate %** | `Promos / Ventas * 100` | Real |
| **Refund Rate %** | `Reembolsos / Ventas * 100` | Real |
| **Avg Discount/Order** | `Promos / Pedidos` | Real |
| **Clientes Unicos** | `COUNT(DISTINCT cod_id_customer)` | Real |
| **Pedidos/Cliente** | `Pedidos / Clientes Unicos` | Real |

#### Campo `cod_id_customer`

El campo `cod_id_customer` en `crp_portal__ft_order_head` permite:
- Conteo de clientes unicos por periodo
- Calculo de frecuencia de compra (pedidos/cliente)
- Analisis por canal de clientes unicos

### Principios SOLID Aplicados

| Principio | Implementacion |
|-----------|----------------|
| **Single Responsibility** | Cada modulo tiene una sola razon para cambiar |
| **Open/Closed** | Extensible sin modificar codigo existente |
| **Liskov Substitution** | Tipos de retorno consistentes en funciones similares |
| **Interface Segregation** | Interfaces especificas para cada entidad |
| **Dependency Inversion** | Depende de abstracciones (types), no concreciones |

### Uso

```typescript
import {
  fetchCrpCompanies,
  fetchCrpBrands,
  fetchCrpRestaurants
} from '@/services/crp-portal';

// Fetch companies (solo status validos)
const companies = await fetchCrpCompanies();

// Fetch brands por company
const brands = await fetchCrpBrands(['1', '2']);

// Fetch restaurants con filtros
const restaurants = await fetchCrpRestaurants({
  companyIds: ['1'],
  areaIds: ['10']
});
```

### Status de Companias Validos

```typescript
const VALID_COMPANY_STATUSES = [
  'Onboarding',
  'Cliente Activo',
  'Stand By',
  'PiP'
];
```

## Controlling Dashboard

### Arquitectura de Datos

```
┌──────────────────────────────────────────────────────────────┐
│                    ControllingPage.tsx                        │
│                   (Presentation Layer)                        │
├──────────────────────────────────────────────────────────────┤
│                  useControllingData.ts                        │
│            (Orchestration & Data Merging)                     │
│     - Combina datos demo con datos reales                     │
│     - Aplica filtros de canal/marca/area                      │
├──────────────────────────────────────────────────────────────┤
│                   useOrdersData.ts                            │
│              (React Query Hook - SOLID)                       │
│     - Fetches real order data from CRP Portal                 │
│     - Calculates period comparisons                           │
├──────────────────────────────────────────────────────────────┤
│                services/crp-portal/orders.ts                  │
│                (Data Access Layer - SOLID)                    │
│     - fetchCrpOrdersRaw / Aggregated / Comparison             │
├──────────────────────────────────────────────────────────────┤
│                    Supabase (Database)                        │
│              crp_portal__ft_order_head                        │
└──────────────────────────────────────────────────────────────┘
```

### Hooks del Controlling

| Hook | Responsabilidad | Ubicacion |
|------|-----------------|-----------|
| `useControllingData` | Orquesta datos demo + reales, aplica filtros | `features/controlling/hooks/` |
| `useOrdersData` | Fetch de datos reales con React Query | `features/controlling/hooks/` |

### Uso de useOrdersData

```typescript
import { useOrdersData } from '@/features/controlling';

const { data, isLoading, error } = useOrdersData({
  companyIds: ['1', '2'],           // String IDs (se convierten a number)
  brandIds: ['10'],                  // Opcional
  channelIds: ['glovo', 'ubereats'], // Opcional
  dateRange: { start: new Date(), end: new Date() },
  datePreset: '30d'
});

// data.current: OrdersAggregation del periodo actual
// data.previous: OrdersAggregation del periodo anterior
// data.changes: { revenueChange, ordersChange, avgTicketChange } en %
```

### Flujo de Datos Real

1. Usuario selecciona companias en filtro global (Sidebar)
2. `useControllingData` lee filtros del store (Zustand)
3. `useOrdersData` fetch datos de `crp_portal__ft_order_head`
4. Se calculan agregaciones (totales, por canal)
5. Se compara con periodo anterior
6. Datos reales sobreescriben datos demo en el dashboard

## Calendario de Campanas

### Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                      CalendarPage.tsx                         │
│                    (Orchestration Layer)                      │
├──────────────────────────────────────────────────────────────┤
│  CalendarView  │  CalendarSidebar  │  CampaignEditor         │
│  (Main View)   │  (Filters)        │  (Wizard 5 steps)       │
├──────────────────────────────────────────────────────────────┤
│  useCampaignsByMonth  │  useCalendarEvents  │  useWeather    │
│  (localStorage demo)  │  (Supabase)         │  (Open-Meteo)  │
├──────────────────────────────────────────────────────────────┤
│                     Data Sources                              │
│  localStorage        │  calendar_events   │  Open-Meteo API  │
│  (tphub_campaigns)   │  (Supabase)        │  (forecast/hist) │
└──────────────────────────────────────────────────────────────┘
```

### Componentes Principales

| Componente | Responsabilidad |
|------------|-----------------|
| `CalendarPage` | Orquestacion, filtros, modales |
| `CalendarView` | Vista mensual con header de navegacion |
| `CalendarGrid` | Grid 7x6 con dias del mes |
| `CalendarDay` | Celda individual: clima, eventos, campanas |
| `CalendarSidebar` | Mini calendario, filtros de plataforma/estado |
| `CampaignEditor` | Wizard 5 pasos para crear campanas |

### Sistema de Campanas (Demo Mode)

Actualmente usa **localStorage** para persistencia (modo demo).
Configurado en `features/calendar/hooks/useCampaigns.ts`:

```typescript
const USE_LOCAL_STORAGE = true;  // Cambiar a false para usar Supabase
const STORAGE_KEY = 'tphub_campaigns';
```

#### Hooks de Campanas

| Hook | Funcion |
|------|---------|
| `useCampaignsByMonth` | Fetch campanas por mes/restaurantes |
| `useCreateCampaign` | Crear nueva campana |
| `useUpdateCampaign` | Actualizar campana existente |
| `useDeleteCampaign` | Eliminar campana |
| `useCancelCampaign` | Cancelar campana (status='cancelled') |

#### Wizard de Creacion (5 pasos)

1. **Plataforma**: Glovo / UberEats / JustEat / Google Ads
2. **Tipo**: BOGO, Descuento %, Envio Gratis, etc.
3. **Configuracion**: Campos dinamicos segun tipo
4. **Fechas**: Selector con eventos y clima
5. **Revisar**: Resumen antes de crear

#### Estados de Campana

| Status | Descripcion | Calculo automatico |
|--------|-------------|-------------------|
| `scheduled` | Programada (futuro) | `startDate > today` |
| `active` | Activa (en curso) | `startDate <= today <= endDate` |
| `completed` | Completada (pasado) | `endDate < today` |
| `cancelled` | Cancelada manualmente | Usuario cancela |

### Integracion Meteorologica

Usa **Open-Meteo API** (gratuita, sin API key).

#### Fuentes de Datos

| Tipo | API | Rango |
|------|-----|-------|
| **Pronostico** | `api.open-meteo.com/v1/forecast` | Hoy + 16 dias |
| **Historico** | `archive-api.open-meteo.com/v1/archive` | Datos pasados |

#### Hooks de Clima

```typescript
import { useWeatherByMonth, useWeatherByRestaurant } from '@/features/calendar';

// Clima mensual (historico + pronostico)
const { data: forecasts } = useWeatherByMonth(restaurant, year, month);

// Clima por restaurante (7 dias)
const { data: weather } = useWeatherByRestaurant(restaurant);
```

#### Requisitos para Clima

El clima requiere un **restaurante con coordenadas**:
- `restaurant.latitude` debe existir
- `restaurant.longitude` debe existir

Si no hay coordenadas, se muestra mensaje:
> "Selecciona un establecimiento con coordenadas para ver el clima"

#### Iconos de Clima (WMO Codes)

| Codigo | Condicion | Icono |
|--------|-----------|-------|
| 0 | Despejado | Sun |
| 1-3 | Parcialmente nublado | CloudSun |
| 45-48 | Niebla | CloudFog |
| 51-67 | Lluvia | CloudRain |
| 71-77 | Nieve | CloudSnow |
| 80-82 | Chubascos | CloudRainWind |
| 95-99 | Tormenta | CloudLightning |

### Eventos del Calendario

Eventos almacenados en Supabase (`calendar_events`):

#### Categorias

| Categoria | Icono | Color |
|-----------|-------|-------|
| `holiday` | Flag | Rojo |
| `sports` | Trophy | Verde |
| `entertainment` | Tv | Purpura |
| `commercial` | ShoppingBag | Ambar |

#### Filtros de Region

- **Nacional (ES)**: Festivos de toda Espana
- **Regional (ES-XX)**: Festivos de comunidad autonoma

### Uso del Calendario

```typescript
// En CalendarPage.tsx
const { data: campaigns } = useCampaignsByMonth(
  restaurantIds,
  currentMonth.year,
  currentMonth.month
);

const { data: events } = useCalendarEventsByMonth(
  year, month, regionCode
);

const { data: weather } = useWeatherByMonth(
  selectedRestaurant, year, month
);

<CalendarView
  campaigns={campaigns}
  events={events}
  weatherForecasts={weather}
  onDayClick={handleDayClick}
/>
```

## Proyeccion de Ventas (Sales Projection)

### Componentes SOLID

| Componente | Responsabilidad |
|------------|-----------------|
| `SalesProjection` | Dashboard: scorecards, chart, tabla colapsable |
| `SalesProjectionSetup` | Wizard 4 pasos: canales, inversion, baseline, targets |
| `SalesProjectionWarning` | Alerta 60 dias antes del fin |

### Wizard de Setup (4 pasos)

1. **Canales**: Seleccion Glovo/UberEats/JustEat
2. **Inversion**: % maximo ADS y Promos (global o por canal)
3. **Baseline**: Confirmar facturacion mes anterior
4. **Targets**: Tabla de objetivos por canal/mes (6 meses)

### Dashboard

- **Scorecards**: Ventas/ADS/Promos (objetivo grande + real pequeno)
- **Chart**: AreaChart objetivo vs real, linea mes actual
- **Tabla**: Colapsable "Ajustar objetivos", edicion por canal/mes

### Tipos

```typescript
type SalesChannel = 'glovo' | 'ubereats' | 'justeat';
type SalesInvestmentMode = 'per_channel' | 'global';

interface SalesProjectionConfig {
  activeChannels: SalesChannel[];
  investmentMode: SalesInvestmentMode;
  maxAdsPercent: InvestmentConfig | number;
  maxPromosPercent: InvestmentConfig | number;
  startDate: string;
  endDate: string;
}
```

## Objetivos Estrategicos

### Arquitectura

Los objetivos estrategicos usan referencias CRP Portal (IDs como TEXT) en lugar de FKs a tablas internas.

```
┌──────────────────────────────────────────────────────────────┐
│                    StrategicPage.tsx                          │
│                   (Presentation Layer)                        │
├──────────────────────────────────────────────────────────────┤
│  ObjectiveCard  │  StrategicObjectiveEditor  │  TaskCalendar │
├──────────────────────────────────────────────────────────────┤
│                  useStrategicData.ts                          │
│               (React Query Hooks)                             │
├──────────────────────────────────────────────────────────────┤
│                services/supabase-data.ts                      │
│      fetchStrategicObjectives / createStrategicObjective      │
│            (Mock mode or Supabase real)                       │
├──────────────────────────────────────────────────────────────┤
│                    Supabase (Database)                        │
│   strategic_objectives (company_id, brand_id, address_id)    │
└──────────────────────────────────────────────────────────────┘
```

### Tabla: `strategic_objectives`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `company_id` | TEXT | CRP Portal company ID (requerido) |
| `brand_id` | TEXT | CRP Portal brand/store ID (opcional) |
| `address_id` | TEXT | CRP Portal address ID (opcional) |
| `title` | TEXT | Titulo del objetivo |
| `category` | ENUM | finanzas, operaciones, clientes, marca, reputacion, proveedores, menu |
| `horizon` | ENUM | short (0-3m), medium (3-12m), long (+1a) |
| `status` | ENUM | pending, in_progress, completed |
| `responsible` | ENUM | thinkpaladar, cliente, ambos, plataforma |
| `objective_type_id` | TEXT | Referencia a objectiveConfig |
| `field_data` | JSONB | Datos dinamicos segun tipo de objetivo |
| `evaluation_date` | DATE | Fecha limite |

### Categorias

| ID | Color | Icono |
|----|-------|-------|
| `finanzas` | Verde | TrendingUp |
| `operaciones` | Azul | Clock |
| `clientes` | Naranja | Users |
| `marca` | Rosa | Tag |
| `reputacion` | Ambar | Star |
| `proveedores` | Gris | Handshake |
| `menu` | Indigo | UtensilsCrossed |

### Componentes

| Componente | Descripcion |
|------------|-------------|
| `ObjectiveCard` | Card con estado dropdown, progreso KPI |
| `StrategicObjectiveEditor` | Modal edicion con selector de scope |
| `StrategicTaskCalendar` | Vista calendario estilo Notion |
| `AuditScopeSelector` | Selector cascada Company → Brand → Address (compartido) |

### Hooks

```typescript
import {
  useStrategicObjectives,      // Fetch objectives por companyIds
  useCreateStrategicObjective, // Crear objetivo
  useUpdateStrategicObjective, // Actualizar objetivo
  useDeleteStrategicObjective, // Eliminar objetivo
  useStrategicTasks,           // Tareas vinculadas a objetivos
  useGenerateTasksForObjective // Generar tareas automaticas
} from '@/features/strategic/hooks';

// Ejemplo de uso
const { objectives, objectivesByHorizon, stats, isLoading } = useStrategicObjectives();
```

### Sistema de Progreso y Health Status

El sistema de progreso calcula automaticamente el estado de salud de cada objetivo basado en:

| Metrica | Descripcion |
|---------|-------------|
| `progressPercentage` | Progreso actual hacia el objetivo |
| `expectedProgress` | Progreso esperado basado en tiempo transcurrido |
| `healthStatus` | on_track, at_risk, off_track, completed, exceeded |
| `velocity` | Velocidad de cambio (unidades/dia) |
| `projectedValue` | Valor proyectado al llegar a la fecha limite |
| `willComplete` | Si alcanzara el objetivo al ritmo actual |
| `trend` | up, down, stable |

#### Calculo de Progreso

```typescript
// Para objetivos de INCREMENTO:
progress = (current - baseline) / (target - baseline) * 100

// Para objetivos de DECREMENTO:
progress = (baseline - current) / (baseline - target) * 100
```

#### Calculo de Health Status

```typescript
ratio = actualProgress / expectedProgress

if (ratio >= 0.9) return 'on_track';    // Verde
if (ratio >= 0.7) return 'at_risk';     // Amarillo
return 'off_track';                      // Rojo
```

#### Hook useObjectiveProgress

```typescript
import { useObjectiveProgress } from '@/features/strategic/hooks';

const progress = useObjectiveProgress({ objective });

// Devuelve:
// progress.currentValue - Valor actual del KPI
// progress.progressPercentage - % de progreso
// progress.healthStatus - 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'exceeded'
// progress.velocity - Cambio por dia
// progress.projectedValue - Proyeccion al deadline
// progress.willComplete - true/false
// progress.trend - 'up' | 'down' | 'stable'
// progress.daysRemaining - Dias hasta deadline
```

### Componentes Visuales

| Componente | Descripcion | Props |
|------------|-------------|-------|
| `ProgressCircle` | Circulo SVG con porcentaje | value, size, color |
| `HealthBadge` | Badge con icono y estado | status, size, showLabel |
| `TrendIndicator` | Flecha con velocidad | trend, velocity, unit |
| `TaskEmptyState` | Estado vacio con sugerencias inteligentes | objective, onAddTask |

```typescript
import {
  ProgressCircle,
  HealthBadge,
  TrendIndicator,
  TaskEmptyState
} from '@/features/strategic/components';
```

### Sistema de Compartir Objetivos

Permite compartir objetivos con clientes via URL publica sin autenticacion.

#### Servicio shareLinks.ts

```typescript
import {
  createShareLink,
  updateShareLink,
  deleteShareLink,
  regenerateShareLinkToken,
  getShareLinkUrl,
  isShareLinkValid,
} from '@/services/shareLinks';
```

#### Hook useShareLinkManager

```typescript
import { useShareLinkManager } from '@/features/strategic/hooks';

const {
  shareLink,       // Datos del enlace
  hasLink,         // Si existe enlace
  url,             // URL completa
  isActive,        // Si esta activo
  viewCount,       // Veces visto
  create,          // Crear nuevo enlace
  toggleActive,    // Activar/desactivar
  setExpiration,   // Poner fecha limite
  regenerate,      // Regenerar token
  remove,          // Eliminar
  copyToClipboard, // Copiar al portapapeles
} = useShareLinkManager(objectiveId);
```

#### Ruta Publica

| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/shared/:token` | `SharedObjectivePage` | Vista publica de objetivo |

### Migracion Supabase

**Archivo**: `supabase/migrations/011_strategic_objectives_standalone.sql`

Crea:
- Tabla `strategic_objectives` con company_id, brand_id, address_id (TEXT)
- Tabla `strategic_tasks` vinculada a objectives
- Tipos ENUM (objective_horizon, objective_status, objective_category, objective_responsible)
- Indices y triggers de updated_at
- RLS permisivo (puede restringirse despues)

## Sistema de Exportacion

### Formatos Soportados

| Formato | Libreria | Caracteristicas |
|---------|----------|-----------------|
| **PDF** | jsPDF + jspdf-autotable | Branding completo, tablas formateadas |
| **Excel** | xlsx | Multiples hojas, formato de celdas |
| **CSV** | Nativo | Datos crudos, compatible con cualquier herramienta |

### Branding ThinkPaladar

Todos los PDFs incluyen:
- Logo circular "TP" (azul primario)
- Header: "ThinkPaladar - Consultoria de Delivery"
- Titulo y subtitulo del reporte
- Footer: Fecha, numero de pagina, copyright

### Componentes

| Componente | Ubicacion | Funcion |
|------------|-----------|---------|
| `ExportButtons` | `components/common/` | Dropdown/inline buttons para exportar |
| `ExportPreviewModal` | `components/common/` | Preview real del PDF en iframe |

### Patron de Uso

```typescript
// En cada pagina que exporta:
const buildExportData = useCallback(() => {
  // Construir datos para exportacion
  return { ... };
}, [data]);

const generatePdfBlob = useCallback((): Blob => {
  const exportData = buildExportData();
  return generateXxxPdfBlob(exportData);
}, [buildExportData]);

<ExportButtons
  onExport={handleExport}
  getPreviewData={getPreviewData}
  generatePdfBlob={generatePdfBlob}
  previewTitle="Titulo"
/>
```

### Funciones de Export (`utils/export.ts`)

- `exportXxxToPDF()`: Genera y descarga PDF
- `exportXxxToExcel()`: Genera y descarga XLSX
- `exportXxxToCSV()`: Genera y descarga CSV
- `generateXxxPdfBlob()`: Genera Blob para preview

## Seguridad

- Solo @thinkpaladar.com
- RLS por compania asignada
- Roles: admin, consultant, viewer

## Comandos

```bash
npm run dev      # localhost:5173
npm run build    # Build produccion
npm run lint     # ESLint
```

## Variables de Entorno

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_DEV_AUTH_BYPASS=true  # Mock data
```

## Convenciones

- Componentes: `PascalCase.tsx`
- Hooks: `use*.ts`
- Stores: `*Store.ts`
- SOLID: Single Responsibility, Open/Closed, Dependency Inversion

## Paleta de Colores ThinkPaladar

| Nombre | Hex | Tailwind Class | Uso |
|--------|-----|----------------|-----|
| **Primario** | `#095789` | `primary-600` | Botones principales, enlaces, elementos destacados |
| **Primario claro** | `#e8f4fa` | `primary-50` | Fondos de badges, hover states |
| **Fondo claro** | `#f3f7f9` | `gray-50` | Fondos alternativos a blanco |
| **Acento naranja** | `#ffa166` | `accent-400` | Iconos puntuales, alertas, romper monotonia |

### Escala de Primarios (Azul)
```
primary-50:  #e8f4fa  - Fondos muy claros
primary-100: #c5e3f3  - Hover sobre fondos claros
primary-200: #9dd0eb  - Bordes suaves
primary-300: #6bb8e0  - Iconos secundarios
primary-400: #3a9fd4  - Elementos interactivos hover
primary-500: #0b7bb8  - Texto secundario destacado
primary-600: #095789  - COLOR PRINCIPAL (botones, enlaces)
primary-700: #074567  - Hover en botones
primary-800: #053448  - Active states
primary-900: #03222e  - Texto muy destacado
```

### Escala de Acentos (Naranja)
```
accent-400:  #ffa166  - Iconos, badges destacados
accent-500:  #ff8533  - Hover en elementos naranja
```

### Uso en Tailwind
```tsx
// Botones principales
<button className="bg-primary-600 hover:bg-primary-700 text-white">

// Fondos alternativos
<div className="bg-gray-50">

// Badges destacados
<span className="bg-primary-50 text-primary-700">

// Iconos de acento
<Icon className="text-accent-400">
```

## Dashboard Filters (Reutilizables)

### Componentes de Filtros

| Componente | Descripcion | Props |
|------------|-------------|-------|
| `DashboardFilters` | Contenedor de todos los filtros | `excludeChannels?: ChannelId[]` |
| `ChannelSelector` | Botones Glovo/UberEats/JustEat | `excludeChannels?: ChannelId[]` |
| `DateRangePicker` | Selector de rango de fechas | `value, presetId, onChange` |
| `BrandSelector` | Dropdown de marcas | - |
| `AreaSelector` | Dropdown de areas | - |
| `EstablishmentSelector` | Dropdown de establecimientos | - |

### Presets de Fecha

| ID | Label | Descripcion |
|----|-------|-------------|
| `this_week` | Esta semana | Lunes actual a hoy |
| `this_month` | Este mes | Dia 1 a hoy |
| `last_week` | La semana pasada | Lunes a domingo anterior |
| `last_month` | El mes pasado | Mes completo anterior |
| `last_7_days` | Los ultimos 7 dias | Hoy - 6 dias |
| `last_30_days` | Los ultimos 30 dias | Hoy - 29 dias |
| `last_12_weeks` | Ultimas 12 semanas | ~3 meses |
| `last_12_months` | Ultimos 12 meses | ~1 ano |
| `custom` | Personalizar | Calendario manual |

### Stores (Zustand)

```typescript
// Filtro global (persiste en Sidebar)
const { companyIds, setCompanyIds } = useGlobalFiltersStore();

// Filtros de dashboard (por pagina)
const {
  brandIds, setBrandIds,
  areaIds, setAreaIds,
  channelIds, setChannelIds,
  dateRange, datePreset, setDatePreset
} = useDashboardFiltersStore();
```

## Tareas Pendientes

### Objetivos Estrategicos - Activar Supabase

**Estado actual**: Modo mock activo (`VITE_DEV_AUTH_BYPASS=true`) - guarda en localStorage

**Pasos para activar Supabase:**

1. **Ejecutar migracion en Supabase SQL Editor**:
   ```sql
   -- Copiar contenido de:
   -- supabase/migrations/011_strategic_objectives_standalone.sql
   ```

2. **Cambiar variable de entorno** en `.env.local`:
   ```diff
   - VITE_DEV_AUTH_BYPASS=true
   + VITE_DEV_AUTH_BYPASS=false
   ```

3. **Reiniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Verificar**:
   - Ir a `/strategic`
   - Crear objetivo seleccionando empresa del dropdown
   - Verificar en Supabase Table Editor que el registro existe

### Refactorizacion - Duplicidad de Codigo (COMPLETADO)

**Componente EntityScopeSelector:**

- **Solucion aplicada**: El componente ahora se llama `EntityScopeSelector` y esta en `components/common/`
- Se mantiene alias `AuditScopeSelector` para backward compatibility
- Nuevo prop `summaryLabel` permite personalizar el texto del resumen

**Archivos modificados:**

- `components/common/EntityScopeSelector.tsx` - Nuevo componente compartido
- `components/common/index.ts` - Exports actualizados
- `features/audits/components/index.ts` - Re-exporta desde common
- `features/strategic/components/StrategicObjectiveEditor.tsx` - Usa EntityScopeSelector

### Calendario - Migracion a Supabase (SOLUCIONADO)

**Solucion aplicada**: Migracion `013_calendar_campaigns_crp_refs.sql` añade columnas CRP:

- `crp_restaurant_id TEXT` - ID del restaurante en CRP Portal
- `crp_company_id TEXT` - ID de la compañía en CRP Portal
- `crp_brand_id TEXT` - ID de la marca en CRP Portal

El hook `useCampaigns.ts` ahora soporta ambos modos (localStorage y Supabase).
Para activar Supabase:

```typescript
// En useCampaigns.ts
const USE_LOCAL_STORAGE = false;  // Activar Supabase
```

### Sistema de Invitaciones de Usuarios (NUEVO)

**Archivos creados:**

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/012_user_invitations.sql` | Tabla `user_invitations` + trigger |
| `src/services/invitations.ts` | CRUD invitaciones + Magic Link |
| `src/features/admin/hooks/useInvitations.ts` | React Query hooks |
| `src/features/admin/components/InviteUserModal.tsx` | Modal para invitar usuarios |
| `src/features/admin/components/PendingInvitations.tsx` | Lista de invitaciones |

**Flujo de invitación:**

1. Admin va a `/admin` → "Invitar usuario"
2. Introduce email, rol y compañías pre-asignadas
3. Se crea registro en `user_invitations` con config
4. Se envía Magic Link via `supabase.auth.signInWithOtp`
5. Usuario hace click → crea cuenta automáticamente
6. Trigger `on_profile_created_apply_invitation` aplica rol/compañías

**Activar en producción:**

1. Ejecutar `012_user_invitations.sql` en Supabase SQL Editor
2. Ejecutar `013_calendar_campaigns_crp_refs.sql` en Supabase SQL Editor

**Tipos añadidos a `models.ts`:**

- `InvitationStatus`: 'pending' | 'accepted' | 'expired' | 'cancelled'
- `UserInvitation`: Interfaz completa de invitación
- `DbUserInvitation`: Tipo de base de datos

### Multi-Portal ID Grouping (COMPLETADO)

**Problema resuelto**: Las marcas/direcciones tenian IDs duplicados por portal (Glovo, Uber, JustEat).

**Solucion implementada**:

- `Brand` y `Restaurant` ahora tienen campo `allIds: string[]`
- `groupByName` y `groupAddressesByName` en `utils.ts` para agrupar por nombre
- `useControllingData` expande IDs seleccionados a todos los IDs relacionados
- Los filtros de pedidos ahora capturan datos de todas las plataformas

**Archivos modificados:**

- `src/types/models.ts` - Agregado `allIds` a Brand y Restaurant
- `src/services/crp-portal/utils.ts` - Funciones de agrupacion
- `src/services/crp-portal/mappers.ts` - Mappers con allIds parameter
- `src/services/crp-portal/brands.ts` - Usa `groupByName`
- `src/services/crp-portal/restaurants.ts` - Usa `groupAddressesByName`
- `src/features/controlling/hooks/useControllingData.ts` - Expansion de IDs

### Filtros de Fecha

- El calendario personalizado no aparece al seleccionar "Personalizar"
- Los filtros de fecha no actualizan datos correctamente en algunos casos

---

*Enero 2026 - Sistema de Invitaciones de Usuarios y Tracking de Acciones*
