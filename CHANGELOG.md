# Changelog

Todos los cambios notables en TPHub seran documentados en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [Unreleased]

---

## [0.12.0] - 2026-01-23

### Anadido
- **CRP Portal Service (SOLID)**: Refactorizacion completa del servicio de datos
  - **Arquitectura modular**: Separacion en modulos independientes siguiendo SOLID
  - **types.ts**: Tipos de base de datos e interfaces de dominio
  - **utils.ts**: Funciones helper reutilizables (deduplicateBy, parseNumericIds, generateSlug)
  - **mappers.ts**: Capa de transformacion de datos DB -> Domain
  - **companies.ts**: Operaciones de companias (fetchCompanies, fetchCompanyById)
  - **brands.ts**: Operaciones de marcas (fetchBrands, fetchBrandById)
  - **areas.ts**: Operaciones de areas geograficas (fetchAreas, fetchAreaById)
  - **restaurants.ts**: Operaciones de restaurantes (fetchRestaurants, fetchRestaurantById)
  - **portals.ts**: Operaciones de portales/canales (fetchPortals)
  - **index.ts**: API publica con barrel exports
- **Status de Companias**: Nuevo campo `status` en modelo Company
  - Tags visuales: Onboarding, Cliente Activo, Stand By, PiP
  - Filtrado automatico por status validos
- **Deduplicacion de datos**: Todas las funciones fetch deduplican por clave primaria

### Cambiado
- **Hooks actualizados**: Importan desde `@/services/crp-portal` en lugar de archivo monolitico
  - `useCompanies.ts`: Usa nuevas funciones modulares
  - `useBrands.ts`: Usa nuevas funciones modulares
  - `useAreas.ts`: Usa nuevas funciones modulares
  - `useRestaurants.ts`: Usa nuevas funciones modulares
- **Button component**: Gradiente y sombra con colores de marca ThinkPaladar
  - `bg-gradient-to-b from-primary-500 to-primary-600`
  - `shadow-sm shadow-primary-600/25`
- **CompanySelector**: Tags de status con colores sutiles
- **Filtro de restaurantes**: Filtrado por brand via company IDs (workaround para pfk_id_store null)

### Eliminado
- **crp-portal-data.ts**: Archivo monolitico reemplazado por modulos SOLID

### Mejorado
- **Documentacion CLAUDE.md**: Nueva seccion CRP Portal Service
- **Documentacion ARCHITECTURE.md**: Nueva seccion 4 con arquitectura SOLID detallada
- **Mantenibilidad**: Codigo mas facil de testear y extender

---

## [0.11.0] - 2026-01-21

### Anadido
- **Sistema de Exportacion con Branding**: Exportaciones PDF/Excel/CSV brandeadas
  - **Branding ThinkPaladar**: Logo circular "TP", nombre de empresa, tagline
  - **Header brandeado**: Titulo, subtitulo, fecha de exportacion
  - **Footer brandeado**: Numero de pagina, fecha, copyright
  - **Colores corporativos**: Azul primario (#2563eb), indices, acentos
  - **Estilos de tabla**: Headers azules, filas alternadas, bordes sutiles
- **Preview de PDF Real**: Vista previa del documento exacto antes de descargar
  - **Iframe PDF viewer**: Visualizacion del PDF real (no tabla aproximada)
  - **Controles de zoom**: +/- para ajustar escala de preview
  - **Loading state**: Spinner mientras genera el blob
  - **Cambio de formato**: Actualiza preview al cambiar PDF/Excel/CSV
- **Funciones de generacion de blob**: Para cada tipo de exportacion
  - `generateReputationPdfBlob()`: Blob para Reputacion
  - `generateControllingPdfBlob()`: Blob para Controlling
  - `generateObjectivesPdfBlob()`: Blob para Objetivos
- **Campos de fecha/hora en Reviews**: Columnas "Fecha" y "Hora" en tabla de reviews
  - `orderDate`: Fecha del pedido (formato dd/MMM)
  - `orderTime`: Hora del pedido (formato HH:mm)

### Cambiado
- **ExportPreviewModal**: Rediseñado para soportar PDF real via iframe
  - Muestra PDF en iframe cuando `generatePdfBlob` esta disponible
  - Fallback a tabla para Excel/CSV
  - Controles de zoom integrados
- **ExportButtons**: Acepta nueva prop `generatePdfBlob?: () => Blob`
- **export.ts**: Refactorizado con configuracion de marca centralizada
  - `BRAND` object con colores, nombre, tagline
  - `addBrandedHeader()`: Funcion reutilizable para headers
  - `addBrandedFooter()`: Funcion reutilizable para footers
  - `BRANDED_TABLE_STYLES`: Estilos consistentes para tablas
- **ReputationPage**: Integrado buildExportData y generatePdfBlob
- **ControllingPage**: Integrado buildExportData y generatePdfBlob
- **ObjectivesPage**: Integrado buildExportData y generatePdfBlob
- **ReviewsTable**: Nuevas columnas Fecha y Hora

### Mejorado
- **UX de exportacion**: Usuario ve exactamente lo que descargara
- **Consistencia visual**: Todos los PDFs tienen el mismo estilo de marca
- **Performance**: Blob se genera solo cuando se abre el preview

---

## [0.10.0] - 2026-01-21

### Anadido
- **Sistema de Tareas Estrategicas**: Tareas vinculadas a objetivos con auto-generacion
  - **strategic_tasks table**: Nueva tabla en Supabase con RLS
  - **Auto-generacion**: Al crear un objetivo, se generan tareas automaticamente desde templates
  - **~30 tipos de objetivo**: Cada uno con 3-5 tareas predefinidas
  - **Templates por categoria**:
    - Finanzas: 4 tipos (incremento_facturacion, mejorar_margen, reducir_costes_ads, optimizar_promos)
    - Operaciones: 5 tipos (tiempos_preparacion, reducir_errores, mejorar_disponibilidad, optimizar_horarios, reducir_cancelaciones)
    - Clientes: 4 tipos (aumentar_recurrencia, captar_nuevos, mejorar_satisfaccion, fidelidad)
    - Marca: 4 tipos (packaging, sesion_fotos, descripcion_menu, rediseno_menu)
    - Reputacion: 3 tipos (subir_ratings, reducir_negativas, tiempo_respuesta)
    - Proveedores: 3 tipos (negociar_condiciones, buscar_alternativas, evaluar_calidad)
    - Menu: 4 tipos (lanzar_producto, optimizar_carta, analizar_productos, ajustar_precios)
- **Vista Calendario Estilo Notion**: Tareas agrupadas por dia
  - **StrategicTaskCalendar**: Contenedor con agrupacion por fecha
  - **StrategicTaskCalendarItem**: Items con:
    - Borde izquierdo con color de categoria
    - Avatar con imagen o iniciales
    - Badge de categoria
    - Deadline con countdown
  - **StrategicTaskDetailModal**: Modal de detalle completo
  - **StrategicTaskEditor**: Editor para crear/editar tareas manuales
- **AvatarInitials**: Componente para mostrar avatar o iniciales
- **Eliminar Objetivos**: Boton de eliminar en el editor con confirmacion
- **Persistencia localStorage**: Mock data persiste entre recargas de pagina
  - Keys: `tphub_mock_objectives`, `tphub_mock_tasks`, `tphub_mock_obj_counter`, `tphub_mock_task_counter`

### Cambiado
- **StrategicObjective**: Anadido campo `objectiveTypeId` para vincular a templates
- **ObjectiveCard**: Nueva animacion "live-breathe" para objetivos activos
- **Categorias ampliadas**: 7 categorias (finanzas, operaciones, clientes, marca, reputacion, proveedores, menu)
- **Responsables ampliados**: 4 tipos (thinkpaladar, cliente, ambos, plataforma)
- **mock-data.ts**: Ahora usa localStorage para persistencia
- **supabase-data.ts**: Soporte completo para modo desarrollo (dev bypass)

### Corregido
- **Status dropdown**: Ahora actualiza correctamente el estado en modo desarrollo
- **Objetivos desapareciendo**: Persistencia en localStorage soluciona perdida de datos al recargar

---

## [0.9.0] - 2026-01-20

### Anadido
- **Pagina de Estrategia**: Nueva seccion completa para objetivos estrategicos (OKRs/KPIs)
  - **ObjectiveCard**: Cards de objetivo con diseno moderno
    - Badge de categoria con colores (Finanzas verde, Operaciones azul, Reputacion ambar, Marketing rosa)
    - Dropdown de estado estilo iOS Control Center (vertical, blur, checkmark)
    - Animacion pulse cuando esta "En progreso"
    - Dias restantes con colores (rojo si atrasado, naranja si <7 dias, gris normal)
    - Responsable (ThinkPaladar o Restaurante) con icono
    - Barra de progreso de KPI
  - **StrategicObjectiveEditor**: Modal de edicion completo
    - Selector de categoria con tipos predefinidos por categoria
    - Selector de responsable (ThinkPaladar por defecto)
    - Date picker con presets rapidos (30d, 45d, 90d, 180d)
    - Auto-calculo de horizonte (corto/medio/largo plazo)
    - Contador de dias restantes en vivo
    - Click en campo de fecha abre el calendario
  - **Filtro por categoria**: Pills para filtrar Todos/Finanzas/Operaciones/Reputacion/Marketing/Otros
  - **Agrupacion por horizonte**: Corto plazo (0-90d), Medio plazo (91-180d), Largo plazo (>180d)
  - **TaskList**: Lista de tareas pendientes y completadas
- **Sistema de Toast**: Notificaciones visuales para feedback
  - **Toast component**: Componente de notificacion con tipos (success, error, warning, info)
  - **ToastContainer**: Portal para renderizar toasts
  - **useToast hook**: Hook para gestionar toasts (success, error, warning, info)
- **Mock Data System**: Sistema de datos mock para desarrollo
  - `mock-data.ts`: Datos de companias, marcas, areas, restaurantes, KPIs
  - Almacenamiento en memoria para objetivos estrategicos
  - Funciones CRUD para desarrollo sin Supabase
- **Tipo ObjectiveResponsible**: 'thinkpaladar' | 'restaurante'

### Cambiado
- **StrategicObjective**: Anadido campo `responsible` al tipo
- **StrategicObjectiveInput**: Anadido campo `responsible` opcional
- **DbStrategicObjective**: Anadido campo `responsible`
- **supabase-data.ts**: Actualizado mappers y funciones para incluir responsible
- **Boton "Nuevo KPI"**: Estilo mas integrado (gris sutil en vez de azul primario)

### Mejorado
- **ObjectiveCard UX**: Dropdown de estado se puede cambiar directamente desde la card
- **Date picker UX**: Click en cualquier parte del campo abre el calendario
- **Feedback visual**: Toast notifications al crear/editar/actualizar objetivos

---

## [0.8.0] - 2026-01-20

### Anadido
- **Pagina de Reputacion**: Nueva seccion completa para analisis de reputacion
  - **ChannelRatingCard**: Cards con ratings por canal (Glovo %, UberEats estrellas)
  - **SummaryCard**: Resumen de facturacion y reembolsos
  - **ErrorHeatmap**: Mapa de calor de incidencias por dia/hora
  - **ErrorTypesChart**: Grafico de tipos de errores
  - **ReviewsTable**: Tabla de reviews con columna App, Order ID, valor, tiempo, tags
  - **Tabs General/Detalle**: Vista resumida y detallada
- **Hook useReputationData**: Datos demo para reputacion con filtrado por canal
- **Pagina de Mercado**: Placeholder para analisis de mercado (pendiente implementacion)

### Cambiado
- **Navegacion actualizada**: 6 secciones principales:
  - Controlling (PieChart icon)
  - Operaciones (Truck icon)
  - Clientes (Users icon)
  - Reputacion (Star icon)
  - Mapas (Map icon)
  - Mercado (TrendingUp icon)
- **Sidebar simplificado**: Eliminados Settings y otros items secundarios
- **Routes actualizadas**: Nuevas rutas para las 6 secciones principales
- **DashboardFilters**: Conectado al store para datePreset (fix filtrado por fechas)
- **ReviewsTable**: Columna App con indicador de color por canal

### Eliminado
- Ruta de Informes (reemplazada por Reputacion)
- bottomItems en Sidebar (Settings)

---

## [0.7.0] - 2026-01-19

### Anadido
- **Infraestructura CDK**: AWS CDK v2 para deployment serverless
  - **infra/**: Proyecto CDK con stack de infraestructura
  - **Lambda Functions (x5)**: Handlers para companies, stores, addresses, areas, channels
  - **HTTP API Gateway**: API Gateway v2 con CORS configurado
  - **IAM Role**: Permisos para Athena, S3, Glue
- **Lambda Shared Utilities**:
  - `athena-client.ts`: Cliente reutilizable para queries Athena
  - `response.ts`: Helpers para respuestas HTTP (success/error con CORS)
  - `types.ts`: Tipos compartidos para Athena
- **Frontend API Service** (`src/services/api.ts`):
  - Clase ApiService con metodos para todos los endpoints
  - Tipos de respuesta: ApiCompany, ApiStore, ApiAddress, ApiArea, ApiChannel
- **Hooks actualizados con API real**:
  - `useCompanies`: Usa API con fallback a datos demo
  - `useBrands`: Usa API con fallback a datos demo
  - `useAreas`: Usa API con fallback a datos demo
  - `useRestaurants`: Usa API con fallback a datos demo
- **Mapeo de nomenclatura**: Frontend <-> Athena (Company/Store/Address/Area/Channel)

### Cambiado
- **ARCHITECTURE.md**: Nueva seccion 4 "Infraestructura CDK" con documentacion completa
- **CLAUDE.md**: Actualizado con nueva estructura de carpetas y endpoints API
- **Query keys**: Interfaces de filtros ahora son privadas (no exportadas)
- **Hooks**: Separacion de imports `type` para `verbatimModuleSyntax`

### Eliminado (Cleanup)
- **formatters.ts**: Funciones no utilizadas (formatCompactNumber, formatRelativeDate, formatDateRange, formatDateShort)
- **channels.ts**: Funciones no utilizadas (getChannelColor, getChannelName, CHANNEL_OPTIONS)
- **filtersStore.ts**: Alias legacy `useFiltersStore`
- **stores/index.ts**: Export de `useFiltersStore`
- **queryKeys.ts**: Export de interfaces de filtros (ahora privadas)
- **constants/index.ts**: Export duplicado

---

## [0.6.0] - 2026-01-19

### Anadido
- **DashboardFilters**: Sistema completo de filtros jerarquicos para el dashboard
  - **BrandSelector**: Selector de marcas (depende de Compania seleccionada)
  - **AreaSelector**: Selector de areas/ciudades (depende de Marca)
  - **EstablishmentSelector**: Selector de restaurantes (depende de Marca + Area)
  - **ChannelSelector**: Toggle buttons para Glovo/UberEats/JustEat con colores de marca
  - **DateRangePicker**: Selector de fechas con presets y calendario custom
    - Presets: Hoy, Ayer, 7d, 30d, 90d, Ano, Custom
    - Calendario dual para seleccion de rangos
  - **FilterDropdown**: Componente reutilizable para selectores multiples
    - Busqueda integrada (si >5 opciones)
    - Seleccionar todos / Limpiar
    - Estados de loading y disabled
- **Hooks de datos demo**:
  - `useBrands()`: 20+ marcas con dependencia de compania
  - `useAreas()`: 20+ areas con dependencia de marca
  - `useRestaurants()`: 15+ restaurantes con jerarquia completa
- **Query keys actualizados**: Estructura para brands, areas, restaurants

### Cambiado
- DashboardPage ahora integra DashboardFilters
- Stores actualizados con acciones de reset en cascada

---

## [0.5.1] - 2026-01-17

### Anadido
- **Ripple component**: Efecto de grid interactivo (Aceternity UI)
  - Responde a hover del mouse con efecto de onda
  - Animacion CSS optimizada con will-change
  - Configurable: filas, columnas, tamano de celda, colores
- **Documentacion SOLID**: Principios SOLID documentados en componentes clave
  - App.tsx: Composicion de providers
  - AuthLayout: SRP, OCP, DIP
  - LoginPage: SRP, OCP, DIP
  - authStore: SRP, OCP, DIP
  - ProtectedRoute: SRP, OCP, LSP, DIP
  - Ripple: Todos los principios SOLID

### Eliminado
- **SparklesCore component**: Reemplazado por Ripple
- **Dependencias no utilizadas**: framer-motion, @tsparticles/react, @tsparticles/slim
- **Archivos legacy**: App.tsx y App.css del template Vite
- **Console.logs de debug**: Limpieza de logs temporales

### Cambiado
- AuthLayout ahora usa Ripple en lugar de Sparkles
- pointer-events optimizado para permitir interaccion con Ripple
- Documentacion .MD actualizada para reflejar cambios

---

## [0.5.0] - 2026-01-17

### Anadido
- **Auth con Supabase**: Sistema de autenticacion completamente funcional
  - Credenciales de Supabase configuradas
  - Validacion de dominio @thinkpaladar.com
  - Modo desarrollo (VITE_DEV_AUTH_BYPASS) para testing sin Supabase
- **LoginPage redisenada**: Nuevo diseno moderno con efecto visual
  - Fondo con gradiente azul oscuro (#0f172a -> #1e3a5f -> #1e40af)
  - Card blanca centrada con formulario de login
  - Inputs de email y password con toggle de visibilidad
  - Checkbox "Recuerdame"
  - Boton de login con Google
  - Advertencia de seguridad y footer
- **AuthLayout**: Nuevo layout para paginas de autenticacion
  - Header con logo "thinkpaladar"
  - Efecto de resplandor (glow) en esquina superior

### Cambiado
- authStore actualizado con soporte para modo desarrollo

---

## [0.4.0] - 2026-01-16

### Anadido
- **CompanySelector**: Selector de companias estilo UberEats Manager
  - Busqueda fuzzy con Fuse.js
  - Seleccion multiple de companias
  - Tabs: "Todos" / "Seleccionados"
  - Botones de accion: "Seleccionar todos", "Borrar", "Aplicar"
  - Keyboard shortcuts: Cmd+K para abrir, ESC para cerrar
  - Click outside para cerrar el modal
  - Orden alfabetico inmutable
- **useScrollLock**: Hook para bloquear scroll del body en modales
- **useCompanies**: Hook con datos demo de companias
- **Conexion AWS Athena**: Script de test y verificacion de conexion
  - Credenciales configuradas en `.env.local`
  - Acceso a databases: `biz_portal`, `raw_mapper_portal`

### Cambiado
- **Layout reestructurado**:
  - Nuevo TopBar con logo y acciones de usuario
  - Sidebar colapsable (260px <-> 72px)
  - CompanySelector movido de Navbar a Sidebar
  - MainLayout con padding dinamico segun estado del sidebar
- Eliminado sistema de "Recientes" del CompanySelector

---

## [0.3.5] - 2026-01-15

### Anadido
- Nueva jerarquia de datos: Company -> Brand -> Area -> Restaurant -> Channel
- Types actualizados en `/types/models.ts`
- Dos stores separados:
  - `useGlobalFiltersStore`: Filtro de companias (global)
  - `useDashboardFiltersStore`: Filtros de dashboard (por pagina)
- Constants: `channels.ts` (Glovo, UberEats, JustEat)
- Query keys actualizados

---

## [0.3.0] - 2026-01-14

### Anadido
- **Layout basico**:
  - Sidebar con navegacion
  - Navbar con breadcrumb
  - MainLayout
- React Router configurado
- DashboardPage con metricas demo

---

## [0.2.0] - 2026-01-13

### Anadido
- **UI Primitivos**:
  - Button (variantes: primary, secondary, ghost, outline)
  - Card (con CardHeader, CardContent, CardFooter)
  - Input
  - Select
  - Badge
  - Spinner
  - Modal

---

## [0.1.0] - 2026-01-12

### Anadido
- **Fundacion del proyecto**:
  - Estructura de carpetas creada
  - ARCHITECTURE.md documentado
  - CLAUDE.md creado
  - Dependencias instaladas:
    - @supabase/supabase-js
    - @tanstack/react-query
    - zustand
    - fuse.js
    - lucide-react
    - recharts
    - date-fns
  - Utility `cn()` (clsx + tailwind-merge)
  - Formatters (currency, date, number)
  - Providers: Supabase client + React Query

---

## Leyenda

- **Anadido**: Nuevas funcionalidades
- **Cambiado**: Cambios en funcionalidades existentes
- **Obsoleto**: Funcionalidades que seran eliminadas proximamente
- **Eliminado**: Funcionalidades eliminadas
- **Corregido**: Correccion de errores
- **Seguridad**: Vulnerabilidades corregidas
