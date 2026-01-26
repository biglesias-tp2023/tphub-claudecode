# TPHub

Portal interno de analytics para consultores de ThinkPaladar.

## Descripcion

TPHub es un dashboard de analytics disenado para consultores que gestionan multiples clientes de restaurantes en plataformas de delivery (Glovo, UberEats, JustEat). Permite visualizar KPIs, gestionar objetivos estrategicos, analizar pedidos y generar informes brandeados.

## Caracteristicas

- **Multi-cliente**: Gestion de 30-40 clientes por consultor
- **Selector de companias**: Estilo UberEats Manager con busqueda fuzzy (Cmd+K)
- **Filtros jerarquicos**: Sistema completo de filtros en cascada
  - Compania -> Marca -> Area -> Restaurante -> Canal
  - Selector de fechas con presets y calendario custom
  - Reset automatico en cascada al cambiar filtros padre
- **8 secciones principales**:
  - **Controlling**: KPIs y metricas de rendimiento
  - **Estrategia**: Objetivos estrategicos (OKRs/KPIs) y tareas con auto-generacion
  - **Objetivos**: Objetivos de venta por restaurante/canal/mes
  - **Operaciones**: Gestion operativa (pendiente)
  - **Clientes**: Gestion de clientes (pendiente)
  - **Reputacion**: Ratings, reviews y analisis de errores
  - **Mapas**: Visualizacion geografica
  - **Mercado**: Analisis de mercado (pendiente)
- **Objetivos Estrategicos**:
  - ~30 tipos de objetivo organizados en 7 categorias
  - Cards con estado interactivo (dropdown estilo iOS)
  - Filtro por categoria (Finanzas, Operaciones, Clientes, Marca, Reputacion, Proveedores, Menu)
  - Agrupacion por horizonte temporal
  - Asignacion de responsable (ThinkPaladar/Cliente/Ambos/Plataforma)
  - Date picker con presets rapidos (30d, 45d, 90d, 180d)
- **Tareas Estrategicas**:
  - Auto-generacion de tareas al crear objetivos
  - Vista calendario estilo Notion agrupada por dia
  - Templates predefinidos por tipo de objetivo
  - Creacion manual de tareas adicionales
  - Toggle de completado con registro de fecha
- **Keyboard shortcuts**: Cmd+K para selector de compania
- **Login moderno**: Pantalla de login con efecto Ripple interactivo (Aceternity UI)
- **Auth con Supabase**: Autenticacion con restriccion de dominio @thinkpaladar.com
- **Toast notifications**: Feedback visual en acciones
- **Sistema de Exportacion**:
  - Formatos: PDF, Excel, CSV
  - Branding ThinkPaladar en PDFs (logo, colores, header/footer)
  - Preview real del PDF antes de descargar
  - Controles de zoom en preview
- **Codigo documentado**: Principios SOLID aplicados en toda la base de codigo

## Stack Tecnologico

### Frontend
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool |
| TailwindCSS | 4 | Estilos |
| Zustand | - | Estado cliente |
| TanStack Query | - | Estado servidor |
| Fuse.js | - | Busqueda fuzzy |
| jsPDF | - | Generacion de PDFs |
| jspdf-autotable | - | Tablas en PDFs |
| xlsx | - | Exportacion Excel |

### Backend (AWS)
| Tecnologia | Proposito |
|------------|-----------|
| AWS CDK v2 | Infrastructure as Code |
| AWS Lambda | Serverless functions (Node.js 20) |
| API Gateway | HTTP API (v2) |
| AWS Athena | Queries SQL sobre S3 |
| Supabase | Auth + metadata |

## Estructura del Proyecto

```
tphub/
|-- src/                        # Frontend React
|   |-- app/                    # Setup y providers
|   |-- components/
|   |   |-- ui/                 # Primitivos (Button, Card, Toast...)
|   |   |-- layout/             # TopBar, Sidebar, MainLayout
|   |   |-- charts/             # Wrappers de Recharts
|   |   +-- common/             # Componentes compartidos
|   |-- features/               # Modulos por feature
|   |   |-- auth/               # Autenticacion
|   |   |-- clients/            # Selector de companias
|   |   |-- controlling/        # Dashboard de KPIs
|   |   |-- strategic/          # Objetivos y tareas estrategicas
|   |   |   |-- components/     # ObjectiveCard, TaskCalendar, TaskEditor...
|   |   |   |-- config/         # Categorias, tipos, templates de tareas
|   |   |   +-- hooks/          # useStrategicData
|   |   |-- objectives/         # Objetivos de venta
|   |   |-- reputation/         # Reputacion y reviews
|   |   +-- dashboard/          # Filtros compartidos
|   |-- services/               # API clients
|   |   |-- supabase.ts         # Cliente Supabase
|   |   |-- supabase-data.ts    # Funciones de datos
|   |   +-- mock-data.ts        # Datos mock para desarrollo
|   |-- stores/                 # Zustand stores
|   |-- hooks/                  # Custom hooks (useToast, etc.)
|   +-- ...                     # types, utils, constants
|
|-- infra/                      # CDK Infrastructure
|   |-- bin/tphub-infra.ts      # Entry point CDK
|   +-- lib/tphub-stack.ts      # Stack principal
|
+-- lambda/                     # Lambda Functions
    |-- shared/                 # Codigo compartido
    |   |-- athena-client.ts    # Cliente Athena
    |   |-- response.ts         # Helpers HTTP
    |   +-- types.ts            # Tipos compartidos
    |-- companies/handler.ts    # GET /api/companies
    |-- stores/handler.ts       # GET /api/stores
    |-- addresses/handler.ts    # GET /api/addresses
    |-- areas/handler.ts        # GET /api/areas
    +-- channels/handler.ts     # GET /api/channels
```

## Instalacion

```bash
# Clonar repositorio
git clone <repository-url>
cd tphub

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales necesarias
```

## Variables de Entorno

Crear archivo `.env.local` con:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Modo desarrollo (bypass de auth + mock data)
VITE_DEV_AUTH_BYPASS=true  # Cambiar a false para usar Supabase real

# API (despues de deploy CDK)
VITE_API_URL=https://xxxxxxxxxx.execute-api.eu-west-3.amazonaws.com

# AWS (para scripts locales)
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=eu-west-3
VITE_ATHENA_S3_OUTPUT=s3://your-bucket/output/
```

## Comandos

### Frontend

```bash
# Desarrollo
npm run dev

# Build produccion
npm run build

# Preview build
npm run preview

# Linting
npm run lint
```

### CDK Infrastructure

```bash
# Instalar dependencias de Lambda
cd lambda && npm install && cd ..

# Instalar dependencias de CDK
cd infra && npm install && cd ..

# Primera vez: bootstrap CDK (requiere permisos IAM)
cd infra && npx cdk bootstrap aws://ACCOUNT_ID/eu-west-3

# Deploy
cd infra && npx cdk deploy

# Ver cambios antes de deploy
cd infra && npx cdk diff

# Destruir stack
cd infra && npx cdk destroy
```

### Otros

```bash
# Test conexion Athena (local)
node scripts/test-athena.mjs
```

## Documentacion

- [CLAUDE.md](./CLAUDE.md) - Contexto del proyecto y estado actual
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura tecnica detallada
- [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios

## Acceso

Solo usuarios con dominio `@thinkpaladar.com` pueden acceder al portal.

## Licencia

Propiedad de ThinkPaladar. Uso interno exclusivo.
