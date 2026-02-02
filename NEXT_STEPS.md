# Próximos Pasos - Controlling

## Pendiente

- [x] Ordenación de columnas (click en header para ordenar asc/desc/original)
- [x] Expandible independiente por línea (actualmente se colapsan juntos)
- [ ] Añadir más métricas: Open Time, Ratio Conversión, ROAS
- [ ] Filtros por canal en tabla de jerarquía
- [ ] Exportación de datos de jerarquía

## Completado

- [x] Jerarquía 4 niveles: Company → Store → Address → Portal
- [x] Agregación bottom-up de métricas (Portal → Address → Store → Company)
- [x] Formato nombres: `${nombre} (${id})`
- [x] Deduplicación de snapshots mensuales (`ORDER BY pk_ts_month DESC`)
- [x] Mostrar todas las companies seleccionadas (aunque tengan 0 pedidos)
- [x] Stores sin pedidos muestran addresses (asignadas a todos los stores de la company)
- [x] Subrayado visual en nivel Company (`bg-primary-50/60`)
- [x] IDs como VARCHAR hexadecimal (no parseInt)
- [x] Mapeo address → store basado en pedidos (`pfk_id_store_address` → `pfk_id_store`)
- [x] Addresses sin pedidos van a TODOS los stores de su company

## Notas Técnicas

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
