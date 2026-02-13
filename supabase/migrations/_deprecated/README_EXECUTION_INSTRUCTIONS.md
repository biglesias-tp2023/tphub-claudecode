# Sistema de Roles y Permisos - Instrucciones de Ejecución

## Estado Actual

El código del sistema de roles está **100% funcional**. Solo falta ejecutar las migraciones SQL en Supabase.

---

## Paso 1: Ejecutar la Migración Principal

1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Copiar y ejecutar el contenido de:
   ```
   supabase/migrations/EXECUTE_NOW_roles_and_invitations.sql
   ```

Este archivo incluye:
- Sistema de roles (owner, superadmin, admin, manager, consultant, viewer)
- Protección del owner (no se puede eliminar ni cambiar su rol)
- Tabla `user_invitations` para invitaciones con Magic Link
- Fix de recursión infinita en RLS policies
- Bruno asignado como owner

---

## Paso 2: Verificar la Migración

Después de ejecutar, copiar y ejecutar:
```
supabase/migrations/VERIFY_migration.sql
```

Deberías ver todos los checks con ✅ PASS.

---

## Paso 3: Verificar Datos de la Tabla Jerárquica (Opcional)

Si los niveles de Address y Channel no aparecen en Controlling, ejecutar:
```
supabase/migrations/VERIFY_hierarchy_data.sql
```

Esto te dirá:
- Si hay addresses en la tabla dimensional
- Si los pedidos tienen addresses vinculados
- Si hay datos por portal/canal

---

## Archivos de Migración

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `EXECUTE_NOW_roles_and_invitations.sql` | ⏳ Ejecutar | Migración consolidada principal |
| `VERIFY_migration.sql` | 📋 Verificación | Verificar que todo está correcto |
| `VERIFY_hierarchy_data.sql` | 📋 Verificación | Verificar datos de addresses/portals |

---

## Jerarquía de Roles

| Rol | Nivel | Permisos |
|-----|-------|----------|
| **owner** | 100 | Todo. No puede ser eliminado ni cambiado. Solo puede haber uno. |
| **superadmin** | 80 | Todo excepto modificar al owner. |
| **admin** | 60 | Gestiona usuarios de menor nivel. |
| **manager** | 40 | Acceso a compañías asignadas con permisos de gestión. |
| **consultant** | 20 | Acceso a compañías asignadas, todos los dashboards. |
| **viewer** | 10 | Solo lectura en compañías asignadas. |

---

## Sistema de Invitaciones

**Flujo:**
1. Admin va a `/admin` → "Invitar usuario"
2. Ingresa email, selecciona rol, asigna compañías
3. Se envía Magic Link vía Supabase Auth
4. Usuario hace clic → crea cuenta automáticamente
5. Trigger aplica rol y compañías configuradas

---

## Solución de Problemas

### Error: "infinite recursion" en profiles
La migración incluye el fix con `get_current_user_role()` SECURITY DEFINER.

### Error: "role does not exist"
Verificar que el constraint `profiles_role_check` se creó correctamente:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'profiles_role_check';
```

### Addresses/Channels no aparecen en Controlling
El código es correcto. Verificar datos con `VERIFY_hierarchy_data.sql`.
Si no hay datos de `pfk_id_store_address` en los pedidos, es un problema de datos.
