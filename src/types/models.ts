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
// USER PROFILE (Perfil del consultor en Supabase)
// ============================================
export type UserRole = 'admin' | 'consultant' | 'viewer';

/**
 * Profile stored in Supabase profiles table
 */
export interface Profile {
  id: string;                       // UUID, references auth.users
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  assignedCompanyIds: string[];     // UUID[] of assigned companies
  createdAt: string;
  updatedAt: string;
}

/**
 * User type for frontend use (combines auth and profile data)
 */
export interface User {
  id: string;
  email: string;                    // Debe ser @thinkpaladar.com
  name: string;
  avatarUrl?: string;
  role: UserRole;
  assignedCompanyIds: string[];     // UUIDs de compañías asignadas
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================
// COMPANY (Compañía/Holding - Nivel 1)
// ============================================
// Ej: Restalia Holding, Alsea, Grupo Vips

/**
 * Company from Supabase companies table
 */
export type CompanyStatus = 'Onboarding' | 'Cliente Activo' | 'Stand By' | 'PiP';

export interface Company {
  id: string;                       // UUID
  externalId?: number | null;       // pk_id_company from Athena
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  status?: CompanyStatus | null;    // Status del cliente
  keyAccountManager?: string | null; // Assigned Key Account Manager
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BRAND (Marca - Nivel 2)
// ============================================
// Ej: 100 Montaditos, TGB, La Sureña, Foster's Hollywood

/**
 * Brand from Supabase brands table
 */
export interface Brand {
  id: string;                       // UUID (primary, most recent)
  allIds: string[];                 // All IDs that share this name (for multi-portal dedup)
  externalId?: number | null;       // pk_id_store from Athena
  companyId: string;                // FK → Company (UUID)
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AREA (Ciudad/Zona - Geographic)
// ============================================
// Ej: Madrid, Barcelona, Valencia
// Note: Areas are geographic, not brand-specific

/**
 * Area from Supabase areas table
 */
export interface Area {
  id: string;                       // UUID
  externalId?: number | null;       // pk_id from Athena
  name: string;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// RESTAURANT (Local/Restaurante - Nivel 4)
// ============================================
// Ej: Calle Gran Vía 42, Paseo de Gracia 15

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Restaurant from Supabase restaurants table
 */
export interface Restaurant {
  id: string;                       // UUID (primary, most recent)
  allIds: string[];                 // All IDs that share this name (for multi-portal dedup)
  externalId?: number | null;       // pk_id_address from Athena
  companyId: string;                // FK → Company (UUID)
  brandId: string;                  // FK → Brand (UUID)
  areaId: string | null;            // FK → Area (UUID, optional)
  name: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryRadiusKm?: number | null;
  activeChannels: ChannelId[];      // ['glovo', 'ubereats', 'justeat']
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Restaurant with joined brand and area data
 */
export interface RestaurantWithDetails extends Restaurant {
  brandName?: string;
  areaName?: string;
  companyName?: string;
}

// ============================================
// PRODUCT
// ============================================
export interface ProductPricing {
  glovo?: number;
  ubereats?: number;
  justeat?: number;
}

export interface ChannelIds {
  glovo?: string;
  ubereats?: string;
  justeat?: string;
}

export interface Product {
  id: string;
  brandId: string;                  // FK → Brand
  companyId: string;                // FK → Company (denormalizado)
  name: string;
  description?: string;
  category: string;
  pricing: ProductPricing;
  imageUrl?: string;
  isActive: boolean;
  channelIds: ChannelIds;
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

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: OrderItemModifier[];
}

export interface OrderCustomer {
  name?: string;
  isNewCustomer: boolean;
}

export interface Order {
  id: string;
  externalId: string;               // ID del canal (Glovo/UberEats/JustEat)

  // Jerarquía completa (denormalizado para queries)
  companyId: string;                // FK → Company
  brandId: string;                  // FK → Brand
  areaId: string;                   // FK → Area
  restaurantId: string;             // FK → Restaurant
  channel: ChannelId;               // Canal de origen

  status: OrderStatus;
  items: OrderItem[];

  // Financiero
  subtotal: number;
  channelFee: number;               // Comisión del canal
  deliveryFee: number;
  discount: number;
  total: number;
  netRevenue: number;

  customer?: OrderCustomer;

  // Tiempos
  orderedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  scrapedAt: string;
}

// ============================================
// RESTAURANT_KPIS (KPIs agregados por periodo)
// ============================================

export type PeriodType = 'daily' | 'weekly' | 'monthly';

/**
 * RestaurantKpis from Supabase restaurant_kpis table
 */
export interface RestaurantKpis {
  id: string;                       // UUID
  restaurantId: string;             // FK → Restaurant (UUID)
  periodDate: string;               // Date string (YYYY-MM-DD)
  periodType: PeriodType;

  // General KPIs
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  avgDeliveryTimeMin: number | null;
  avgRating: number | null;
  newCustomers: number;
  newCustomerPct: number | null;

  // Per channel
  ordersGlovo: number;
  ordersUbereats: number;
  ordersJusteat: number;
  revenueGlovo: number;
  revenueUbereats: number;
  revenueJusteat: number;

  // Incidences
  incidenceCount: number;
  incidenceRate: number | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// TIPOS DE FILTROS (2 NIVELES)
// ============================================
export interface DateRange {
  start: Date;
  end: Date;
}

export type DatePreset =
  | 'this_week'
  | 'this_month'
  | 'last_week'
  | 'last_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_12_weeks'
  | 'last_12_months'
  | 'custom';

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

// ============================================
// API RESPONSE TYPES
// ============================================
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ============================================
// SUPABASE DATABASE TYPES
// ============================================
// These types represent the raw data from Supabase tables

export interface DbCompany {
  id: string;
  external_id: number | null;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBrand {
  id: string;
  external_id: number | null;
  company_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbArea {
  id: string;
  external_id: number | null;
  name: string;
  country: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface DbRestaurant {
  id: string;
  external_id: number | null;
  company_id: string;
  brand_id: string;
  area_id: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_radius_km: number | null;
  active_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  assigned_company_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DbRestaurantKpis {
  id: string;
  restaurant_id: string;
  period_date: string;
  period_type: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  avg_delivery_time_min: number | null;
  avg_rating: number | null;
  new_customers: number;
  new_customer_pct: number | null;
  orders_glovo: number;
  orders_ubereats: number;
  orders_justeat: number;
  revenue_glovo: number;
  revenue_ubereats: number;
  revenue_justeat: number;
  incidence_count: number;
  incidence_rate: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// RESTAURANT OBJECTIVES
// ============================================
export type InvestmentMode = 'percentage' | 'absolute';

/**
 * Restaurant objective from Supabase restaurant_objectives table
 */
export interface RestaurantObjective {
  id: string;
  restaurantId: string;
  channel: ChannelId;
  periodMonth: string;           // YYYY-MM-DD (first day of month)
  revenueTarget: number;
  adsInvestmentMode: InvestmentMode;
  adsInvestmentValue: number;
  promosInvestmentMode: InvestmentMode;
  promosInvestmentValue: number;
  foodcostTarget: number;
  marginTarget: number;          // Calculated by DB
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input type for creating/updating objectives
 */
export interface RestaurantObjectiveInput {
  restaurantId: string;
  channel: ChannelId;
  periodMonth: string;
  revenueTarget: number;
  adsInvestmentMode: InvestmentMode;
  adsInvestmentValue: number;
  promosInvestmentMode: InvestmentMode;
  promosInvestmentValue: number;
  foodcostTarget: number;
}

/**
 * Database row type for restaurant_objectives
 */
export interface DbRestaurantObjective {
  id: string;
  restaurant_id: string;
  channel: string;
  period_month: string;
  revenue_target: number;
  ads_investment_mode: string;
  ads_investment_value: number;
  promos_investment_mode: string;
  promos_investment_value: number;
  foodcost_target: number;
  margin_target: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Historical data point for objectives table
 */
export interface HistoricalPeriod {
  periodMonth: string;
  revenue: number;
  revenueChange: number;        // % change vs previous month
}

/**
 * Objective data point for objectives table
 */
export interface ObjectivePeriod {
  periodMonth: string;
  revenueTarget: number;
  adsInvestmentMode: InvestmentMode;
  adsInvestmentValue: number;
  promosInvestmentMode: InvestmentMode;
  promosInvestmentValue: number;
  foodcostTarget: number;
  marginTarget: number;
  hasObjective: boolean;        // Whether objective exists in DB
}

/**
 * Combined view for objectives table row
 */
export interface ObjectiveRowData {
  restaurantId: string;
  restaurantName: string;
  channel: ChannelId | 'total';
  historical: HistoricalPeriod[];
  objectives: ObjectivePeriod[];
}

// ============================================
// STRATEGIC OBJECTIVES (OKRs)
// ============================================

export type ObjectiveHorizon = 'short' | 'medium' | 'long';
export type ObjectiveStatus = 'pending' | 'in_progress' | 'completed';

// Health status for objective progress tracking
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'exceeded';

// Direction for KPI targets
export type TargetDirection = 'increase' | 'decrease' | 'maintain';

// Trend direction for velocity
export type TrendDirection = 'up' | 'down' | 'stable';

// Priority levels
export type ObjectivePriority = 'low' | 'medium' | 'high' | 'critical';

// 7 Categorías de objetivos
export type ObjectiveCategory =
  | 'finanzas'
  | 'operaciones'
  | 'clientes'
  | 'marca'
  | 'reputacion'
  | 'proveedores'
  | 'menu';

// Responsables posibles
export type ObjectiveResponsible =
  | 'thinkpaladar'
  | 'cliente'
  | 'ambos'
  | 'plataforma';

// ============================================
// OBJECTIVE FIELD TYPES (UI Patterns)
// ============================================

/**
 * Tipos de campos para objetivos - cada uno tiene su UI específica
 */
export type ObjectiveFieldType =
  | 'grid_channel_month'      // Grid 6 meses × 3 canales (Facturación, Clientes)
  | 'percentage_range'        // De X% a Y% (Margen, OpenTime)
  | 'percentage_or_amount'    // Toggle % / € / uds (Labor, Incidencias)
  | 'minutes'                 // Input minutos (Tiempos preparación)
  | 'deadline_only'           // Solo fecha límite (Marca, Menú)
  | 'number_target'           // Actual → Objetivo numérico (Combos, Rating)
  | 'rating_by_channel'       // Ratings por canal: Glovo %, Uber ⭐, JustEat ⭐
  | 'email_action'            // Input email + mailto (Proveedores)
  | 'email_with_dropdown'     // Email + selector proveedor (Tech/Stack)
  | 'free_text';              // Texto libre ("Otros")

/**
 * Unidades de medida disponibles
 */
export type ObjectiveUnit =
  | 'EUR'
  | '%'
  | 'uds'
  | 'min'
  | 'stars'
  | 'email'
  | 'none';

/**
 * Configuración de un tipo de objetivo
 */
export interface ObjectiveTypeConfig {
  id: string;                           // ID único (ej: 'incremento_facturacion')
  label: string;                        // Nombre mostrado
  category: ObjectiveCategory;          // Categoría padre
  defaultResponsible: ObjectiveResponsible;
  fieldType: ObjectiveFieldType;        // Patrón de UI
  defaultUnit: ObjectiveUnit;           // Unidad por defecto
  allowUnitToggle?: boolean;            // Permitir cambiar unidad (% ↔ €)
  allowedUnits?: ObjectiveUnit[];       // Unidades permitidas si toggle
  hasChannelBreakdown?: boolean;        // Desglose por canal
  hasMonthlyBreakdown?: boolean;        // Desglose mensual
  monthsAhead?: number;                 // Meses a mostrar (default: 6)
  dropdownOptions?: string[];           // Opciones para dropdown (Tech/Stack)
  description?: string;                 // Descripción/ayuda
}

/**
 * Datos de un canal en un mes específico
 */
export interface ChannelMonthEntry {
  glovo: number;
  ubereats: number;
  justeat: number;
}

/**
 * Datos específicos por tipo de campo - Grid de canales × meses
 * Incluye revenue targets y opcionalmente ADS/Promos investment percentages
 */
export interface GridChannelMonthData {
  [monthKey: string]: ChannelMonthEntry;
}

/**
 * Configuración de inversión ADS/Promos por canal (%)
 */
export interface InvestmentConfig {
  glovo: number;   // % sobre la venta
  ubereats: number;
  justeat: number;
}

/**
 * Datos extendidos del grid con inversiones y datos reales
 */
export interface GridWithInvestments {
  revenue: GridChannelMonthData;
  adsPercent: InvestmentConfig;
  promosPercent: InvestmentConfig;
  // Datos reales (para comparación objetivos vs realidad)
  actualRevenue?: GridChannelMonthData;
  actualAds?: GridChannelMonthData;
  actualPromos?: GridChannelMonthData;
}

// ============================================
// SALES PROJECTION
// ============================================

/**
 * Canales activos en la proyección de ventas
 */
export type SalesChannel = 'glovo' | 'ubereats' | 'justeat';

/**
 * Modo de configuración de inversión para proyección: por canal o global
 */
export type SalesInvestmentMode = 'per_channel' | 'global';

/**
 * Configuración de proyección de ventas
 */
export interface SalesProjectionConfig {
  activeChannels: SalesChannel[];                    // Canales seleccionados
  investmentMode: SalesInvestmentMode;               // Por canal o global
  maxAdsPercent: InvestmentConfig | number;          // % máximo ADS (por canal o global)
  maxPromosPercent: InvestmentConfig | number;       // % máximo promos (por canal o global)
  startDate: string;                                 // Fecha inicio del objetivo
  endDate: string;                                   // Fecha fin del objetivo
}

/**
 * Datos completos de proyección de ventas
 */
export interface SalesProjectionData {
  id: string;
  restaurantId: string;
  config: SalesProjectionConfig;
  // Punto de partida (mes anterior)
  baselineRevenue: ChannelMonthEntry;                // Ventas del mes anterior
  // Objetivos
  targetRevenue: GridChannelMonthData;               // Ventas objetivo por canal/mes
  targetAds: GridChannelMonthData;                   // ADS objetivo (€) por canal/mes
  targetPromos: GridChannelMonthData;                // Promos objetivo (€) por canal/mes
  // Datos reales (acumulados en el mes)
  actualRevenue: GridChannelMonthData;               // Ventas reales
  actualAds: GridChannelMonthData;                   // Gasto ADS real
  actualPromos: GridChannelMonthData;                // Gasto promos real
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Input para crear/actualizar proyección de ventas
 */
export interface SalesProjectionInput {
  restaurantId: string;
  config: SalesProjectionConfig;
  targetRevenue: GridChannelMonthData;
  targetAds?: GridChannelMonthData;
  targetPromos?: GridChannelMonthData;
}

/**
 * Datos específicos por tipo de campo - Rango de porcentaje
 */
export interface PercentageRangeData {
  currentValue: number;
  targetValue: number;
}

/**
 * Datos específicos por tipo de campo - Rating por canal
 */
export interface RatingByChannelData {
  glovo: { current: number; target: number };     // % positivas
  ubereats: { current: number; target: number };  // ⭐ 1-5
  justeat: { current: number; target: number };   // ⭐ 1-5
}

/**
 * Datos específicos por tipo de campo - Email action
 */
export interface EmailActionData {
  email: string;
  sentAt?: string;
  provider?: string;  // Solo para email_with_dropdown
}

/**
 * Datos dinámicos del objetivo según su fieldType
 */
export interface ObjectiveFieldData {
  // Objetivos
  gridChannelMonth?: GridChannelMonthData;
  adsPercent?: InvestmentConfig;
  promosPercent?: InvestmentConfig;
  // Datos reales (para comparativa)
  actualRevenue?: GridChannelMonthData;
  actualAds?: GridChannelMonthData;
  actualPromos?: GridChannelMonthData;
  // Otros campos
  percentageRange?: PercentageRangeData;
  ratingByChannel?: RatingByChannelData;
  emailAction?: EmailActionData;
  selectedUnit?: ObjectiveUnit;
  freeText?: string;
}

/**
 * Strategic objective from Supabase
 */
export interface StrategicObjective {
  id: string;
  companyId: string;                    // CRP Portal: pk_id_company (requerido)
  brandId: string | null;               // CRP Portal: pk_id_store (opcional)
  addressId: string | null;             // CRP Portal: pk_id_address (opcional)
  title: string;
  description: string | null;
  category: ObjectiveCategory;
  objectiveTypeId: string;              // ID del tipo de objetivo (ej: 'incremento_facturacion')
  horizon: ObjectiveHorizon;
  status: ObjectiveStatus;
  responsible: ObjectiveResponsible;
  // KPI fields
  kpiType: string | null;
  kpiCurrentValue: number | null;
  kpiTargetValue: number | null;
  kpiUnit: string | null;
  // Progress tracking fields (new)
  baselineValue: number | null;         // Starting point value
  baselineDate: string | null;          // When baseline was captured
  targetDirection: TargetDirection;     // increase | decrease | maintain
  // Priority and archiving
  priority: ObjectivePriority;          // low | medium | high | critical
  isArchived: boolean;                  // Soft delete / hide from main view
  // Dynamic field data (JSON stored in DB)
  fieldData: ObjectiveFieldData | null;
  evaluationDate: string | null;
  completedAt: string | null;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating/updating strategic objectives
 */
export interface StrategicObjectiveInput {
  companyId: string;                    // CRP Portal: pk_id_company (requerido)
  brandId?: string;                     // CRP Portal: pk_id_store (opcional)
  addressId?: string;                   // CRP Portal: pk_id_address (opcional)
  title: string;
  description?: string;
  category: ObjectiveCategory;
  objectiveTypeId: string;              // ID del tipo de objetivo
  horizon: ObjectiveHorizon;
  status?: ObjectiveStatus;
  responsible?: ObjectiveResponsible;
  // KPI fields
  kpiType?: string;
  kpiCurrentValue?: number;
  kpiTargetValue?: number;
  kpiUnit?: string;
  // Progress tracking fields
  baselineValue?: number;
  baselineDate?: string;
  targetDirection?: TargetDirection;
  // Priority and archiving
  priority?: ObjectivePriority;
  isArchived?: boolean;
  // Dynamic field data
  fieldData?: ObjectiveFieldData;
  evaluationDate?: string;
  displayOrder?: number;
}

/**
 * Database row type for strategic_objectives
 */
export interface DbStrategicObjective {
  id: string;
  company_id: string;                   // CRP Portal: pk_id_company
  brand_id: string | null;              // CRP Portal: pk_id_store
  address_id: string | null;            // CRP Portal: pk_id_address
  title: string;
  description: string | null;
  category: string;
  objective_type_id: string;
  horizon: string;
  status: string;
  responsible: string;
  kpi_type: string | null;
  kpi_current_value: number | null;
  kpi_target_value: number | null;
  kpi_unit: string | null;
  // Progress tracking fields
  baseline_value: number | null;
  baseline_date: string | null;
  target_direction: string;
  // Priority and archiving
  priority: string;
  is_archived: boolean;
  // Other fields
  field_data: string | null;            // JSON string
  evaluation_date: string | null;
  completed_at: string | null;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// OBJECTIVE SNAPSHOTS (Historical Progress)
// ============================================

/**
 * Snapshot of objective progress at a point in time
 * Used for tracking velocity and projections
 */
export interface ObjectiveSnapshot {
  id: string;
  objectiveId: string;
  snapshotDate: string;               // Date when snapshot was taken
  kpiValue: number;                   // KPI value at snapshot time
  progressPercentage: number;         // Progress % at snapshot time
  daysRemaining: number;              // Days until deadline
  velocity: number | null;            // Change per day (calculated)
  projectedValue: number | null;      // Projected final value
  healthStatus: HealthStatus;         // Status at snapshot time
  createdAt: string;
}

export interface DbObjectiveSnapshot {
  id: string;
  objective_id: string;
  snapshot_date: string;
  kpi_value: number;
  progress_percentage: number;
  days_remaining: number;
  velocity: number | null;
  projected_value: number | null;
  health_status: string;
  created_at: string;
}

// ============================================
// OBJECTIVE SHARE LINKS
// ============================================

/**
 * Share link for clients to view a single objective
 * Allows consultants to share individual objectives with clients via public URLs
 */
export interface ObjectiveShareLink {
  id: string;
  objectiveId: string;                // The objective being shared
  token: string;                      // Unique URL token for public access
  isActive: boolean;                  // Whether the link is active
  expiresAt: string | null;           // Expiration date (null = never expires)
  viewCount: number;                  // Number of times the link has been accessed
  allowedEmails: string[];            // Email whitelist (empty = public access)
  createdAt: string;
  lastAccessedAt: string | null;      // Last time the link was accessed
}

export interface DbObjectiveShareLink {
  id: string;
  objective_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  allowed_emails: string[] | null;
  created_at: string;
  last_accessed_at: string | null;
}

/**
 * Record of share link views
 */
export interface ShareLinkView {
  id: string;
  shareLinkId: string;
  viewedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface DbShareLinkView {
  id: string;
  share_link_id: string;
  viewed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

// ============================================
// OBJECTIVE PROGRESS (Calculated, not stored)
// ============================================

/**
 * Calculated progress data for an objective
 * This is computed by useObjectiveProgress hook, not stored in DB
 */
export interface ObjectiveProgressData {
  /** Current KPI value from real-time data */
  currentValue: number | null;
  /** Progress percentage (0-100+) */
  progressPercentage: number | null;
  /** Expected progress based on time elapsed */
  expectedProgress: number | null;
  /** Health status based on actual vs expected progress */
  healthStatus: HealthStatus;
  /** Change per day based on historical snapshots */
  velocity: number | null;
  /** Projected final value at current velocity */
  projectedValue: number | null;
  /** Whether objective will be met at current pace */
  willComplete: boolean;
  /** Trend direction based on recent velocity */
  trend: TrendDirection;
  /** Days elapsed since baseline */
  daysElapsed: number;
  /** Days remaining until deadline */
  daysRemaining: number;
  /** Total days from baseline to deadline */
  totalDays: number;
  /** Month label for current data (e.g., "Enero 2026") */
  monthLabel: string;
  /** Is data loading */
  isLoading: boolean;
}

// ============================================
// TASK AREAS
// ============================================

/**
 * Task area (category) from Supabase
 */
export interface TaskArea {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Task subarea from Supabase
 */
export interface TaskSubarea {
  id: string;
  areaId: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Database row types
 */
export interface DbTaskArea {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbTaskSubarea {
  id: string;
  area_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// ============================================
// TASKS
// ============================================

/**
 * Task from Supabase
 */
export interface Task {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  areaId: string;
  subareaId: string;
  ownerId: string | null;
  deadline: string | null;
  completedAt: string | null;
  isCompleted: boolean;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task with joined area and owner info
 */
export interface TaskWithDetails extends Task {
  areaName?: string;
  areaSlug?: string;
  subareaName?: string;
  ownerName?: string;
  ownerEmail?: string;
}

/**
 * Input for creating/updating tasks
 */
export interface TaskInput {
  restaurantId: string;
  title: string;
  description?: string;
  areaId: string;
  subareaId: string;
  ownerId?: string;
  deadline?: string;
  displayOrder?: number;
}

/**
 * Database row type for tasks
 */
export interface DbTask {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  area_id: string;
  subarea_id: string;
  owner_id: string | null;
  deadline: string | null;
  completed_at: string | null;
  is_completed: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// STRATEGIC TASKS (linked to objectives)
// ============================================

/**
 * Strategic task from Supabase strategic_tasks table
 */
export interface StrategicTask {
  id: string;
  objectiveId: string;
  restaurantId: string;
  title: string;
  description: string | null;
  category: ObjectiveCategory;
  responsible: ObjectiveResponsible;
  assigneeId: string | null;
  clientName: string | null;
  deadline: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  isAutoGenerated: boolean;
  templateKey: string | null;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strategic task with joined data for display
 */
export interface StrategicTaskWithDetails extends StrategicTask {
  objectiveTitle?: string;
  assigneeName?: string;
  assigneeAvatarUrl?: string | null;
  restaurantName?: string;
}

/**
 * Input type for creating/updating strategic tasks
 */
export interface StrategicTaskInput {
  objectiveId: string;
  restaurantId: string;
  title: string;
  description?: string;
  category: ObjectiveCategory;
  responsible: ObjectiveResponsible;
  assigneeId?: string;
  clientName?: string;
  deadline?: string;
  isAutoGenerated?: boolean;
  templateKey?: string;
  displayOrder?: number;
}

/**
 * Database row type for strategic_tasks
 */
export interface DbStrategicTask {
  id: string;
  objective_id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  category: string;
  responsible: string;
  assignee_id: string | null;
  client_name: string | null;
  deadline: string | null;
  is_completed: boolean;
  completed_at: string | null;
  is_auto_generated: boolean;
  template_key: string | null;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// AUDITS (Sistema de Auditorías)
// ============================================

export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'delivered';

export type AuditTypeSlug = 'mystery_shopper' | 'onboarding' | 'google_ads';

export type AuditFieldType =
  | 'checkbox'
  | 'score'
  | 'text'
  | 'select'
  | 'number'
  | 'multiselect'
  | 'datetime'        // Date and time picker
  | 'time'            // Time picker only
  | 'company_select'  // Dropdown from companies table
  | 'user_select'     // Dropdown from profiles table
  | 'file';           // File/image upload

/**
 * Configuration for a single field in an audit form
 */
export interface AuditField {
  key: string;
  label: string;
  type: AuditFieldType;
  required?: boolean;
  options?: string[];           // For select/multiselect
  maxScore?: number;            // For score (default 5)
  scoreLabels?: string[];       // Labels for each score level
  placeholder?: string;
}

/**
 * Section within an audit form
 */
export interface AuditSection {
  key: string;
  title: string;
  description?: string;
  icon?: string;                // Lucide icon name
  fields: AuditField[];
}

/**
 * Schema defining the structure of an audit form
 */
export interface AuditFieldSchema {
  sections: AuditSection[];
}

/**
 * Audit type definition (e.g., Delivery, Google Ads, Mystery Shopper)
 */
export interface AuditType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  fieldSchema: AuditFieldSchema;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

/**
 * Main audit record - CRP nomenclature
 */
export interface Audit {
  pkIdAudit: string;            // Primary key
  pfkIdCompany: string | null;  // Company ID (CRP Portal)
  pfkIdStore: string | null;    // Brand/Store ID (CRP Portal)
  pfkIdPortal: string | null;   // Platform (glovo, ubereats, justeat)
  pfkIdAuditType: string;       // Audit type FK
  desAuditNumber: string;       // Audit reference number (MS-YYYYMMDD-Client)
  desStatus: AuditStatus;       // Status (draft, in_progress, completed, delivered)
  desTitle: string | null;      // Title
  desNotes: string | null;      // Notes
  desConsultant: string | null; // Consultant name (text)
  desKamEvaluator: string | null; // KAM name (text)
  desFieldData: Record<string, unknown> | null; // Form field data
  amtScoreTotal: number | null; // Total score
  tdCreatedAt: string;          // Created timestamp
  tdUpdatedAt: string;          // Updated timestamp
  tdScheduledDate: string | null; // Scheduled date
  tdCompletedAt: string | null; // Completed timestamp
  tdDeliveredAt: string | null; // Delivered timestamp
  pfkCreatedBy: string | null;  // Created by user
  pfkUpdatedBy: string | null;  // Updated by user
}

/**
 * Individual field response in an audit - CRP nomenclature
 */
export type AuditResponseFieldType = 'rating' | 'text' | 'select' | 'multi_select' | 'number' | 'date' | 'time' | 'image';

export interface AuditResponse {
  pkIdResponse: string;         // Primary key
  pfkIdAudit: string;           // Audit FK
  desSection: string;           // Section name
  desFieldKey: string;          // Field key
  desFieldType: AuditResponseFieldType; // Field type
  desValueText: string | null;  // Text value
  amtValueNumber: number | null; // Number value
  tdCreatedAt: string;          // Created timestamp
  tdUpdatedAt: string;          // Updated timestamp
}

/**
 * Image uploaded in an audit - CRP nomenclature
 */
export interface AuditImage {
  pkIdImage: string;            // Primary key
  pfkIdAudit: string;           // Audit FK
  desFieldKey: string;          // Field key
  desStoragePath: string;       // Storage path
  desFileName: string;          // File name
  desMimeType: string | null;   // MIME type
  numFileSize: number | null;   // File size in bytes
  numSortOrder: number;         // Sort order
  tdCreatedAt: string;          // Created timestamp
}

/**
 * Audit with joined details for display
 */
export interface AuditWithDetails extends Audit {
  auditType?: AuditType;
  company?: Company;
  brand?: Brand;
  address?: Restaurant;  // Using Restaurant type for address data
  area?: Area;
  portal?: { id: string; name: string };
  createdByProfile?: { fullName: string; avatarUrl: string | null };
}

/**
 * Input type for creating/updating audits - CRP nomenclature
 */
export interface AuditInput {
  pfkIdCompany?: string;        // Company ID (CRP Portal)
  pfkIdStore?: string;          // Brand/Store ID (CRP Portal)
  pfkIdPortal?: string;         // Platform (glovo, ubereats, justeat)
  pfkIdAuditType: string;       // Audit type FK
  desAuditNumber?: string;      // Audit reference number
  desTitle?: string;            // Title
  desNotes?: string;            // Notes
  desConsultant?: string;       // Consultant name (text)
  desKamEvaluator?: string;     // KAM name (text)
  desFieldData?: Record<string, unknown>; // Form field data
  desStatus?: AuditStatus;      // Status
  tdScheduledDate?: string;     // Scheduled date
}

/**
 * Database row type for audit_types
 */
export interface DbAuditType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  field_schema: AuditFieldSchema;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

/**
 * Database row type for audits - CRP nomenclature
 */
export interface DbAudit {
  pk_id_audit: string;
  pfk_id_company: string | null;
  pfk_id_store: string | null;
  pfk_id_portal: string | null;
  pfk_id_audit_type: string;
  des_audit_number: string;
  des_status: string;
  des_title: string | null;
  des_notes: string | null;
  des_consultant: string | null;
  des_kam_evaluator: string | null;
  des_field_data: Record<string, unknown> | null;
  amt_score_total: number | null;
  td_created_at: string;
  td_updated_at: string;
  td_scheduled_date: string | null;
  td_completed_at: string | null;
  td_delivered_at: string | null;
  pfk_created_by: string | null;
  pfk_updated_by: string | null;
}

/**
 * Database row type for audit_responses - CRP nomenclature
 */
export interface DbAuditResponse {
  pk_id_response: string;
  pfk_id_audit: string;
  des_section: string;
  des_field_key: string;
  des_field_type: string;
  des_value_text: string | null;
  amt_value_number: number | null;
  td_created_at: string;
  td_updated_at: string;
}

/**
 * Database row type for audit_images - CRP nomenclature
 */
export interface DbAuditImage {
  pk_id_image: string;
  pfk_id_audit: string;
  des_field_key: string;
  des_storage_path: string;
  des_file_name: string;
  des_mime_type: string | null;
  num_file_size: number | null;
  num_sort_order: number;
  td_created_at: string;
}

// ============================================
// CALENDAR & CAMPAIGNS
// ============================================

// Plataformas
export type DeliveryPlatform = 'glovo' | 'ubereats' | 'justeat';
export type AdvertisingPlatform = 'glovo' | 'google_ads';
export type CampaignPlatform = DeliveryPlatform | 'google_ads';

// Estados de campana
export type CampaignStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

// Tipos de promocion por plataforma
export type GlovoPromotionType =
  | 'flash_offer'
  | 'menu_discount'
  | 'selected_products'
  | 'free_delivery'
  | 'bogo';

export type JustEatPromotionType =
  | 'stamp_cards'
  | 'free_item'
  | 'euro_discount'
  | 'percent_discount'
  | 'bogo';

export type UberEatsPromotionType =
  | 'percent_discount'
  | 'bogo'
  | 'free_item';

// Tipos de publicidad
export type GlovoAdType = 'keywords' | 'clicks';
export type GoogleAdType = 'search' | 'display' | 'performance_max';
export type JustEatAdType = 'top_rank';

// Configuracion de campana (varia por tipo)
export interface CampaignConfig {
  // Promociones
  discountPercent?: number;
  discountAmount?: number;
  minimumOrder?: number;
  freeDeliveryThreshold?: number;

  // BOGO
  buyProductId?: string;
  getProductId?: string;

  // Flash offers
  duration?: number; // minutos
  startTime?: string;

  // Stamp cards
  stampsRequired?: number;
  rewardProductId?: string;

  // Advertising
  keywords?: string[];
  dailyBudget?: number;
  costPerClick?: number;
  targetPosition?: number;

  // Segmentation
  targetAudience?: string;
}

// Campana principal
export interface PromotionalCampaign {
  id: string;
  restaurantId: string;
  platform: CampaignPlatform;
  campaignType: string;
  name: string | null;
  config: CampaignConfig;
  productIds: string[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  metrics?: CampaignMetrics;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  orders?: number;
  revenue?: number;
  roas?: number;
}

// Input para crear/actualizar campanas
export interface PromotionalCampaignInput {
  restaurantId: string;
  platform: CampaignPlatform;
  campaignType: string;
  name?: string;
  config: CampaignConfig;
  productIds?: string[];
  startDate: string;
  endDate: string;
}

// Database row type
export interface DbPromotionalCampaign {
  id: string;
  restaurant_id: string;
  platform: string;
  campaign_type: string;
  name: string | null;
  config: CampaignConfig;
  product_ids: string[];
  start_date: string;
  end_date: string;
  status: string;
  metrics: CampaignMetrics | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CALENDAR EVENTS
// ============================================

export type EventCategory = 'holiday' | 'sports' | 'entertainment' | 'commercial';

export interface CalendarEvent {
  id: string;
  category: EventCategory;
  name: string;
  description: string | null;
  icon: string | null;
  eventDate: string;
  endDate: string | null;
  countryCode: string;
  regionCode: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  source: string | null;
  externalId: string | null;
  createdAt: string;
}

export interface DbCalendarEvent {
  id: string;
  category: string;
  name: string;
  description: string | null;
  icon: string | null;
  event_date: string;
  end_date: string | null;
  country_code: string;
  region_code: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  source: string | null;
  external_id: string | null;
  created_at: string;
}

// ============================================
// WEATHER FORECAST
// ============================================

export interface WeatherForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  precipitationProbability: number;
  description: string;
  icon: string;
  /** true = dato real histórico, false = pronóstico */
  isHistorical?: boolean;
}

export interface WeatherCache {
  id: string;
  latitude: number;
  longitude: number;
  forecastDate: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  description: string | null;
  icon: string | null;
  fetchedAt: string;
  expiresAt: string | null;
  /** true = dato real histórico (permanente), false = pronóstico (temporal) */
  isHistorical: boolean;
}

export interface DbWeatherCache {
  id: string;
  latitude: number;
  longitude: number;
  forecast_date: string;
  temperature_max: number | null;
  temperature_min: number | null;
  weather_code: number | null;
  precipitation_probability: number | null;
  fetched_at: string;
  expires_at: string;
}

// ============================================
// PRODUCT TIERS (para selector de productos)
// ============================================

export type ProductTier = 'top' | 'tier2' | 'tier3' | 'new';

export interface ProductWithTier extends Product {
  tier: ProductTier;
  salesRank?: number;
  isNew?: boolean;
}

// ============================================
// USER INVITATIONS
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  assignedCompanyIds: string[];
  status: InvitationStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  invitationNote: string | null;
}

export interface DbUserInvitation {
  id: string;
  email: string;
  role: string;
  assigned_company_ids: string[];
  status: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  invitation_note: string | null;
}
