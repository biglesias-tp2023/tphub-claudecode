/**
 * Configuración maestra de objetivos estratégicos
 *
 * Define las 7 categorías y todos los tipos de objetivos con sus patrones de UI.
 */
import {
  TrendingUp,
  Settings,
  Users,
  Tag,
  Star,
  Handshake,
  UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  ObjectiveCategory,
  ObjectiveTypeConfig,
  ObjectiveResponsible,
} from '@/types';

// ============================================
// CATEGORÍAS
// ============================================

export interface CategoryConfig {
  id: ObjectiveCategory;
  label: string;
  icon: LucideIcon;
  color: string;           // Tailwind color class base (e.g., 'emerald')
  bgColor: string;         // Background color class
  textColor: string;       // Text color class
  borderColor: string;     // Border color class
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: TrendingUp,
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: Settings,
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
    color: 'violet',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
  },
  {
    id: 'marca',
    label: 'Marca',
    icon: Tag,
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
  },
  {
    id: 'reputacion',
    label: 'Reputación',
    icon: Star,
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    icon: Handshake,
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  {
    id: 'menu',
    label: 'Menú',
    icon: UtensilsCrossed,
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
];

// ============================================
// RESPONSABLES
// ============================================

export interface ResponsibleConfig {
  id: ObjectiveResponsible;
  label: string;
}

export const RESPONSIBLES: ResponsibleConfig[] = [
  { id: 'thinkpaladar', label: 'ThinkPaladar' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'ambos', label: 'Ambos' },
  { id: 'plataforma', label: 'Plataforma' },
];

// ============================================
// PROVEEDORES TECH/STACK (para dropdown)
// ============================================

export const TECH_PROVIDERS = [
  'Deliverect',
  'Cheerfy',
  'Last.app',
  'DelitBee',
  'Honei',
  'Haddock',
  'Otter',
  'Bookline',
  'CoverManager',
  'TheFork',
  'Square',
  'Restoo',
  'SumUp',
  'Otros',
];

// ============================================
// TIPOS DE OBJETIVOS POR CATEGORÍA
// ============================================

export const OBJECTIVE_TYPES: ObjectiveTypeConfig[] = [
  // ────────────────────────────────────────
  // FINANZAS
  // ────────────────────────────────────────
  {
    id: 'incremento_facturacion',
    label: 'Incremento de facturación',
    category: 'finanzas',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'grid_channel_month',
    defaultUnit: 'EUR',
    hasChannelBreakdown: true,
    hasMonthlyBreakdown: true,
    monthsAhead: 6,
    description: 'Objetivos de facturación por canal y mes',
  },
  {
    id: 'mejorar_margen',
    label: 'Mejorar Margen',
    category: 'finanzas',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'percentage_range',
    defaultUnit: '%',
    description: 'Pasar de un porcentaje a otro en un lapso de tiempo',
  },
  {
    id: 'implementar_escandallos',
    label: 'Implementar Escandallos',
    category: 'finanzas',
    defaultResponsible: 'cliente',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Conocer exactamente el coste de cada producto (COGS)',
  },
  {
    id: 'labor',
    label: 'Labor',
    category: 'finanzas',
    defaultResponsible: 'cliente',
    fieldType: 'percentage_or_amount',
    defaultUnit: '%',
    allowUnitToggle: true,
    allowedUnits: ['%', 'EUR'],
    description: 'Controlar coste de personal',
  },
  {
    id: 'finanzas_otros',
    label: 'Otros',
    category: 'finanzas',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'free_text',
    defaultUnit: 'none',
    allowUnitToggle: true,
    allowedUnits: ['%', 'EUR', 'uds', 'none'],
    description: 'Objetivo financiero personalizado',
  },

  // ────────────────────────────────────────
  // OPERACIONES
  // ────────────────────────────────────────
  {
    id: 'tiempos_preparacion',
    label: 'Tiempos de preparación',
    category: 'operaciones',
    defaultResponsible: 'plataforma',
    fieldType: 'minutes',
    defaultUnit: 'min',
    description: 'Reducir tiempo de preparación en cocina',
  },
  {
    id: 'tiempo_espera_repartidor',
    label: 'Tiempo de espera evitable del repartidor',
    category: 'operaciones',
    defaultResponsible: 'cliente',
    fieldType: 'minutes',
    defaultUnit: 'min',
    description: 'Reducir tiempo que el repartidor espera',
  },
  {
    id: 'opentime',
    label: 'OpenTime',
    category: 'operaciones',
    defaultResponsible: 'cliente',
    fieldType: 'percentage_range',
    defaultUnit: '%',
    description: 'Mejorar porcentaje de tiempo abierto',
  },
  {
    id: 'reducir_incidencias',
    label: 'Reducir incidencias',
    category: 'operaciones',
    defaultResponsible: 'cliente',
    fieldType: 'percentage_or_amount',
    defaultUnit: '%',
    allowUnitToggle: true,
    allowedUnits: ['%', 'uds'],
    description: 'Reducir número o porcentaje de incidencias',
  },
  {
    id: 'pedidos_cancelados',
    label: 'Pedidos cancelados',
    category: 'operaciones',
    defaultResponsible: 'cliente',
    fieldType: 'percentage_or_amount',
    defaultUnit: '%',
    allowUnitToggle: true,
    allowedUnits: ['%', 'uds'],
    description: 'Reducir cancelaciones',
  },
  {
    id: 'operaciones_otros',
    label: 'Otros',
    category: 'operaciones',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'free_text',
    defaultUnit: 'none',
    description: 'Objetivo operacional personalizado',
  },

  // ────────────────────────────────────────
  // CLIENTES
  // ────────────────────────────────────────
  {
    id: 'clientes_nuevos',
    label: 'Clientes Nuevos',
    category: 'clientes',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'grid_channel_month',
    defaultUnit: 'uds',
    hasChannelBreakdown: true,
    hasMonthlyBreakdown: true,
    monthsAhead: 6,
    description: 'Objetivos de nuevos clientes por canal y mes',
  },
  {
    id: 'clientes_ocasionales',
    label: 'Clientes Ocasionales',
    category: 'clientes',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'grid_channel_month',
    defaultUnit: 'uds',
    hasChannelBreakdown: true,
    hasMonthlyBreakdown: true,
    monthsAhead: 6,
    description: 'Objetivos de clientes ocasionales por canal y mes',
  },
  {
    id: 'clientes_frecuentes',
    label: 'Clientes Frecuentes',
    category: 'clientes',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'grid_channel_month',
    defaultUnit: 'uds',
    hasChannelBreakdown: true,
    hasMonthlyBreakdown: true,
    monthsAhead: 6,
    description: 'Objetivos de clientes frecuentes por canal y mes',
  },
  {
    id: 'clientes_prime',
    label: 'Clientes Prime',
    category: 'clientes',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'grid_channel_month',
    defaultUnit: '%',
    hasChannelBreakdown: true,
    hasMonthlyBreakdown: true,
    monthsAhead: 6,
    description: 'Porcentaje de clientes prime por canal y mes',
  },
  {
    id: 'clientes_otros',
    label: 'Otros',
    category: 'clientes',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'free_text',
    defaultUnit: 'none',
    description: 'Objetivo de clientes personalizado',
  },

  // ────────────────────────────────────────
  // MARCA
  // ────────────────────────────────────────
  {
    id: 'packaging',
    label: 'Packaging',
    category: 'marca',
    defaultResponsible: 'cliente',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Implementar o mejorar packaging',
  },
  {
    id: 'sesion_fotos',
    label: 'Sesión de fotos',
    category: 'marca',
    defaultResponsible: 'cliente',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Realizar sesión fotográfica de productos',
  },
  {
    id: 'ampliar_catalogo',
    label: 'Ampliar catálogo',
    category: 'marca',
    defaultResponsible: 'cliente',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Añadir nuevos productos al catálogo',
  },
  {
    id: 'google_ads',
    label: 'Implementar Campaña de Google Ads',
    category: 'marca',
    defaultResponsible: 'ambos',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Configurar y lanzar campaña de Google Ads',
  },
  {
    id: 'rrss',
    label: 'RRSS',
    category: 'marca',
    defaultResponsible: 'cliente',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Mejorar presencia en redes sociales',
  },
  {
    id: 'marca_otros',
    label: 'Otros',
    category: 'marca',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Objetivo de marca personalizado',
  },

  // ────────────────────────────────────────
  // REPUTACIÓN
  // ────────────────────────────────────────
  {
    id: 'incentivar_resenas',
    label: 'Incentivar reseñas offline',
    category: 'reputacion',
    defaultResponsible: 'cliente',
    fieldType: 'percentage_range',
    defaultUnit: '%',
    description: 'Aumentar porcentaje de reseñas desde local físico',
  },
  {
    id: 'hack_reputacion',
    label: 'Hack',
    category: 'reputacion',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Implementar hack de reputación',
  },
  {
    id: 'subir_ratings',
    label: 'Subir ratings',
    category: 'reputacion',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'rating_by_channel',
    defaultUnit: 'stars',
    hasChannelBreakdown: true,
    description: 'Mejorar valoraciones por canal (Glovo %, Uber/JustEat ⭐)',
  },

  // ────────────────────────────────────────
  // PROVEEDORES
  // ────────────────────────────────────────
  {
    id: 'presentar_packaging',
    label: 'Presentar Packaging',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Enviar propuesta de proveedor de packaging',
  },
  {
    id: 'presentar_fotos',
    label: 'Presentar Sesión de Fotos',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Enviar propuesta de fotógrafo',
  },
  {
    id: 'presentar_rrss',
    label: 'Presentar Agencia RRSS',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Enviar propuesta de agencia de redes sociales',
  },
  {
    id: 'presentar_alimentos',
    label: 'Presentar Proveedor de Alimentos',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Enviar propuesta de proveedor de alimentos',
  },
  {
    id: 'presentar_postres',
    label: 'Presentar Proveedor de Postres',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Enviar propuesta de proveedor de postres',
  },
  {
    id: 'presentar_tech',
    label: 'Presentar Proveedor de Tech/Stack',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_with_dropdown',
    defaultUnit: 'email',
    dropdownOptions: TECH_PROVIDERS,
    description: 'Enviar propuesta de proveedor tecnológico',
  },
  {
    id: 'certificados_trazabilidad',
    label: 'Certificados de Trazabilidad Alimentaria',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Gestionar certificados de trazabilidad',
  },
  {
    id: 'proveedores_otros',
    label: 'Otros',
    category: 'proveedores',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'email_action',
    defaultUnit: 'email',
    description: 'Otro proveedor',
  },

  // ────────────────────────────────────────
  // MENÚ
  // ────────────────────────────────────────
  {
    id: 'ingenieria_menu',
    label: 'Ingeniería de menú',
    category: 'menu',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Análisis completo de rentabilidad del menú',
  },
  {
    id: 'estrategia_pricing',
    label: 'Estrategia de pricing',
    category: 'menu',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'deadline_only',
    defaultUnit: 'none',
    description: 'Implementar estrategia de precios (ancla, gamas, etc.)',
  },
  {
    id: 'eliminar_platos',
    label: 'Eliminar platos de bajo margen',
    category: 'menu',
    defaultResponsible: 'cliente',
    fieldType: 'number_target',
    defaultUnit: 'uds',
    description: 'Número de platos a eliminar',
  },
  {
    id: 'anadir_combos',
    label: 'Añadir combos',
    category: 'menu',
    defaultResponsible: 'cliente',
    fieldType: 'number_target',
    defaultUnit: 'uds',
    description: 'Número de combos a añadir',
  },
  {
    id: 'anadir_modificadores',
    label: 'Añadir modificadores',
    category: 'menu',
    defaultResponsible: 'cliente',
    fieldType: 'number_target',
    defaultUnit: 'uds',
    description: 'Número de modificadores a añadir',
  },
  {
    id: 'anadir_downsellings',
    label: 'Añadir downsellings',
    category: 'menu',
    defaultResponsible: 'cliente',
    fieldType: 'number_target',
    defaultUnit: 'uds',
    description: 'Número de downsellings a añadir',
  },
  {
    id: 'anadir_upsellings',
    label: 'Añadir upsellings',
    category: 'menu',
    defaultResponsible: 'cliente',
    fieldType: 'number_target',
    defaultUnit: 'uds',
    description: 'Número de upsellings a añadir',
  },
  {
    id: 'menu_otros',
    label: 'Otros',
    category: 'menu',
    defaultResponsible: 'thinkpaladar',
    fieldType: 'free_text',
    defaultUnit: 'none',
    description: 'Objetivo de menú personalizado',
  },
];

// ============================================
// TASK TEMPLATES
// ============================================

/**
 * Template for auto-generating tasks when an objective is created
 */
export interface TaskTemplate {
  key: string;
  title: string;
  description?: string;
  responsible: ObjectiveResponsible;
  daysFromObjectiveDeadline: number; // Negative = before the deadline
}

/**
 * Task templates organized by objective type ID
 * When an objective is created, these tasks are auto-generated
 */
export const OBJECTIVE_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  // ────────────────────────────────────────
  // FINANZAS
  // ────────────────────────────────────────
  incremento_facturacion: [
    { key: 'if_analysis', title: 'Analizar canales de bajo rendimiento', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'if_plan', title: 'Proponer plan de acción', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'if_review', title: 'Revisar y aprobar plan', responsible: 'cliente', daysFromObjectiveDeadline: -20 },
    { key: 'if_implement', title: 'Implementar acciones', responsible: 'ambos', daysFromObjectiveDeadline: -15 },
    { key: 'if_monitor', title: 'Monitorizar resultados', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  mejorar_margen: [
    { key: 'mm_escandallo', title: 'Revisar escandallos actuales', responsible: 'cliente', daysFromObjectiveDeadline: -30 },
    { key: 'mm_pricing', title: 'Proponer ajustes de pricing', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'mm_approve', title: 'Aprobar cambios de precio', responsible: 'cliente', daysFromObjectiveDeadline: -20 },
    { key: 'mm_implement', title: 'Implementar nuevos precios', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
  ],

  implementar_escandallos: [
    { key: 'ie_audit', title: 'Auditar recetas actuales', responsible: 'cliente', daysFromObjectiveDeadline: -45 },
    { key: 'ie_costs', title: 'Recopilar costes de ingredientes', responsible: 'cliente', daysFromObjectiveDeadline: -35 },
    { key: 'ie_template', title: 'Preparar plantilla de escandallos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'ie_fill', title: 'Completar escandallos por producto', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ie_review', title: 'Revisar y validar escandallos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  labor: [
    { key: 'lb_audit', title: 'Auditar costes de personal actuales', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'lb_analysis', title: 'Analizar picos de demanda vs staff', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'lb_plan', title: 'Proponer optimización de turnos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'lb_implement', title: 'Implementar nuevos turnos', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
  ],

  // ────────────────────────────────────────
  // OPERACIONES
  // ────────────────────────────────────────
  tiempos_preparacion: [
    { key: 'tp_audit', title: 'Auditar tiempos actuales', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'tp_bottlenecks', title: 'Identificar cuellos de botella', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'tp_plan', title: 'Proponer mejoras operativas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'tp_implement', title: 'Implementar cambios', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
  ],

  tiempo_espera_repartidor: [
    { key: 'ter_audit', title: 'Medir tiempos de espera actuales', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ter_causes', title: 'Identificar causas principales', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ter_process', title: 'Optimizar proceso de entrega', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ter_monitor', title: 'Monitorizar mejoras', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  opentime: [
    { key: 'ot_audit', title: 'Analizar horarios de cierre inesperado', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ot_causes', title: 'Identificar causas de cierres', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ot_plan', title: 'Plan de contingencia de personal', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ot_implement', title: 'Implementar alertas y backups', responsible: 'ambos', daysFromObjectiveDeadline: -7 },
  ],

  reducir_incidencias: [
    { key: 'ri_audit', title: 'Auditar incidencias del último mes', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'ri_categorize', title: 'Categorizar tipos de incidencias', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ri_plan', title: 'Plan de mejora por categoría', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ri_training', title: 'Formar al equipo', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'ri_monitor', title: 'Monitorizar evolución', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  pedidos_cancelados: [
    { key: 'pc_audit', title: 'Analizar motivos de cancelación', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'pc_stock', title: 'Revisar gestión de stock', responsible: 'cliente', daysFromObjectiveDeadline: -20 },
    { key: 'pc_process', title: 'Mejorar procesos de confirmación', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'pc_monitor', title: 'Seguimiento semanal', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  // ────────────────────────────────────────
  // CLIENTES
  // ────────────────────────────────────────
  clientes_nuevos: [
    { key: 'cn_analysis', title: 'Analizar captación actual', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'cn_campaigns', title: 'Diseñar campañas de captación', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'cn_approve', title: 'Aprobar presupuesto de campañas', responsible: 'cliente', daysFromObjectiveDeadline: -20 },
    { key: 'cn_launch', title: 'Lanzar campañas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'cn_optimize', title: 'Optimizar campañas activas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  clientes_frecuentes: [
    { key: 'cf_analysis', title: 'Analizar comportamiento de repetición', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'cf_loyalty', title: 'Diseñar estrategia de fidelización', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'cf_promos', title: 'Crear promociones de repetición', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'cf_implement', title: 'Activar promociones', responsible: 'ambos', daysFromObjectiveDeadline: -10 },
  ],

  // ────────────────────────────────────────
  // MARCA
  // ────────────────────────────────────────
  packaging: [
    { key: 'pkg_brief', title: 'Enviar brief de packaging', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -60 },
    { key: 'pkg_quotes', title: 'Solicitar cotizaciones proveedores', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -50 },
    { key: 'pkg_select', title: 'Seleccionar proveedor y diseño', responsible: 'cliente', daysFromObjectiveDeadline: -40 },
    { key: 'pkg_order', title: 'Realizar pedido', responsible: 'cliente', daysFromObjectiveDeadline: -30 },
    { key: 'pkg_implement', title: 'Implementar nuevo packaging', responsible: 'cliente', daysFromObjectiveDeadline: -7 },
  ],

  sesion_fotos: [
    { key: 'sf_brief', title: 'Preparar brief de sesión', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'sf_photographer', title: 'Coordinar con fotógrafo', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'sf_prepare', title: 'Preparar platos para sesión', responsible: 'cliente', daysFromObjectiveDeadline: -7 },
    { key: 'sf_session', title: 'Realizar sesión de fotos', responsible: 'ambos', daysFromObjectiveDeadline: -5 },
    { key: 'sf_upload', title: 'Subir fotos a plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: 0 },
  ],

  ampliar_catalogo: [
    { key: 'ac_analysis', title: 'Analizar catálogo actual vs competencia', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -35 },
    { key: 'ac_propose', title: 'Proponer nuevos productos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'ac_decide', title: 'Decidir productos a añadir', responsible: 'cliente', daysFromObjectiveDeadline: -25 },
    { key: 'ac_recipes', title: 'Desarrollar recetas/escandallos', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ac_photos', title: 'Preparar fotos y descripciones', responsible: 'ambos', daysFromObjectiveDeadline: -7 },
    { key: 'ac_upload', title: 'Subir a plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: 0 },
  ],

  google_ads: [
    { key: 'ga_setup', title: 'Configurar cuenta de Google Ads', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ga_keywords', title: 'Investigar keywords', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ga_ads', title: 'Crear anuncios', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'ga_budget', title: 'Aprobar presupuesto', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'ga_launch', title: 'Lanzar campaña', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
    { key: 'ga_optimize', title: 'Optimizar y reportar', responsible: 'thinkpaladar', daysFromObjectiveDeadline: 0 },
  ],

  rrss: [
    { key: 'rrss_audit', title: 'Auditar presencia actual en RRSS', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'rrss_strategy', title: 'Definir estrategia de contenidos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'rrss_calendar', title: 'Crear calendario editorial', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'rrss_approve', title: 'Aprobar contenidos', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'rrss_publish', title: 'Publicar según calendario', responsible: 'ambos', daysFromObjectiveDeadline: 0 },
  ],

  // ────────────────────────────────────────
  // REPUTACIÓN
  // ────────────────────────────────────────
  incentivar_resenas: [
    { key: 'ir_audit', title: 'Auditar flujo actual de reseñas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ir_materials', title: 'Diseñar materiales para local', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ir_print', title: 'Imprimir y enviar materiales', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ir_training', title: 'Formar al equipo en solicitud', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'ir_monitor', title: 'Monitorizar evolución', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  subir_ratings: [
    { key: 'sr_audit', title: 'Auditar reviews negativas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'sr_responses', title: 'Responder reviews pendientes', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'sr_quality', title: 'Revisar calidad de platos', responsible: 'cliente', daysFromObjectiveDeadline: -20 },
    { key: 'sr_incentive', title: 'Activar incentivos offline', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'sr_monitor', title: 'Seguimiento semanal', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  hack_reputacion: [
    { key: 'hr_strategy', title: 'Definir estrategia de hack', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'hr_implement', title: 'Implementar hack', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'hr_monitor', title: 'Monitorizar resultados', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  // ────────────────────────────────────────
  // PROVEEDORES
  // ────────────────────────────────────────
  presentar_packaging: [
    { key: 'pp_research', title: 'Investigar proveedores', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'pp_quotes', title: 'Solicitar presupuestos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'pp_compare', title: 'Comparar opciones', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -10 },
    { key: 'pp_present', title: 'Presentar propuesta al cliente', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  presentar_fotos: [
    { key: 'pf_research', title: 'Investigar fotógrafos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'pf_quotes', title: 'Solicitar presupuestos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'pf_portfolio', title: 'Revisar portfolios', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -10 },
    { key: 'pf_present', title: 'Presentar opciones al cliente', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  presentar_tech: [
    { key: 'pt_needs', title: 'Identificar necesidades técnicas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'pt_research', title: 'Investigar soluciones', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'pt_demos', title: 'Solicitar demos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'pt_compare', title: 'Comparar funcionalidades y precios', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -10 },
    { key: 'pt_present', title: 'Presentar recomendación', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  // ────────────────────────────────────────
  // MENÚ
  // ────────────────────────────────────────
  ingenieria_menu: [
    { key: 'im_data', title: 'Recopilar datos de ventas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -30 },
    { key: 'im_matrix', title: 'Crear matriz de rentabilidad', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'im_analysis', title: 'Analizar stars, plowhorses, puzzles, dogs', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'im_recommend', title: 'Preparar recomendaciones', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'im_present', title: 'Presentar informe al cliente', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -10 },
    { key: 'im_implement', title: 'Implementar cambios', responsible: 'cliente', daysFromObjectiveDeadline: -5 },
  ],

  estrategia_pricing: [
    { key: 'ep_analysis', title: 'Analizar precios actuales', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ep_competition', title: 'Benchmark competencia', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ep_strategy', title: 'Definir estrategia (ancla, gamas)', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'ep_present', title: 'Presentar propuesta', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -10 },
    { key: 'ep_implement', title: 'Implementar nuevos precios', responsible: 'cliente', daysFromObjectiveDeadline: -5 },
  ],

  eliminar_platos: [
    { key: 'elp_identify', title: 'Identificar platos de bajo margen', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'elp_recommend', title: 'Recomendar platos a eliminar', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'elp_approve', title: 'Aprobar lista de eliminación', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'elp_remove', title: 'Eliminar de plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  anadir_combos: [
    { key: 'ac_design', title: 'Diseñar combos rentables', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -25 },
    { key: 'ac_price', title: 'Calcular precios de combos', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ac_approve', title: 'Aprobar combos', responsible: 'cliente', daysFromObjectiveDeadline: -15 },
    { key: 'ac_setup', title: 'Configurar en plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -7 },
  ],

  anadir_modificadores: [
    { key: 'am_identify', title: 'Identificar oportunidades de modificadores', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'am_price', title: 'Definir precios de modificadores', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'am_approve', title: 'Aprobar modificadores', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'am_setup', title: 'Configurar en plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  anadir_downsellings: [
    { key: 'ads_identify', title: 'Identificar productos para downselling', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'ads_design', title: 'Diseñar versiones económicas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'ads_approve', title: 'Aprobar downsellings', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'ads_setup', title: 'Configurar en plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],

  anadir_upsellings: [
    { key: 'aus_identify', title: 'Identificar oportunidades de upselling', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -20 },
    { key: 'aus_design', title: 'Diseñar versiones premium', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -15 },
    { key: 'aus_approve', title: 'Aprobar upsellings', responsible: 'cliente', daysFromObjectiveDeadline: -10 },
    { key: 'aus_setup', title: 'Configurar en plataformas', responsible: 'thinkpaladar', daysFromObjectiveDeadline: -5 },
  ],
};

/**
 * Get task templates for a given objective type
 */
export function getTaskTemplatesForObjective(objectiveTypeId: string): TaskTemplate[] {
  return OBJECTIVE_TASK_TEMPLATES[objectiveTypeId] || [];
}

// ============================================
// OBJECTIVE TYPE → KPI AUTO-CONFIGURATION
// ============================================

/**
 * Maps objective types to their default KPI configuration.
 * When a user selects one of these types, the KPI fields are auto-configured.
 */
export const OBJECTIVE_TYPE_KPI_MAP: Record<string, {
  kpiType: string;
  kpiUnit: string;
  targetDirection: 'increase' | 'decrease';
}> = {
  incremento_facturacion: { kpiType: 'revenue', kpiUnit: '€', targetDirection: 'increase' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtiene la configuración de una categoría por ID
 */
export function getCategoryConfig(categoryId: ObjectiveCategory): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === categoryId);
}

/**
 * Obtiene los tipos de objetivo para una categoría
 */
export function getObjectiveTypesForCategory(categoryId: ObjectiveCategory): ObjectiveTypeConfig[] {
  return OBJECTIVE_TYPES.filter((t) => t.category === categoryId);
}

/**
 * Obtiene la configuración de un tipo de objetivo por ID
 */
export function getObjectiveTypeConfig(typeId: string): ObjectiveTypeConfig | undefined {
  return OBJECTIVE_TYPES.find((t) => t.id === typeId);
}

/**
 * Obtiene el primer tipo de objetivo de una categoría (default)
 */
export function getDefaultObjectiveType(categoryId: ObjectiveCategory): ObjectiveTypeConfig | undefined {
  return OBJECTIVE_TYPES.find((t) => t.category === categoryId);
}

/**
 * Obtiene la configuración de un responsable por ID
 */
export function getResponsibleConfig(responsibleId: ObjectiveResponsible): ResponsibleConfig | undefined {
  return RESPONSIBLES.find((r) => r.id === responsibleId);
}
