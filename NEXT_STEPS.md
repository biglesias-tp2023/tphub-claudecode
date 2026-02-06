# Next Steps - Controlling

## Completado

- [x] Jerarquía 4 niveles: Company → Store → Address → Portal
- [x] Filtro flg_deleted correcto (dedup first, filter after)
- [x] Addresses NO mergeadas por nombre (cada pk_id_address único)
- [x] Address→Store mapping desde pedidos (ft_order_head)
- [x] Métricas: Ventas, Var, Pedidos, Ticket, Nuevos, %Nuevos, Recurrentes, %Recurrentes
- [x] Agregación bottom-up (Portal → Address → Store → Company)
- [x] Formato nombres: `${nombre} (${id})`
- [x] Deduplicación snapshots mensuales (`ORDER BY pk_ts_month DESC`)
- [x] Mostrar todas las companies seleccionadas (aunque tengan 0 pedidos)
- [x] Stores sin pedidos muestran addresses (asignadas a todos los stores de company)
- [x] Subrayado visual en nivel Company (`bg-primary-50/60`)
- [x] IDs como VARCHAR hexadecimal (no parseInt)
- [x] Addresses sin pedidos van a TODOS los stores de su company
- [x] Ordenación de columnas (click en header)
- [x] Expandible independiente por línea

## Pendiente

- [ ] Verificar que Open y Conv. muestren datos
- [ ] Performance: considerar RPC para queries pesadas
- [ ] Tests unitarios para deduplicateAndFilterDeleted
- [ ] Filtros por canal en tabla de jerarquía
- [ ] Drill-down a nivel de pedido individual
- [ ] Añadir más métricas: Open Time, Ratio Conversión, ROAS

## Notas Técnicas

### Regla Fundamental: Filtrado de Dimensiones

**NUNCA** usar `.eq('flg_deleted', 0)` en queries de Supabase para tablas dimensionales.

Patrón correcto:
1. Fetch sin filtrar flg_deleted, ORDER BY pk_ts_month DESC
2. Deduplicar por PK (primer registro = snapshot más reciente)
3. Filtrar flg_deleted !== 0

```typescript
import { deduplicateAndFilterDeleted } from '@/services/crp-portal/utils';
const activeStores = deduplicateAndFilterDeleted(data, s => s.pk_id_store);
```

### Relación Address → Store

`dt_address` NO tiene `pfk_id_store`. La relación se determina:

1. **Con pedidos**: Via `ft_order_head.pfk_id_store_address` + `ft_order_head.pfk_id_store`
2. **Sin pedidos**: Address se asigna a TODOS los stores de `pfk_id_company`

### Agregación de Métricas

```
ticketMedio = ventas / pedidos  (calcular DESPUÉS de sumar)
porcentajeNuevos = (nuevos / pedidos) * 100  (calcular DESPUÉS de sumar)
```

### Keys Compuestas

Separador: `::`

```
portalKey = `${companyId}::${storeId}::${addressId}::${portalId}`
```
