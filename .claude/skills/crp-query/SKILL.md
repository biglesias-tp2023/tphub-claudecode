---
name: crp-query
description: Query CRP Portal data (companies, brands, orders, customers)
---

# Query CRP Portal Data

Help build queries against the CRP Portal data service. All functions are in `src/services/crp-portal/`.

## Data Hierarchy

```
Company -> Brand -> Area -> Restaurant -> Channel
Example: Restalia -> 100 Montaditos -> Madrid -> Gran Via 42 -> Glovo
```

## Available Functions

### Entity Fetching

```typescript
import {
  fetchCrpCompanies,        // All companies (valid statuses only)
  fetchCrpCompanyById,       // Single company
  fetchCrpBrands,            // Brands by companyIds
  fetchCrpBrandById,         // Single brand
  fetchCrpAreas,             // Areas by companyIds
  fetchCrpAreaById,          // Single area
  fetchCrpRestaurants,       // Restaurants with filters
  fetchCrpRestaurantById,    // Single restaurant
  fetchCrpPortals,           // All portals (Glovo, UberEats, JustEat)
} from '@/services/crp-portal';
```

### Order Data & Aggregations

```typescript
import {
  fetchCrpOrdersRaw,           // Raw order rows
  fetchCrpOrdersAggregated,    // Totals + by-channel breakdown
  fetchCrpOrdersComparison,    // Current vs previous period
  fetchHierarchyData,          // Orders grouped by brand/area/restaurant
  fetchControllingMetricsRPC,  // Server-side aggregation (RPC)
  fetchHierarchyDataRPC,       // Server-side hierarchy (RPC)
  PORTAL_IDS,                  // { GLOVO: 'E22BC362-2', UBEREATS: '3CCD6861' }
} from '@/services/crp-portal';
```

### Customer Analytics

```typescript
import {
  fetchCustomerMetrics,          // Unique customers, frequency, retention
  fetchCustomerMetricsByChannel,  // Per-channel customer breakdown
  fetchCustomerCohorts,           // Monthly cohort analysis
  fetchChurnRiskCustomers,        // At-risk customers
  fetchMultiPlatformAnalysis,     // Cross-platform customer behavior
  fetchRevenueConcentration,      // Revenue distribution analysis
  fetchPostPromoHealth,           // Post-promotion customer health
} from '@/services/crp-portal';
```

### Other

```typescript
import {
  fetchRestaurantCoordinates,    // Lat/lng for maps
  fetchRestaurantsForMap,         // Restaurants with coordinates
  fetchContactsByCompanyId,       // HubSpot contacts
  fetchBrandActiveChannels,       // Which platforms a brand uses
  fetchCrpProducts,               // Product catalog
} from '@/services/crp-portal';
```

## Multi-Portal ID Grouping (allIds)

Brands and restaurants may have duplicate IDs across portals (Glovo, UberEats, JustEat). The service deduplicates them:

```typescript
interface Brand {
  id: string;        // Primary ID (most recent)
  allIds: string[];  // ALL IDs sharing this name
  name: string;
  // ...
}
```

When filtering orders, always expand to `allIds`:
```typescript
const brand = brands.find(b => b.id === selectedBrandId);
const allBrandIds = brand?.allIds ?? [selectedBrandId];
// Use allBrandIds in order queries to capture all platforms
```

## KPIs Available from Orders

| KPI | Calculation |
|-----|-------------|
| Revenue | `SUM(amt_total_price)` |
| Orders | `COUNT(pk_uuid_order)` |
| Avg Ticket | `Revenue / Orders` |
| Refunds | `SUM(amt_refunds)` |
| Promotions | `SUM(amt_promotions)` |
| Net Revenue | `Revenue - Refunds` |
| Promotion Rate % | `Promotions / Revenue * 100` |
| Refund Rate % | `Refunds / Revenue * 100` |
| Unique Customers | `COUNT(DISTINCT cod_id_customer)` |
| Orders/Customer | `Orders / Unique Customers` |

## React Query Hook Pattern

When building hooks, follow the pattern in `src/features/controlling/hooks/useOrdersData.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

export function useMyData(params) {
  return useQuery({
    queryKey: ['my-data', params],
    queryFn: () => fetchCrpOrdersAggregated(params),
    enabled: !!params.companyIds?.length,
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

## Channel IDs

| Channel | Portal ID | Slug |
|---------|-----------|------|
| Glovo | `E22BC362-2` | `glovo` |
| UberEats | `3CCD6861` | `ubereats` |
| JustEat | *(pending)* | `justeat` |

## Source Table

Orders come from `crp_portal__ft_order_head` with columns:
- `pk_uuid_order` - Order UUID
- `pfk_id_company` - Company FK
- `pfk_id_store` - Brand/Store FK
- `pfk_id_store_address` - Address FK
- `pfk_id_portal` - Portal/Channel FK
- `td_creation_time` - Timestamp
- `amt_total_price` - Total EUR
- `amt_promotions` - Discount EUR
- `amt_refunds` - Refund EUR
- `cod_id_customer` - Customer ID
