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
  // Scope jerárquico (CRP Portal references)
  companyId: string;
  brandId: string | null;
  addressId: string | null;
  config: SalesProjectionConfig;
  // Punto de partida (mes anterior)
  baselineRevenue: ChannelMonthEntry;                // Ventas del mes anterior
  // Objetivos
  targetRevenue: GridChannelMonthData;               // Ventas objetivo por canal/mes
  targetAds: GridChannelMonthData;                   // ADS objetivo (€) por canal/mes
  targetPromos: GridChannelMonthData;                // Promos objetivo (€) por canal/mes
  // Metadata
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row type for sales_projections
 */
export interface DbSalesProjection {
  id: string;
  company_id: string;
  brand_id: string | null;
  address_id: string | null;
  config: string;                // JSONB string
  baseline_revenue: string;      // JSONB string
  target_revenue: string;        // JSONB string
  target_ads: string;            // JSONB string
  target_promos: string;         // JSONB string
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input para crear/actualizar proyección de ventas
 */
export interface SalesProjectionInput {
  companyId: string;
  brandId?: string | null;
  addressId?: string | null;
  config: SalesProjectionConfig;
  baselineRevenue: ChannelMonthEntry;
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
  /** Is velocity/snapshot data still loading (supplementary) */
  isLoadingVelocity?: boolean;
}
