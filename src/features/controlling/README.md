# Feature: Controlling

Dashboard de KPIs financieros y rendimiento por canal/marca/área.

## Componentes Principales

### ControllingPage (`src/pages/controlling/ControllingPage.tsx`)

Página principal que incluye:

- **PortfolioCard**: KPIs principales (Ventas, Pedidos, Ticket Medio, etc.)
- **ChannelCard**: Rendimiento por canal (Glovo, UberEats, JustEat)
- **HierarchyTable**: Tabla desplegable de 4 niveles

### HierarchyTable

Tabla con jerarquía expandible:

```
Company → Store → Address → Portal
```

Características:
- Expandir/colapsar filas
- Métricas agregadas bottom-up
- Subrayado azul en nivel Company (`bg-primary-50/60`)
- Tabs de vista: Rendimiento, Operaciones, Publicidad, Promociones

## Hooks

### useControllingData (`hooks/useControllingData.ts`)

Hook de orquestación que:
- Lee filtros del store (Zustand)
- Llama a `useOrdersData` con los filtros
- Combina datos demo con datos reales
- Expande brand IDs (multi-portal)

```typescript
const { data, isLoading, error } = useControllingData();
```

### useOrdersData (`hooks/useOrdersData.ts`)

React Query hook para datos de pedidos:

```typescript
const { data, isLoading } = useOrdersData({
  companyIds: ['123'],
  startDate: new Date(),
  endDate: new Date(),
  datePreset: '30d'
});
```

Retorna:
- `data.current`: Métricas del período actual
- `data.previous`: Métricas del período anterior
- `data.changes`: Variaciones en %

### useHierarchyData (`hooks/useHierarchyData.ts`)

Hook para datos de jerarquía:

```typescript
const { rows, isLoading } = useHierarchyData(params);
```

## Estado (Zustand)

### useDashboardFiltersStore

```typescript
const {
  brandIds, setBrandIds,
  areaIds, setAreaIds,
  channelIds, setChannelIds,
  dateRange, datePreset, setDatePreset
} = useDashboardFiltersStore();
```

### useGlobalFiltersStore

```typescript
const { companyIds, setCompanyIds } = useGlobalFiltersStore();
```

## Tipos

### HierarchyRow

```typescript
interface HierarchyRow {
  id: string;
  level: 'company' | 'brand' | 'address' | 'channel';
  name: string;
  parentId?: string;
  companyId: string;
  brandId?: string;
  channelId?: ChannelId;
  ventas: number;
  ventasChange: number;
  pedidos: number;
  ticketMedio: number;
  nuevosClientes: number;
  porcentajeNuevos: number;
  // Métricas adicionales (opcionales)
  openTime?: number;
  ratioConversion?: number;
  tiempoEspera?: string;
  valoraciones?: number;
  inversionAds?: number;
  inversionPromos?: number;
}
```

## Flujo de Datos

```
┌─────────────────────────────────────────┐
│           ControllingPage               │
│         (Presentación)                  │
├─────────────────────────────────────────┤
│         useControllingData              │
│    (Orquestación + Filtros)             │
├─────────────────────────────────────────┤
│  useOrdersData  │  useHierarchyData     │
│  (React Query)  │  (React Query)        │
├─────────────────────────────────────────┤
│      services/crp-portal/orders.ts      │
│         (Acceso a datos)                │
├─────────────────────────────────────────┤
│              Supabase                   │
│     crp_portal__ft_order_head           │
└─────────────────────────────────────────┘
```

## Estado del Desarrollo

### Completado ✅

- Jerarquía 4 niveles con agregación bottom-up
- KPIs principales con variación vs período anterior
- Rendimiento por canal (Glovo, UberEats)
- Filtros: Company, Brand, Channel, DateRange
- Exportación PDF/Excel/CSV
- Deduplicación de snapshots mensuales
- Mapeo correcto address → store

### En Progreso 🚧

- Ordenación de columnas en tabla
- Métricas adicionales (Open Time, ROAS)

### Pendiente 📋

- Filtros en tabla de jerarquía
- Drill-down a nivel de pedido individual
