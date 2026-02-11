# Guía de Deployment - TPHub

Esta guía explica cómo desplegar TPHub en Vercel con Supabase como backend.

## Pre-Requisitos

- Repositorio conectado a GitHub: `https://github.com/biglesias-tp2023/tphub-claudecode`
- Proyecto Supabase configurado
- Cuenta en Vercel (puedes hacer login con GitHub)

---

## Paso 1: Deploy en Vercel

### 1.1 Crear Proyecto

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Seleccionar "Import Git Repository"
3. Buscar y seleccionar `tphub-claudecode`
4. Framework: **Vite** (auto-detectado)

### 1.2 Build Settings (automático)

| Campo | Valor |
|-------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### 1.3 Environment Variables

Configurar en Vercel Dashboard → Settings → Environment Variables:

#### Variables Requeridas

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://cewvmbuxodealowraamu.supabase.co` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | *(ver Supabase Dashboard → Settings → API)* | Anon/Public key |
| `VITE_DEV_AUTH_BYPASS` | `false` | **IMPORTANTE: Debe ser `false`** |
| `VITE_CAMPAIGNS_USE_LOCAL_STORAGE` | `false` | Usar Supabase en producción |

#### Variables Opcionales (AWS Athena)

Solo si usas reportes de Athena:

| Variable | Descripción |
|----------|-------------|
| `VITE_AWS_ACCESS_KEY_ID` | AWS Access Key ID |
| `VITE_AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key |
| `VITE_AWS_REGION` | `eu-west-3` |
| `VITE_ATHENA_S3_OUTPUT` | `s3://thinkpaladar-athena-query-result/discovery/` |

> ⚠️ **Nota de Seguridad**: Las variables `VITE_*` se exponen al cliente.
> Supabase anon key es seguro porque RLS (Row Level Security) protege los datos.

---

## Paso 2: Configurar Supabase para Producción

### 2.1 URLs de Autenticación

En **Supabase Dashboard → Authentication → URL Configuration**:

```
Site URL:        https://[tu-proyecto].vercel.app
Redirect URLs:   https://[tu-proyecto].vercel.app/auth/callback
```

Reemplaza `[tu-proyecto]` con el nombre que Vercel asigna a tu proyecto.

### 2.2 Google OAuth (si aplica)

En **Supabase → Authentication → Providers → Google**:

1. Habilitar Google provider
2. Obtener Client ID/Secret de [Google Cloud Console](https://console.cloud.google.com)
3. En Google Cloud, agregar Authorized redirect URI:
   ```
   https://cewvmbuxodealowraamu.supabase.co/auth/v1/callback
   ```

### 2.3 Verificar Storage Buckets

En **Supabase → Storage**, verificar que existen:
- `audit-attachments` - para documentos
- `audit-images` - para imágenes

---

## Paso 3: Verificación Post-Deploy

### Checklist Funcional

| Test | Cómo Verificar |
|------|----------------|
| ✅ Login Google | Click "Continuar con Google" |
| ✅ Magic Link | Invitar usuario, verificar email |
| ✅ Restricción dominio | Solo `@thinkpaladar.com` puede acceder |
| ✅ Dashboard carga | Datos de Supabase visibles |
| ✅ Navegación SPA | Refresh en `/customers` no da 404 |
| ✅ File uploads | Subir imagen en auditoría |

### Verificar Seguridad

En DevTools (F12) → Console:
- No debe haber `VITE_DEV_AUTH_BYPASS=true`
- No debe haber errores CORS

---

## Paso 4: Dominio Personalizado (Opcional)

### 4.1 Agregar Dominio

En **Vercel → Project → Settings → Domains**:

Agregar: `app.thinkpaladar.com` (o el dominio deseado)

### 4.2 Configurar DNS

**Opción A - Subdominio (CNAME):**
```
app  CNAME  cname.vercel-dns.com
```

**Opción B - Dominio apex (A Record):**
```
@    A      76.76.19.19
```

### 4.3 Actualizar Supabase

Después de que DNS propague (~5-30 min), actualizar en Supabase:
- Site URL → `https://app.thinkpaladar.com`
- Redirect URLs → `https://app.thinkpaladar.com/auth/callback`

---

## Troubleshooting

### "Invalid Supabase URL"
- Verificar que `VITE_SUPABASE_URL` no tiene `/` al final
- Formato correcto: `https://xxx.supabase.co`

### OAuth redirect mismatch
- Agregar URL exacta en Supabase → Authentication → URL Configuration → Redirect URLs
- Incluir `/auth/callback`

### 404 en rutas (al hacer refresh)
- El archivo `vercel.json` ya tiene configurado el rewrite para SPA
- Verificar que está en el repositorio

### CORS errors
- Supabase → Settings → API → Allowed origins
- Agregar el dominio de Vercel

---

## CI/CD Automático

Vercel configura automáticamente:

| Trigger | Acción |
|---------|--------|
| Push a `main` | Deploy a producción |
| Push a PR/branch | Preview deployment |
| Merge PR | Deploy a producción |

---

## Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `vercel.json` | Config Vercel (rewrites, headers de seguridad) |
| `vite.config.ts` | Configuración de build |
| `.env.production` | Template de variables (sin secrets) |
| `.env.example` | Documentación de variables requeridas |

---

## Costos

| Servicio | Free Tier | Pro |
|----------|-----------|-----|
| **Vercel** | 100GB bandwidth, proyectos ilimitados | $20/mes/miembro |
| **Supabase** | 500MB DB, 1GB storage, 50k MAU | $25/mes |

Para empezar, el Free Tier es más que suficiente.
