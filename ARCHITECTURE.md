# TPHub - Arquitectura del Sistema

## Índice
1. [Modelo de Datos](#1-modelo-de-datos)
2. [Layout del Sistema](#2-layout-del-sistema)
3. [Conexión a Datos](#3-conexión-a-datos)
4. [CRP Portal Service (SOLID)](#4-crp-portal-service-solid)
5. [Infraestructura CDK](#5-infraestructura-cdk)
6. [Sistema de Tareas Estratégicas](#6-sistema-de-tareas-estratégicas)
7. [Sistema de Exportación](#7-sistema-de-exportación)
8. [Invalidación de Cache](#8-invalidación-de-cache-react-query)
9. [Convenciones de Código](#9-convenciones-de-código)

---

## 1. Modelo de Datos

### Diagrama de Relaciones (ACTUALIZADO)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Company   │       │    Brand    │
│ @thinkpala- │──────▶│ (Compañía)  │──────▶│   (Marca)   │
│  dar.com    │ N:M   │             │ 1:N   │             │
└─────────────┘       └─────────────┘       └─────────────┘
                                                  │
                      Ej: Restalia,               │ 1:N
                      Alsea, Grupo Vips           ▼
                                            ┌─────────────┐
                      Ej: 100 Montaditos,   │    Area     │
                      TGB, Foster's         │  (Ciudad)   │
                                            └─────────────┘
                                                  │
                      Ej: Madrid,                 │ 1:N
                      Barcelona, Valencia         ▼
                                            ┌─────────────┐
                                            │ Restaurant  │
                                            │   (Local)   │
                                            └─────────────┘
                      Ej: Gran Vía 42,            │
                      Paseo de Gracia 15          │ N:M
                                                  ▼
                                            ┌─────────────┐
                                            │   Channel   │
                                            │  (Canal)    │
                                            └─────────────┘

                      Ej: Glovo, UberEats, JustEat
```

### Jerarquía de Filtros

```
═══════════════════════════════════════════════════════════════════════════════
FILTRO GLOBAL (Navbar - aplica a TODO el portal)
═══════════════════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMPAÑÍA: Selector múltiple (1, varias, o todas)                           │
│  - Persiste en TODAS las páginas                                            │
│  - Estilo: UberEats Manager dropdown                                        │
│  - Keyboard: Cmd+K                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
FILTROS DE DASHBOARD (dentro de cada página)
═══════════════════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────────────────┐
│  MARCA     │  ÁREA       │  RESTAURANTE  │  CANAL      │  FECHA            │
│  Multiple  │  Multiple   │  Multiple     │  Multiple   │  DateRange        │
│  Cmd+⇧+M   │  Cmd+⇧+A    │  Cmd+⇧+R      │  Cmd+⇧+C    │  Cmd+⇧+F          │
│            │             │               │             │                   │
│  Depende   │  Depende    │  Depende de   │  Glovo      │  Presets:         │
│  de        │  de         │  Marca +      │  UberEats   │  7d, 30d, 90d     │
│  Compañía  │  Marca      │  Área         │  JustEat    │  + custom         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comportamiento de Reset

| Al cambiar... | Se resetea | Se mantiene |
|---------------|------------|-------------|
| Compañía | Marca, Área, Restaurante | Canal, Fecha |
| Marca | Área, Restaurante | Canal, Fecha |
| Área | Restaurante | Canal, Fecha |

### Interfaces TypeScript (ACTUALIZADAS)

```typescript
// src/types/models.ts

// ============================================
// CHANNEL (Canal de delivery)
// ============================================
export type ChannelId = 'glovo' | 'ubereats' | 'justeat';

export interface Channel {
  id: ChannelId;
  name: string;
  color: string;
  logoUrl: string;
  isActive: boolean;
}

// ============================================
// USER (Consultor ThinkPaladar)
// ============================================
export interface User {
  id: string;
  email: string;                    // Debe ser @thinkpaladar.com
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'consultant' | 'viewer';
  assignedCompanyIds: string[];     // Compañías asignadas a este consultor
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================
// COMPANY (Compañía/Holding - Nivel 1)
// ============================================
// Ej: Restalia Holding, Alsea, Grupo Vips
export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;

  // Configuración de reportes
  reportSettings: {
    primaryColor?: string;
    emailRecipients: string[];
    scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  };

  contractStartDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BRAND (Marca - Nivel 2)
// ============================================
// Ej: 100 Montaditos, TGB, La Sureña, Foster's Hollywood
export interface Brand {
  id: string;
  companyId: string;                // FK → Company
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// AREA (Ciudad/Zona - Nivel 3)
// ============================================
// Ej: Madrid, Barcelona, Valencia
export interface Area {
  id: string;
  brandId: string;                  // FK → Brand
  name: string;
  slug: string;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// RESTAURANT (Local/Restaurante - Nivel 4)
// ============================================
// Ej: Calle Gran Vía 42, Paseo de Gracia 15
export interface Restaurant {
  id: string;
  areaId: string;                   // FK → Area
  brandId: string;                  // FK → Brand (denormalizado para queries)
  companyId: string;                // FK → Company (denormalizado para queries)

  name: string;
  address: string;
  postalCode?: string;

  // Identificadores en cada canal
  channelIds: {
    glovo?: string;
    ubereats?: string;
    justeat?: string;
  };

  // Canales activos para este restaurante
  activeChannels: ChannelId[];

  coordinates?: {
    lat: number;
    lng: number;
  };

  isActive: boolean;
  createdAt: string;
}

// ============================================
// PRODUCT
// ============================================
export interface Product {
  id: string;
  clientId: string;                 // FK → Client
  locationId?: string;              // FK → Location (null si es global del cliente)

  name: string;
  description?: string;
  category: string;                 // "Hamburguesas", "Bebidas", etc.

  // Precios por plataforma (pueden variar)
  pricing: {
    glovo?: number;
    ubereats?: number;
  };

  imageUrl?: string;
  isActive: boolean;

  // Identificadores en cada plataforma
  platformIds: {
    glovo?: string;
    ubereats?: string;
  };
}

// ============================================
// ORDER
// ============================================
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;              // Desnormalizado para histórico
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: {
    name: string;
    price: number;
  }[];
}

export interface Order {
  id: string;
  externalId: string;               // ID de la plataforma (Glovo/UberEats)

  // Relaciones
  clientId: string;                 // FK → Client
  locationId: string;               // FK → Location
  platform: PlatformId;             // 'glovo' | 'ubereats'

  // Estado
  status: OrderStatus;

  // Items
  items: OrderItem[];

  // Financiero
  subtotal: number;                 // Suma de items
  platformFee: number;              // Comisión de la plataforma
  deliveryFee: number;
  discount: number;
  total: number;                    // Total cobrado al cliente final
  netRevenue: number;               // Lo que recibe el restaurante

  // Cliente final (anonimizado según necesidad)
  customer?: {
    name?: string;
    isNewCustomer: boolean;
  };

  // Tiempos
  orderedAt: string;                // Timestamp del pedido
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;

  // Metadata scraping
  scrapedAt: string;                // Cuándo se extrajo de la plataforma
}

// ============================================
// TIPOS DE FILTROS (2 NIVELES)
// ============================================
export interface DateRange {
  start: Date;
  end: Date;
}

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'year' | 'custom';

// FILTRO GLOBAL (Navbar - persiste en todas las páginas)
export interface GlobalFilters {
  companyIds: string[];             // Múltiple selección (vacío = todas)
}

// FILTROS DE DASHBOARD (por página)
export interface DashboardFilters {
  brandIds: string[];               // Múltiple selección (vacío = todas)
  areaIds: string[];                // Múltiple selección (vacío = todas)
  restaurantIds: string[];          // Múltiple selección (vacío = todos)
  channelIds: ChannelId[];          // Múltiple selección (vacío = todos)
  dateRange: DateRange;
  datePreset: DatePreset;
}

// Keyboard Shortcuts
// ==================
// Cmd+K         → Abrir selector de Compañía
// Cmd+Shift+M   → Focus en filtro Marca
// Cmd+Shift+A   → Focus en filtro Área
// Cmd+Shift+R   → Focus en filtro Restaurante
// Cmd+Shift+C   → Focus en filtro Canal
// Cmd+Shift+F   → Focus en filtro Fecha
```

### Relaciones Detalladas (ACTUALIZADAS)

| Relación | Tipo | Descripción |
|----------|------|-------------|
| User → Company | N:M | Un consultor puede gestionar múltiples compañías. |
| Company → Brand | 1:N | Una compañía tiene múltiples marcas (ej: Restalia → 100 Montaditos, TGB, La Sureña). |
| Brand → Area | 1:N | Una marca opera en múltiples ciudades/áreas. |
| Area → Restaurant | 1:N | Un área tiene múltiples restaurantes/locales. |
| Restaurant → Channel | N:M | Un restaurante puede operar en múltiples canales (Glovo, UberEats, JustEat). |
| Restaurant → Order | 1:N | Cada pedido pertenece a un restaurante específico. |
| Order → Channel | N:1 | Cada pedido viene de un canal específico. |
| Order → Product | N:M | Un pedido contiene múltiples productos (a través de OrderItem). |

---

## 2. Layout del Sistema

### Estructura Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TopBar (h-16, z-40, fixed top)                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Logo TPHub                                       Help │ Notif │ User  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│   Sidebar    │  Main Content (pt-16, pl-[260px] o pl-[72px])                │
│   (fixed)    │                                                              │
│   w-[260px]  │  ┌────────────────────────────────────────────────────────┐ │
│   colapsado: │  │  DashboardFilters                                       │ │
│   w-[72px]   │  │  [Marca] [Área] [Restaurante] [Canal] [Fecha]          │ │
│              │  └────────────────────────────────────────────────────────┘ │
│  ┌────────┐  │                                                              │
│  │Company │  │  Contenido de la página actual                              │
│  │Selector│  │                                                              │
│  └────────┘  │                                                              │
│              │                                                              │
│  Navigation  │                                                              │
│  Links       │                                                              │
│              │                                                              │
│  ┌────────┐  │                                                              │
│  │Collapse│  │                                                              │
│  │ Button │  │                                                              │
│  └────────┘  │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### Componentes de Layout

#### TopBar (`src/components/layout/TopBar/`)
- **Posición**: Fixed top, z-40, h-16
- **Contenido**:
  - Izquierda: Logo TPHub
  - Derecha: Botón ayuda, notificaciones, menú usuario
- **Responsive**: Se mantiene igual en todas las resoluciones

#### Sidebar (`src/components/layout/Sidebar/`)
- **Posición**: Fixed left, debajo de TopBar (top-16)
- **Ancho**: 260px expandido, 72px colapsado
- **Estado**: Persistido en `useUIStore` (Zustand)
- **Contenido**:
  - **CompanySelector** (arriba): Selector de compañías con búsqueda fuzzy
  - **Navigation**: Links a las diferentes secciones
  - **Collapse button** (abajo): Toggle para colapsar/expandir

#### CompanySelector (`src/features/clients/components/`)
- **Trigger**: Botón en sidebar que abre modal
- **Modal**: Command palette estilo (createPortal)
- **Características**:
  - Búsqueda fuzzy con Fuse.js
  - Selección múltiple
  - Tabs: "Todos" / "Seleccionados"
  - Acciones: "Seleccionar todos" / "Borrar" / "Aplicar"
  - Keyboard: Cmd+K para abrir, ESC para cerrar, flechas para navegar
  - Scroll lock del body cuando está abierto

#### MainLayout (`src/components/layout/MainLayout/`)
- **Estructura**: Wrapper que incluye TopBar, Sidebar y main content
- **Padding dinámico**: `pl-[260px]` o `pl-[72px]` según estado del sidebar
- **Transición**: 300ms ease-in-out para cambios de padding

#### AuthLayout (`src/components/layout/AuthLayout/`)
- **Propósito**: Layout para páginas de autenticación (login, register, forgot-password)
- **Diseño**: Fondo con gradiente azul oscuro (#0f172a → #1e3a5f → #1e40af)
- **Efectos visuales**:
  - Ripple: Grid interactivo con efecto de onda en hover (Aceternity UI)
  - Glow effect: Resplandor circular en esquina superior izquierda
- **Estructura**:
  - Header con logo "thinkpaladar" (pointer-events-auto)
  - Main content centrado (Outlet para LoginPage, etc.)
- **Interactividad**: pointer-events-none en wrapper permite que hover llegue al Ripple
- **SOLID**: SRP (solo layout), OCP (extensible via Outlet), DIP (abstracción via Outlet)

### Hooks de Layout

```typescript
// src/hooks/useScrollLock.ts
// Bloquea el scroll del body cuando un modal está abierto
useScrollLock(isLocked: boolean)

// src/hooks/useSidebarCollapse.ts
// Estado del sidebar colapsado (alias de useUIStore)
const { isSidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useSidebarCollapse()
```

### Stores de UI

```typescript
// src/stores/uiStore.ts
interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}
```

---

## 3. Conexión a Datos

### Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                         FUENTES DE DATOS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐         ┌─────────────┐                       │
│   │   Glovo     │         │  UberEats   │                       │
│   │   Portal    │         │   Portal    │                       │
│   └──────┬──────┘         └──────┬──────┘                       │
│          │                       │                               │
│          │     Web Scraping      │                               │
│          ▼                       ▼                               │
│   ┌─────────────────────────────────────┐                       │
│   │           AWS S3 (Raw Data)          │                       │
│   └──────────────────┬──────────────────┘                       │
│                      │                                           │
│                      ▼                                           │
│   ┌─────────────────────────────────────┐                       │
│   │         AWS Athena (Query)           │                       │
│   │         Database: playground         │                       │
│   └──────────────────┬──────────────────┘                       │
│                      │                                           │
│                      ▼                                           │
│   ┌─────────────────────────────────────┐                       │
│   │   AWS Lambda (5 handlers)            │                       │
│   │   Node.js 20, @aws-sdk/client-athena │                       │
│   └──────────────────┬──────────────────┘                       │
│                      │                                           │
│                      ▼                                           │
│   ┌─────────────────────────────────────┐                       │
│   │   AWS API Gateway (HTTP API)         │                       │
│   │   CORS: localhost:5173, tphub.domain │                       │
│   └──────────────────┬──────────────────┘                       │
│                      │                                           │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (TPHub)                         │
│   src/services/api.ts → React Query hooks → Components          │
└─────────────────────────────────────────────────────────────────┘
```

### Schema de Athena

**Database**: `playground`

| Tabla | Propósito | Campos Clave |
|-------|-----------|--------------|
| `crp_portal__dt_company` | Compañías | pk_id_company, des_company_name |
| `crp_portal__dt_store` | Marcas/Brands | pk_id_store, des_store, pfk_id_company |
| `crp_portal__dt_address` | Establecimientos | pk_id_address, des_address, pfk_id_company |
| `crp_portal__ct_business_area` | Áreas geográficas | pk_id_business_area, des_business_area |
| `crp_portal__ft_order_head` | Pedidos (principal) | pfk_id_portal, pfk_id_company, td_creation_time, amt_total_price |

### API Endpoints Implementados

| Método | Ruta | Parámetros | Descripción |
|--------|------|------------|-------------|
| GET | `/api/companies` | - | Lista compañías activas |
| GET | `/api/stores` | `companyIds` | Marcas filtradas por compañía |
| GET | `/api/addresses` | `companyIds`, `storeIds` | Establecimientos filtrados |
| GET | `/api/areas` | - | Áreas geográficas |
| GET | `/api/channels` | - | Canales disponibles (desde pedidos) |

### Mapeo de Nomenclatura

| Frontend | Athena | API Response |
|----------|--------|--------------|
| Company | crp_portal__dt_company | ApiCompany |
| Brand/Store | crp_portal__dt_store | ApiStore |
| Restaurant/Address | crp_portal__dt_address | ApiAddress |
| Area | crp_portal__ct_business_area | ApiArea |
| Channel | pfk_id_portal (en orders) | ApiChannel |

### Frontend API Service

```typescript
// src/services/api.ts

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiService {
  async getCompanies(): Promise<ApiCompany[]>
  async getStores(companyIds?: string[]): Promise<ApiStore[]>
  async getAddresses(companyIds?: string[], storeIds?: string[]): Promise<ApiAddress[]>
  async getAreas(): Promise<ApiArea[]>
  async getChannels(): Promise<ApiChannel[]>
}

export const api = new ApiService(API_BASE);
```

### Hooks con Fallback

Los hooks usan la API real cuando `VITE_API_URL` está configurada, con fallback a datos demo:

```typescript
// Ejemplo: src/features/clients/hooks/useCompanies.ts
const API_ENABLED = !!import.meta.env.VITE_API_URL;

async function fetchCompanies(userId: string): Promise<Company[]> {
  if (API_ENABLED) {
    const apiCompanies = await api.getCompanies();
    return apiCompanies.map(mapApiCompanyToCompany);
  }
  return DEMO_COMPANIES; // Fallback para desarrollo
}
```

---

## 4. CRP Portal Service (SOLID)

### Arquitectura del Servicio

El servicio CRP Portal implementa un acceso modular a los datos de Supabase siguiendo principios SOLID.

```
src/services/crp-portal/
├── types.ts          # Database types & domain interfaces
├── utils.ts          # Shared utility functions
├── mappers.ts        # Data transformation layer
├── companies.ts      # Company-specific operations
├── brands.ts         # Brand-specific operations
├── areas.ts          # Area-specific operations
├── restaurants.ts    # Restaurant-specific operations
├── portals.ts        # Portal-specific operations
└── index.ts          # Public API (barrel export)
```

### Diagrama de Capas

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
│                      mappers.ts                              │
│           (Data transformation layer)                        │
├─────────────────────────────────────────────────────────────┤
│                       types.ts                               │
│              (Database & domain types)                       │
├─────────────────────────────────────────────────────────────┤
│                       utils.ts                               │
│            (Shared utility functions)                        │
└─────────────────────────────────────────────────────────────┘
```

### Principios SOLID Aplicados

| Principio | Implementación |
|-----------|----------------|
| **S** - Single Responsibility | Cada módulo tiene una única responsabilidad. `companies.ts` solo maneja operaciones de compañías. |
| **O** - Open/Closed | Extensible añadiendo nuevos módulos sin modificar los existentes. |
| **L** - Liskov Substitution | Todas las funciones `fetchX` retornan `Promise<Entity[]>` consistentemente. |
| **I** - Interface Segregation | Interfaces específicas por entidad: `DbCrpCompany`, `DbCrpStore`, etc. |
| **D** - Dependency Inversion | Módulos dependen de abstracciones (types), no de implementaciones concretas. |

### Módulos

#### types.ts
Define tipos de base de datos y dominio:

```typescript
// Status válidos para empresas
export const VALID_COMPANY_STATUSES = [
  'Onboarding',
  'Cliente Activo',
  'Stand By',
  'PiP'
] as const;

// Tipos de base de datos (prefijo Db)
export interface DbCrpCompany {
  pk_id_company: number;
  des_company_name: string;
  des_status: string;
  // ...
}

// Interfaces de parámetros
export interface FetchRestaurantsParams {
  companyIds?: string[];
  areaIds?: string[];
}
```

#### utils.ts
Funciones helper reutilizables:

```typescript
// Deduplicación por clave primaria
export function deduplicateBy<T>(
  items: T[],
  keyFn: (item: T) => string | number
): T[]

// Conversión de IDs string a number
export function parseNumericIds(ids: string[]): number[]

// Generación de slugs
export function generateSlug(text: string): string
```

#### mappers.ts
Transformación de datos DB → Domain:

```typescript
// Mapea fila de DB a modelo de dominio
export function mapCompany(db: DbCrpCompany): Company
export function mapBrand(db: DbCrpStore): Brand
export function mapRestaurant(db: DbCrpAddress): Restaurant
export function mapArea(db: DbCrpBusinessArea): Area
export function mapPortal(db: DbCrpPortal): Portal
```

#### Módulos de Entidad (companies.ts, brands.ts, etc.)

Cada módulo sigue el mismo patrón:

```typescript
// Constante de tabla
const TABLE_NAME = 'crp_portal__dt_company';

// Fetch múltiple con filtros
export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .in('des_status', VALID_COMPANY_STATUSES)
    .order('des_company_name');

  if (error) throw new Error(`Error fetching companies: ${error.message}`);

  const unique = deduplicateBy(data, (c) => c.pk_id_company);
  return unique.map(mapCompany);
}

// Fetch por ID
export async function fetchCompanyById(id: string): Promise<Company | null> {
  // ...
}
```

### API Pública (index.ts)

```typescript
// Types
export type { DbCrpCompany, DbCrpStore, ... } from './types';
export { VALID_COMPANY_STATUSES } from './types';

// Services (con alias Crp para claridad)
export { fetchCompanies as fetchCrpCompanies } from './companies';
export { fetchBrands as fetchCrpBrands } from './brands';
export { fetchAreas as fetchCrpAreas } from './areas';
export { fetchRestaurants as fetchCrpRestaurants } from './restaurants';
export { fetchPortals as fetchCrpPortals } from './portals';

// Mappers (para testing/extensión)
export { mapCompany, mapBrand, mapRestaurant, ... } from './mappers';

// Utils
export { deduplicateBy } from './utils';
```

### Uso en Hooks

```typescript
// src/features/clients/hooks/useCompanies.ts
import { fetchCrpCompanies } from '@/services/crp-portal';

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.list(),
    queryFn: fetchCrpCompanies,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Notas Importantes

1. **Deduplicación**: Todas las funciones `fetch` deduplican por clave primaria para manejar posibles duplicados en la DB.

2. **Filtrado de Brands en Restaurants**: El filtro `pfk_id_store` (brand) NO se aplica en `fetchRestaurants` porque muchas direcciones no tienen este campo. El filtrado por marca se hace a nivel de hook filtrando por las compañías de las marcas seleccionadas.

3. **Status de Compañías**: Solo se retornan compañías con status válidos (Onboarding, Cliente Activo, Stand By, PiP).

---

## 5. Infraestructura CDK

### Estructura del Proyecto

```
tphub/
├── src/                          # Frontend React
├── infra/                        # CDK Infrastructure
│   ├── bin/
│   │   └── tphub-infra.ts       # Entry point CDK
│   ├── lib/
│   │   └── tphub-stack.ts       # Stack principal
│   ├── cdk.json
│   ├── tsconfig.json
│   └── package.json
└── lambda/                       # Lambda Functions
    ├── shared/
    │   ├── athena-client.ts     # Cliente Athena reutilizable
    │   ├── response.ts          # Helpers de respuesta HTTP
    │   └── types.ts             # Tipos compartidos
    ├── companies/
    │   └── handler.ts           # GET /api/companies
    ├── stores/
    │   └── handler.ts           # GET /api/stores
    ├── addresses/
    │   └── handler.ts           # GET /api/addresses
    ├── areas/
    │   └── handler.ts           # GET /api/areas
    ├── channels/
    │   └── handler.ts           # GET /api/channels
    ├── package.json
    └── tsconfig.json
```

### Stack CDK (tphub-stack.ts)

El stack crea los siguientes recursos:

| Recurso | Tipo | Propósito |
|---------|------|-----------|
| IAM Role | `iam.Role` | Permisos para Lambda (Athena, S3, Glue) |
| Lambda Functions (x5) | `lambda.Function` | Handlers para cada endpoint |
| HTTP API | `HttpApi` | API Gateway v2 (más económico que REST) |
| Routes | `HttpRoute` | GET para cada endpoint |

### Permisos IAM (Lambda Role)

```typescript
// Permisos necesarios para queries Athena
const lambdaRole = new iam.Role(this, 'LambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyArn('service-role/AWSLambdaBasicExecutionRole'),
  ],
});

// Athena
lambdaRole.addToPolicy(new iam.PolicyStatement({
  actions: ['athena:StartQueryExecution', 'athena:GetQueryExecution', 'athena:GetQueryResults'],
  resources: ['*'],
}));

// S3 (resultados de Athena)
lambdaRole.addToPolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:GetBucketLocation'],
  resources: ['arn:aws:s3:::thinkpaladar-athena-query-result/*', 'arn:aws:s3:::thinkpaladar-athena-query-result'],
}));

// Glue (catálogo de datos)
lambdaRole.addToPolicy(new iam.PolicyStatement({
  actions: ['glue:GetTable', 'glue:GetTables', 'glue:GetDatabase', 'glue:GetDatabases'],
  resources: ['*'],
}));
```

### Lambda Configuration

```typescript
// Configuración común para todas las Lambdas
const lambdaDefaults = {
  runtime: lambda.Runtime.NODEJS_20_X,
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  role: lambdaRole,
  environment: {
    ATHENA_DATABASE: 'playground',
    S3_OUTPUT_LOCATION: 's3://thinkpaladar-athena-query-result/tphub-api/',
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
  },
};
```

### CORS Configuration

```typescript
const httpApi = new HttpApi(this, 'TpHubApi', {
  corsPreflight: {
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://tphub.thinkpaladar.com',
    ],
    maxAge: cdk.Duration.days(1),
  },
});
```

### Comandos de Deploy

```bash
# Desde la carpeta infra/
cd infra

# Primera vez: bootstrap CDK
npx cdk bootstrap aws://ACCOUNT_ID/eu-west-3

# Deploy
npx cdk deploy

# Deploy sin confirmación (CI/CD)
npx cdk deploy --require-approval never

# Ver diferencias antes de deploy
npx cdk diff

# Destruir stack
npx cdk destroy
```

### Variables de Entorno Post-Deploy

Después del deploy, añadir la URL del API Gateway a `.env.local`:

```bash
# .env.local
VITE_API_URL=https://xxxxxxxxxx.execute-api.eu-west-3.amazonaws.com
```

### Lambda Handler Pattern

```typescript
// lambda/companies/handler.ts
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { executeQuery } from '../shared/athena-client';
import { success, error } from '../shared/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const sql = `
      SELECT pk_id_company as id, des_company_name as name
      FROM playground.crp_portal__dt_company
      WHERE flg_deleted = 0
      ORDER BY des_company_name
    `;

    const { rows, executionTime } = await executeQuery<AthenaCompany>(sql);
    const companies = rows.map(row => ({ id: row.id, name: row.name }));

    return success(companies, { count: companies.length, executionTime });
  } catch (err) {
    return error('Failed to fetch companies', err);
  }
}
```

### Requisitos IAM para Deploy

El usuario que ejecuta `cdk deploy` necesita permisos para:
- CloudFormation (crear/actualizar stacks)
- IAM (crear roles)
- Lambda (crear funciones)
- API Gateway (crear APIs)
- S3 (bucket CDK bootstrap)

---

## 6. Sistema de Proyección de Ventas y Tareas Estratégicas

### Arquitectura del Módulo (SOLID)

```
src/features/strategic/
├── components/
│   ├── SalesProjection.tsx            # Dashboard: scorecards, chart, tabla
│   ├── SalesProjectionSetup.tsx       # Wizard 4 pasos configuración
│   ├── SalesProjectionWarning.tsx     # Alerta 60 días
│   ├── ObjectiveCard.tsx              # Card de objetivo con dropdown
│   ├── AddObjectiveCard.tsx           # Placeholder añadir objetivo
│   ├── StrategicObjectiveEditor.tsx   # Modal edición objetivos
│   ├── StrategicTaskCalendar.tsx      # Vista calendario Notion
│   ├── StrategicTaskCalendarItem.tsx  # Item individual calendario
│   ├── StrategicTaskDetailModal.tsx   # Modal detalle tarea
│   ├── StrategicTaskEditor.tsx        # Editor crear/editar tareas
│   ├── AvatarInitials.tsx             # Avatar con fallback iniciales
│   └── index.ts
├── config/
│   ├── objectiveConfig.ts             # Categorías, tipos, templates
│   └── index.ts
└── hooks/
    └── useStrategicData.ts            # Hooks objetivos y tareas
```

### Sistema de Proyección de Ventas

**Componentes SOLID:**

| Componente | Single Responsibility |
|------------|----------------------|
| `SalesProjection` | Dashboard: orquesta subcomponentes (Scorecard, ChartTooltip, TableRow) |
| `SalesProjectionSetup` | Wizard: orquesta Steps (ChannelStep, InvestmentStep, BaselineStep, TargetsStep) |
| `SalesProjectionWarning` | Modal alerta período finalizando |

**Wizard de Setup (4 pasos):**

```
1. Canales → 2. Inversión → 3. Baseline → 4. Targets
   (Multi)     (ADS/Promos)   (Mes ant.)    (6 meses)
```

**Tipos principales:**

```typescript
type SalesChannel = 'glovo' | 'ubereats' | 'justeat';
type SalesInvestmentMode = 'per_channel' | 'global';

interface SalesProjectionConfig {
  activeChannels: SalesChannel[];
  investmentMode: SalesInvestmentMode;
  maxAdsPercent: InvestmentConfig | number;  // Por canal o global
  maxPromosPercent: InvestmentConfig | number;
  startDate: string;
  endDate: string;
}

interface SalesProjectionData {
  config: SalesProjectionConfig;
  baselineRevenue: ChannelMonthEntry;     // Mes anterior
  targetRevenue: GridChannelMonthData;    // Objetivos
  actualRevenue: GridChannelMonthData;    // Real
  actualAds: GridChannelMonthData;
  actualPromos: GridChannelMonthData;
}
```

**Dashboard UI:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Proyección de ventas          [Canales] [👁 Real] [✏️]  │
├─────────────────────────────────────────────────────────────┤
│  VENTAS          ADS              PROMOS                    │
│  6.8k€ / 7.2k€   1.2k€ / 980€    800€ / 720€               │
│  +5% vs obj      18% bajo obj    10% bajo obj              │
├─────────────────────────────────────────────────────────────┤
│  [AreaChart: objetivo vs real con línea mes actual]         │
├─────────────────────────────────────────────────────────────┤
│          ⚙️ Ajustar objetivos ▼                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Tabs: Facturación | ADS | Promos]                      ││
│  │ [Tabla editable por canal/mes]                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Auto-Generación de Tareas

```
Usuario crea objetivo
        ↓
useCreateStrategicObjective() mutation
        ↓
1. createStrategicObjective() → INSERT objetivo
        ↓
2. generateTasksForObjective() → Buscar templates por objectiveTypeId
        ↓
3. Para cada template:
   - Calcular deadline = objetivo.evaluationDate + template.daysFromObjectiveDeadline
   - Crear tarea con is_auto_generated = true
        ↓
4. Invalidar queries → UI se actualiza
```

### Templates de Tareas

Los templates están definidos en `objectiveConfig.ts` como `OBJECTIVE_TASK_TEMPLATES`:

```typescript
export interface TaskTemplate {
  key: string;                          // Identificador único
  title: string;                        // Título de la tarea
  description?: string;                 // Descripción opcional
  responsible: ObjectiveResponsible;    // 'thinkpaladar' | 'cliente' | 'ambos' | 'plataforma'
  daysFromObjectiveDeadline: number;    // Días antes (-) o después (+) del deadline del objetivo
}

export const OBJECTIVE_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  incremento_facturacion: [
    { key: 'if_analysis', title: 'Analizar canales de bajo rendimiento', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'if_plan', title: 'Proponer plan de acción', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    // ... más tareas
  ],
  // ... ~30 tipos de objetivo
};
```

### Categorías de Objetivos

| ID | Label | Color | Tipos de Objetivo |
|----|-------|-------|-------------------|
| `finanzas` | Finanzas | Verde | incremento_facturacion, mejorar_margen, reducir_costes_ads, optimizar_promos |
| `operaciones` | Operaciones | Azul | tiempos_preparacion, reducir_errores, mejorar_disponibilidad, optimizar_horarios, reducir_cancelaciones |
| `clientes` | Clientes | Naranja | aumentar_recurrencia, captar_nuevos, mejorar_satisfaccion, fidelidad |
| `marca` | Marca | Rosa | packaging, sesion_fotos, descripcion_menu, rediseno_menu |
| `reputacion` | Reputación | Ámbar | subir_ratings, reducir_negativas, tiempo_respuesta |
| `proveedores` | Proveedores | Gris | negociar_condiciones, buscar_alternativas, evaluar_calidad |
| `menu` | Menú | Índigo | lanzar_producto, optimizar_carta, analizar_productos, ajustar_precios |

### Persistencia en Desarrollo (Mock Data)

Cuando `VITE_DEV_AUTH_BYPASS=true`, los datos se almacenan en localStorage:

```typescript
// src/services/mock-data.ts

const STORAGE_KEYS = {
  objectives: 'tphub_mock_objectives',
  tasks: 'tphub_mock_tasks',
  objCounter: 'tphub_mock_obj_counter',
  taskCounter: 'tphub_mock_task_counter',
};

// Funciones CRUD que persisten automáticamente
export function addMockStrategicObjective(input: StrategicObjectiveInput): StrategicObjective
export function updateMockStrategicObjective(id: string, updates: Partial<StrategicObjectiveInput>): StrategicObjective
export function deleteMockStrategicObjective(id: string): void
export function addMockStrategicTask(input: StrategicTaskInput): StrategicTask
export function updateMockStrategicTask(id: string, updates: Partial<StrategicTaskInput>): StrategicTask
export function deleteMockStrategicTask(id: string): void
```

### Componentes Clave

#### ObjectiveCard
- Status dropdown con animación "live-breathe" para objetivos activos
- Colores de categoría en badge e icono
- Barra de progreso de KPI con colores dinámicos
- Días restantes con indicadores de color (rojo/naranja/gris)

#### StrategicTaskCalendar
- Agrupa tareas por día (estilo Notion)
- Header con fecha (lun 21, mar 22...)
- Items con avatar, categoría badge, deadline
- Botón "+ Nueva" para crear manual

#### AvatarInitials
- Muestra imagen de avatar si está disponible
- Fallback a iniciales (de assigneeName o clientName)
- Colores distintos para ThinkPaladar vs Cliente

---

## 7. Sistema de Exportación

### Arquitectura de Exportación

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUJO DE EXPORTACIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Página (React)                                                 │
│   ├── buildExportData()  →  Construir datos normalizados        │
│   ├── getPreviewData()   →  Datos para tabla preview             │
│   └── generatePdfBlob()  →  Generar blob PDF para preview        │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  ExportButtons                           │   │
│   │   [PDF] [Excel] [CSV]  →  onClick → handleFormatClick    │   │
│   └─────────────────────────────────────────────────────────┘   │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                ExportPreviewModal                        │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │  PDF: iframe con blob URL                        │   │   │
│   │   │  Excel/CSV: tabla con datos                      │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │           [Descargar]  →  onConfirm(format)              │   │
│   └─────────────────────────────────────────────────────────┘   │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  utils/export.ts                         │   │
│   │   ├── exportXxxToPDF()    →  jsPDF + autotable          │   │
│   │   ├── exportXxxToExcel()  →  xlsx                        │   │
│   │   └── exportXxxToCSV()    →  Nativo                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes de Exportación

#### ExportButtons (`src/components/common/ExportButtons.tsx`)

```typescript
interface ExportButtonsProps {
  onExport: (format: ExportFormat) => void;
  getPreviewData?: () => PreviewTableData;
  generatePdfBlob?: () => Blob;          // Para preview PDF real
  previewTitle?: string;
  previewSubtitle?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'dropdown' | 'inline';
  size?: 'sm' | 'md';
}
```

- **Variante dropdown**: Botón "Exportar" con menú desplegable
- **Variante inline**: Tres botones separados (PDF, Excel, CSV)
- Si `getPreviewData` está definido, muestra preview antes de descargar

#### ExportPreviewModal (`src/components/common/ExportPreviewModal.tsx`)

```typescript
interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: ExportFormat) => void;
  format: ExportFormat;
  title: string;
  subtitle?: string;
  generatePdfBlob?: () => Blob;          // Genera PDF real para preview
  previewData: PreviewTableData;         // Fallback para Excel/CSV
  loading?: boolean;
}
```

- **PDF**: Muestra iframe con blob URL del PDF real
- **Excel/CSV**: Muestra tabla con datos
- **Controles de zoom**: +/- para ajustar escala del PDF
- **Cleanup**: Revoca blob URLs al cerrar

### Branding ThinkPaladar

```typescript
// src/utils/export.ts

const BRAND = {
  name: 'ThinkPaladar',
  tagline: 'Consultoría de Delivery',
  colors: {
    primary: [37, 99, 235],      // #2563eb (azul)
    secondary: [99, 102, 241],   // #6366f1 (índigo)
    accent: [16, 185, 129],      // #10b981 (verde)
    dark: [30, 41, 59],          // #1e293b (slate)
    gray: [100, 116, 139],       // #64748b
  },
  logoText: 'TP',
};
```

#### Header Brandeado

```typescript
function addBrandedHeader(doc: jsPDF, title: string, subtitle?: string): number {
  // Logo circular con "TP"
  doc.setFillColor(...BRAND.colors.primary);
  doc.circle(22, 18, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND.logoText, 22, 20, { align: 'center' });

  // Nombre de empresa
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFontSize(14);
  doc.text(BRAND.name, 35, 16);

  // Tagline
  doc.setTextColor(...BRAND.colors.gray);
  doc.setFontSize(9);
  doc.text(BRAND.tagline, 35, 22);

  // Línea separadora
  doc.setDrawColor(...BRAND.colors.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);

  // Título y subtítulo
  return yPos; // Posición Y para contenido
}
```

#### Footer Brandeado

```typescript
function addBrandedFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Línea separadora
    // Nombre empresa (izquierda)
    // Fecha (centro)
    // Página X de Y (derecha)
  }
}
```

### Funciones de Exportación

| Función | Formato | Descripción |
|---------|---------|-------------|
| `exportReputationToPDF` | PDF | Exporta datos de reputación |
| `exportReputationToExcel` | Excel | Múltiples hojas (summary, reviews) |
| `exportReputationToCSV` | CSV | Lista de reviews |
| `exportControllingToPDF` | PDF | KPIs y métricas financieras |
| `exportControllingToExcel` | Excel | Métricas por restaurante |
| `exportControllingToCSV` | CSV | Datos tabulares |
| `exportObjectivesTableToPDF` | PDF | Objetivos por restaurante/canal |
| `exportObjectivesTableToExcel` | Excel | Grid de objetivos |
| `exportObjectivesTableToCSV` | CSV | Datos planos |

### Generadores de Blob

Para el preview de PDF real, cada tipo de exportación tiene una función que retorna `Blob`:

```typescript
export function generateReputationPdfBlob(data: ReputationExportData): Blob {
  const doc = new jsPDF();
  // ... generar PDF con branding
  return doc.output('blob');  // Retorna Blob en vez de descargar
}
```

### Patrón de Implementación en Páginas

```typescript
// Ejemplo: ReputationPage.tsx

// 1. Construir datos de exportación
const buildExportData = useCallback((): ReputationExportData | null => {
  if (!data) return null;
  return {
    channelRatings: data.channelRatings.map(...),
    summary: { totalBilling: ..., totalRefunds: ... },
    errorTypes: data.errorTypes.map(...),
    reviews: data.reviews.map(...),
    dateRange: `${periodLabels.current} vs. ${periodLabels.comparison}`,
  };
}, [data, periodLabels]);

// 2. Handler de exportación
const handleExport = useCallback((format: ExportFormat) => {
  const exportData = buildExportData();
  if (!exportData) return;

  switch (format) {
    case 'pdf': exportReputationToPDF(exportData); break;
    case 'excel': exportReputationToExcel(exportData); break;
    case 'csv': exportReputationToCSV(exportData); break;
  }
}, [buildExportData]);

// 3. Generador de blob para preview
const generatePdfBlob = useCallback((): Blob => {
  const exportData = buildExportData();
  if (!exportData) throw new Error('No data available');
  return generateReputationPdfBlob(exportData);
}, [buildExportData]);

// 4. Datos para preview tabla (Excel/CSV)
const getPreviewData = useCallback((): PreviewTableData => {
  if (!data) return { headers: [], rows: [] };
  return {
    headers: ['Canal', 'Order ID', 'Fecha', ...],
    rows: data.reviews.slice(0, 15).map(...),
    totalRows: data.reviews.length,
  };
}, [data]);

// 5. Render
<ExportButtons
  onExport={handleExport}
  getPreviewData={getPreviewData}
  generatePdfBlob={generatePdfBlob}
  previewTitle="Reputación"
  previewSubtitle={`${periodLabels.current} vs. ${periodLabels.comparison}`}
/>
```

### Estructura de Datos de Exportación

```typescript
// Reputación
interface ReputationExportData {
  channelRatings: { channel: string; rating: number; totalReviews: number; trend: number }[];
  summary: { totalBilling: number; totalRefunds: number };
  errorTypes: { type: string; count: number; percentage: number }[];
  reviews: { id: string; channel: string; rating: number; comment: string; date: string }[];
  dateRange: string;
}

// Controlling
interface ControllingExportData {
  summary: { revenue: number; orders: number; avgTicket: number; ... };
  kpis: { restaurantName: string; channel: string; revenue: number; ... }[];
  dateRange: string;
}

// Objetivos
interface ObjectivesTableExportData {
  rows: {
    restaurantName: string;
    channel: string;
    months: { month: string; revenueTarget?: number; ... }[];
  }[];
  dateRange: string;
}
```

---

## 8. Invalidación de Cache (React Query)

### Estructura de Query Keys

```typescript
// src/constants/queryKeys.ts

export const queryKeys = {
  // Nivel 0: Usuario actual
  currentUser: ['user', 'current'] as const,

  // Nivel 1: Clientes
  clients: {
    all: ['clients'] as const,
    list: (userId: string) => ['clients', 'list', userId] as const,
    detail: (clientId: string) => ['clients', 'detail', clientId] as const,
    recent: (userId: string) => ['clients', 'recent', userId] as const,
  },

  // Nivel 2: Locations (dependen de clientId)
  locations: {
    all: (clientId: string) => ['locations', clientId] as const,
    list: (clientId: string) => ['locations', 'list', clientId] as const,
    detail: (clientId: string, locationId: string) =>
      ['locations', 'detail', clientId, locationId] as const,
  },

  // Nivel 3: Orders (dependen de clientId + filters)
  orders: {
    all: (clientId: string) => ['orders', clientId] as const,
    list: (clientId: string, filters: OrderFilters) =>
      ['orders', 'list', clientId, filters] as const,
    detail: (clientId: string, orderId: string) =>
      ['orders', 'detail', clientId, orderId] as const,
    infinite: (clientId: string, filters: OrderFilters) =>
      ['orders', 'infinite', clientId, filters] as const,
  },

  // Nivel 4: Analytics (dependen de clientId + filters)
  analytics: {
    all: (clientId: string) => ['analytics', clientId] as const,
    summary: (clientId: string, filters: AnalyticsFilters) =>
      ['analytics', 'summary', clientId, filters] as const,
    trends: (clientId: string, filters: AnalyticsFilters) =>
      ['analytics', 'trends', clientId, filters] as const,
    platforms: (clientId: string, filters: AnalyticsFilters) =>
      ['analytics', 'platforms', clientId, filters] as const,
    products: (clientId: string, filters: AnalyticsFilters) =>
      ['analytics', 'products', clientId, filters] as const,
  },

  // Products
  products: {
    all: (clientId: string) => ['products', clientId] as const,
    list: (clientId: string, filters?: ProductFilters) =>
      ['products', 'list', clientId, filters] as const,
  },
} as const;

// Tipos para filtros
export interface OrderFilters {
  platform?: PlatformId | 'all';
  locationId?: string | null;
  dateRange: DateRange;
  status?: OrderStatus[];
  page?: number;
  limit?: number;
}

export interface AnalyticsFilters {
  platform?: PlatformId | 'all';
  locationId?: string | null;
  dateRange: DateRange;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}
```

### Matriz de Invalidación

Cuando un filtro cambia, ¿qué se invalida?

```
┌──────────────────────┬──────────┬───────────┬──────────┬──────────┐
│ CAMBIO DE FILTRO     │ Clients  │ Locations │ Orders   │ Analytics│
├──────────────────────┼──────────┼───────────┼──────────┼──────────┤
│ Cambio de CLIENTE    │    -     │    ✓*     │    ✓*    │    ✓*    │
│ (Nivel 1)            │          │ (refetch) │ (refetch)│ (refetch)│
├──────────────────────┼──────────┼───────────┼──────────┼──────────┤
│ Cambio de PLATAFORMA │    -     │     -     │    ✓     │    ✓     │
│ (Nivel 2)            │          │           │ (filter) │ (filter) │
├──────────────────────┼──────────┼───────────┼──────────┼──────────┤
│ Cambio de LOCATION   │    -     │     -     │    ✓     │    ✓     │
│ (Nivel 3)            │          │           │ (filter) │ (filter) │
├──────────────────────┼──────────┼───────────┼──────────┼──────────┤
│ Cambio de FECHA      │    -     │     -     │    ✓     │    ✓     │
│ (Nivel 4)            │          │           │ (filter) │ (filter) │
└──────────────────────┴──────────┴───────────┴──────────┴──────────┘

✓* = Invalidar todo el prefijo (las queries dependientes usan nuevo clientId)
✓  = La query key incluye el filtro, React Query automáticamente refetcha
-  = No se afecta
```

### Implementación de Invalidación

```typescript
// src/hooks/useInvalidateOnFilterChange.ts

import { useQueryClient } from '@tanstack/react-query';
import { useFiltersStore } from '@/stores/filtersStore';
import { useEffect, useRef } from 'react';
import { queryKeys } from '@/constants/queryKeys';

export function useInvalidateOnFilterChange() {
  const queryClient = useQueryClient();
  const { activeClientId, platform, activeLocationId, dateRange } = useFiltersStore();

  const prevClientId = useRef(activeClientId);

  useEffect(() => {
    // Si cambió el cliente, invalida todo lo relacionado con el cliente anterior
    if (prevClientId.current !== activeClientId && prevClientId.current) {
      // Invalida locations, orders y analytics del cliente anterior
      queryClient.invalidateQueries({
        queryKey: queryKeys.locations.all(prevClientId.current)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(prevClientId.current)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.all(prevClientId.current)
      });
    }

    prevClientId.current = activeClientId;
  }, [activeClientId, queryClient]);

  // Para platform, location y dateRange no necesitamos invalidar manualmente
  // porque están incluidos en las query keys y React Query los trata como
  // queries diferentes
}
```

### Estrategia de Prefetching

```typescript
// src/hooks/usePrefetchClientData.ts

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';

export function usePrefetchClientData() {
  const queryClient = useQueryClient();

  // Prefetch cuando el usuario hace hover sobre un cliente en la lista
  const prefetchClient = async (clientId: string) => {
    // Prefetch locations (carga rápida, pequeño payload)
    await queryClient.prefetchQuery({
      queryKey: queryKeys.locations.list(clientId),
      queryFn: () => locationsService.getByClient(clientId),
      staleTime: 5 * 60 * 1000, // 5 minutos
    });

    // Prefetch analytics summary (el usuario probablemente va al dashboard)
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.summary(clientId, defaultFilters),
      queryFn: () => analyticsService.getSummary(clientId, defaultFilters),
      staleTime: 2 * 60 * 1000, // 2 minutos (datos más volátiles)
    });
  };

  return { prefetchClient };
}
```

### Configuración Global de Stale Times

```typescript
// src/app/providers/QueryProvider.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos por defecto
      gcTime: 30 * 60 * 1000,        // Garbage collection: 30 minutos
      retry: 1,
      refetchOnWindowFocus: false,   // Evitar refetch excesivo
    },
  },
});

// Stale times específicos por tipo de dato:
const STALE_TIMES = {
  clients: 10 * 60 * 1000,           // 10 min - cambian poco
  locations: 10 * 60 * 1000,         // 10 min - cambian poco
  orders: 2 * 60 * 1000,             // 2 min - pueden llegar nuevos
  analytics: 5 * 60 * 1000,          // 5 min - agregados
  products: 10 * 60 * 1000,          // 10 min - catálogo estable
};
```

---

## 9. Convenciones de Código

### Naming Conventions

#### Archivos y Carpetas

```
Tipo                    │ Convención              │ Ejemplo
────────────────────────┼─────────────────────────┼──────────────────────
Componentes React       │ PascalCase.tsx          │ ClientSelector.tsx
Hooks                   │ camelCase.ts            │ useClients.ts
                        │ (prefijo use)           │ useDebounce.ts
Stores (Zustand)        │ camelCase.ts            │ filtersStore.ts
                        │ (sufijo Store)          │ authStore.ts
Services                │ camelCase.ts            │ ordersService.ts
                        │ (sufijo Service)        │ analyticsService.ts
Types/Interfaces        │ camelCase.types.ts      │ orders.types.ts
                        │ (sufijo .types)         │ client.types.ts
Constants               │ camelCase.ts            │ queryKeys.ts
Utils                   │ camelCase.ts            │ formatters.ts
Test files              │ *.test.ts(x)            │ Button.test.tsx
```

#### Componentes

```typescript
// ✅ CORRECTO
export function ClientSelector() { }
export function OrdersTable() { }
export function MetricCard() { }

// ❌ INCORRECTO
export function clientSelector() { }  // No es PascalCase
export function Client_Selector() { } // No usar underscores
export default function() { }         // Evitar default exports anónimos
```

#### Variables y Funciones

```typescript
// Constantes globales: SCREAMING_SNAKE_CASE
const MAX_RECENT_CLIENTS = 5;
const API_BASE_URL = 'https://api.tphub.com';

// Variables y funciones: camelCase
const activeClientId = 'client-123';
function handleClientChange() { }

// Tipos e Interfaces: PascalCase
interface ClientData { }
type OrderStatus = 'pending' | 'delivered';

// Enums: PascalCase para el enum, SCREAMING_SNAKE_CASE para valores
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
}
```

### Estructura de un Feature Module

```
src/features/orders/
├── components/                 # Componentes específicos del feature
│   ├── OrdersTable.tsx
│   ├── OrdersFilters.tsx
│   ├── OrderRow.tsx
│   ├── OrderStatusBadge.tsx
│   └── index.ts               # Barrel export
│
├── hooks/                     # Hooks del feature
│   ├── useOrders.ts          # Hook principal de datos
│   ├── useOrderFilters.ts    # Hook de filtros locales
│   └── index.ts
│
├── services/                  # Servicios/API calls
│   ├── ordersService.ts
│   └── index.ts
│
├── store/                     # Store local (si aplica)
│   ├── ordersStore.ts
│   └── index.ts
│
├── types/                     # Tipos del feature
│   ├── orders.types.ts
│   └── index.ts
│
└── index.ts                   # Barrel export del feature
```

#### Ejemplo de Barrel Export

```typescript
// src/features/orders/index.ts
export * from './components';
export * from './hooks';
export * from './types';
// No exportar services ni stores directamente (usar hooks)
```

### Patrón para Crear Nuevos Hooks

```typescript
// src/features/orders/hooks/useOrders.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFiltersStore } from '@/stores/filtersStore';
import { ordersService } from '../services/ordersService';
import { queryKeys } from '@/constants/queryKeys';
import type { Order, OrderFilters } from '../types/orders.types';

/**
 * Hook para obtener lista de pedidos con filtros.
 *
 * Características:
 * - Usa filtros globales del store
 * - Cache automático con React Query
 * - Refetch cuando cambian los filtros
 *
 * @example
 * const { orders, isLoading, error } = useOrders();
 * const { orders } = useOrders({ status: ['delivered'] });
 */
export function useOrders(localFilters?: Partial<OrderFilters>) {
  const { activeClientId, platform, activeLocationId, dateRange } = useFiltersStore();

  // Merge global + local filters
  const filters: OrderFilters = {
    platform,
    locationId: activeLocationId,
    dateRange,
    ...localFilters,
  };

  return useQuery({
    queryKey: queryKeys.orders.list(activeClientId!, filters),
    queryFn: () => ordersService.getAll(activeClientId!, filters),
    enabled: !!activeClientId, // Solo ejecutar si hay cliente seleccionado
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener detalle de un pedido.
 */
export function useOrder(orderId: string) {
  const { activeClientId } = useFiltersStore();

  return useQuery({
    queryKey: queryKeys.orders.detail(activeClientId!, orderId),
    queryFn: () => ordersService.getById(activeClientId!, orderId),
    enabled: !!activeClientId && !!orderId,
  });
}

/**
 * Hook para exportar pedidos.
 */
export function useExportOrders() {
  const { activeClientId } = useFiltersStore();

  return useMutation({
    mutationFn: (filters: OrderFilters) =>
      ordersService.export(activeClientId!, filters),
    onSuccess: (data) => {
      // Descargar el archivo
      downloadFile(data.url, data.filename);
    },
  });
}
```

### Patrón para Crear Nuevos Services

```typescript
// src/features/orders/services/ordersService.ts

import { apiClient } from '@/services/api/client';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import type { Order, OrderFilters, PaginatedResponse } from '../types/orders.types';

/**
 * Servicio para operaciones de pedidos.
 * Todas las funciones son async y retornan Promises.
 */
export const ordersService = {
  /**
   * Obtiene lista de pedidos con paginación y filtros.
   */
  async getAll(
    clientId: string,
    filters: OrderFilters
  ): Promise<PaginatedResponse<Order>> {
    const params = buildQueryParams(filters);
    return apiClient.get<PaginatedResponse<Order>>(
      `${API_ENDPOINTS.orders.list(clientId)}?${params}`
    );
  },

  /**
   * Obtiene detalle de un pedido.
   */
  async getById(clientId: string, orderId: string): Promise<Order> {
    return apiClient.get<Order>(
      API_ENDPOINTS.orders.get(clientId, orderId)
    );
  },

  /**
   * Exporta pedidos a CSV/Excel.
   */
  async export(
    clientId: string,
    filters: OrderFilters
  ): Promise<{ url: string; filename: string }> {
    return apiClient.post(
      API_ENDPOINTS.orders.export(clientId),
      { filters }
    );
  },
};

// Helper para construir query params
function buildQueryParams(filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.platform && filters.platform !== 'all') {
    params.set('platform', filters.platform);
  }
  if (filters.locationId) {
    params.set('locationId', filters.locationId);
  }
  if (filters.dateRange) {
    params.set('startDate', filters.dateRange.start.toISOString());
    params.set('endDate', filters.dateRange.end.toISOString());
  }
  if (filters.status?.length) {
    params.set('status', filters.status.join(','));
  }
  if (filters.page) {
    params.set('page', String(filters.page));
  }
  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  return params;
}
```

### Patrón para Componentes

```typescript
// src/features/orders/components/OrdersTable.tsx

import { cn } from '@/utils/cn';
import { useOrders } from '../hooks/useOrders';
import { OrderRow } from './OrderRow';
import { Spinner, EmptyState, ErrorState } from '@/components/ui';
import type { OrdersTableProps } from './OrdersTable.types';

/**
 * Tabla de pedidos con loading, error y empty states.
 *
 * @example
 * <OrdersTable
 *   onRowClick={(order) => navigate(`/orders/${order.id}`)}
 * />
 */
export function OrdersTable({
  onRowClick,
  className,
  ...props
}: OrdersTableProps) {
  const { data: orders, isLoading, error, refetch } = useOrders();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message="No se pudieron cargar los pedidos"
        onRetry={refetch}
      />
    );
  }

  // Empty state
  if (!orders?.data.length) {
    return (
      <EmptyState
        title="Sin pedidos"
        description="No hay pedidos para los filtros seleccionados"
        icon="package"
      />
    );
  }

  // Data state
  return (
    <div className={cn('overflow-x-auto', className)} {...props}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              ID
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Plataforma
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Local
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
              Total
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Estado
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Fecha
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.data.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onClick={() => onRowClick?.(order)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Imports Ordenados

```typescript
// Orden de imports (usar plugin de ESLint para enforcement)

// 1. React/framework
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Librerías externas
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. Componentes internos (absolutos con @/)
import { Button, Card, Spinner } from '@/components/ui';
import { useFiltersStore } from '@/stores/filtersStore';

// 4. Imports relativos del mismo feature
import { useOrders } from '../hooks/useOrders';
import { OrderRow } from './OrderRow';

// 5. Types (siempre al final)
import type { Order } from '../types/orders.types';
import type { OrdersTableProps } from './OrdersTable.types';
```

---

## Decisiones Tomadas

| Aspecto | Decisión | Estado |
|---------|----------|--------|
| **Arquitectura de datos** | API Gateway + Lambda + Athena | ✅ Implementado |
| **Auth + Config** | Supabase | ✅ Configurado |
| **Queries de datos** | Lambda → Athena (database: playground) | ✅ Implementado |
| **Infrastructure as Code** | AWS CDK v2 (TypeScript) | ✅ Implementado |
| **Frontend API** | ApiService + React Query hooks | ✅ Implementado |

### Arquitectura Final Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (TPHub)                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Query Cache                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌─────────────────┐           ┌─────────────────┐              │
│  │    Supabase     │           │   HTTP API      │              │
│  │                 │           │  (API Gateway)  │              │
│  │ • Auth          │           │                 │              │
│  │ • Users         │           │ /api/companies  │              │
│  │                 │           │ /api/stores     │              │
│  │                 │           │ /api/addresses  │              │
│  │                 │           │ /api/areas      │              │
│  │                 │           │ /api/channels   │              │
│  └─────────────────┘           └────────┬────────┘              │
│                                         │                        │
│                                         ▼                        │
│                                ┌─────────────────┐              │
│                                │  Lambda (x5)    │              │
│                                │  Node.js 20     │              │
│                                └────────┬────────┘              │
│                                         │                        │
│                                         ▼                        │
│                                ┌─────────────────┐              │
│                                │  AWS Athena     │              │
│                                │  playground DB  │              │
│                                └─────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Responsabilidades por Capa

| Capa | Responsabilidad | Datos |
|------|-----------------|-------|
| **Supabase** | Auth, usuarios | Users (login @thinkpaladar.com) |
| **API Gateway** | HTTP API, CORS, routing | 5 endpoints GET |
| **Lambda** | Business logic, Athena queries | Node.js 20, 256MB, 30s timeout |
| **Athena** | SQL queries sobre S3 | Companies, Stores, Addresses, Areas, Channels |

### Código Fuente

| Ubicación | Contenido |
|-----------|-----------|
| `infra/` | CDK stack (TypeScript) |
| `lambda/` | Lambda handlers + shared utilities |
| `src/services/api.ts` | Frontend API service |
| `src/features/*/hooks/` | React Query hooks con fallback |

---

*Documento generado para TPHub - ThinkPaladar*
*Última actualización: Enero 2026 - Sistema de Exportación PDF/Excel/CSV con branding ThinkPaladar y preview real.*
