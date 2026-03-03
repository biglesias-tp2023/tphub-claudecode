import type { ChannelId } from '@/types';

// ============================================
// GRANULARITY & FORMAT
// ============================================

export type PnLGranularity = 'week' | 'month' | 'quarter';
export type PnLDisplayFormat = 'absolute' | 'relative' | 'combined';
export type PnLChannelTab = 'total' | ChannelId;

// ============================================
// P&L LINE ITEMS
// ============================================

/** Identifiers for each line in the P&L statement */
export type PnLLineId =
  | 'gmv'
  | 'refunds'
  | 'ads_promos'
  | 'ads_visibility'
  | 'commissions'
  | 'cogs'
  | 'net_revenue'
  | 'gross_profit'
  | 'gross_margin';

/** Configuration for a single P&L line */
export interface PnLLineConfig {
  id: PnLLineId;
  label: string;
  section: 'ventas' | 'costes' | 'resultado';
  isSubtraction: boolean;
  isPercentage: boolean;
}

/** All P&L lines in display order */
export const PNL_LINES: PnLLineConfig[] = [
  // VENTAS
  { id: 'gmv', label: 'Ventas brutas (GMV)', section: 'ventas', isSubtraction: false, isPercentage: false },
  { id: 'refunds', label: 'Reembolsos', section: 'ventas', isSubtraction: true, isPercentage: false },
  // COSTES
  { id: 'ads_promos', label: 'Ads / Promos pagadas', section: 'costes', isSubtraction: true, isPercentage: false },
  { id: 'ads_visibility', label: 'Visibilidad / Boost', section: 'costes', isSubtraction: true, isPercentage: false },
  { id: 'commissions', label: 'Comisiones plataforma', section: 'costes', isSubtraction: true, isPercentage: false },
  { id: 'cogs', label: 'Coste producto (COGS)', section: 'costes', isSubtraction: true, isPercentage: false },
  // RESULTADO
  { id: 'net_revenue', label: 'Ventas netas', section: 'resultado', isSubtraction: false, isPercentage: false },
  { id: 'gross_profit', label: 'Beneficio bruto', section: 'resultado', isSubtraction: false, isPercentage: false },
  { id: 'gross_margin', label: 'Margen bruto %', section: 'resultado', isSubtraction: false, isPercentage: true },
];

export const PNL_SECTIONS = [
  { id: 'ventas' as const, label: 'VENTAS' },
  { id: 'costes' as const, label: 'COSTES DE PLATAFORMA & MARKETING' },
  { id: 'resultado' as const, label: 'RESULTADO' },
];

// ============================================
// PERIOD DATA
// ============================================

/** Values for a single P&L line in a single period */
export interface PnLCellData {
  value: number;
  pctOfGmv: number;
  pctChange: number | null;
}

/** All line items for a single period */
export type PnLPeriodData = Record<PnLLineId, PnLCellData>;

/** Complete P&L dataset ready for rendering */
export interface PnLData {
  periods: string[];
  periodLabels: string[];
  byPeriod: Record<string, PnLPeriodData>;
}

// ============================================
// CHANNEL CONFIG
// ============================================

export interface PnLChannelTabConfig {
  id: PnLChannelTab;
  label: string;
}

export const PNL_CHANNEL_TABS: PnLChannelTabConfig[] = [
  { id: 'total', label: 'Total delivery' },
  { id: 'glovo', label: 'Glovo' },
  { id: 'ubereats', label: 'Uber Eats' },
  { id: 'justeat', label: 'Just Eat' },
];

// ============================================
// GRANULARITY CONFIG
// ============================================

export const PNL_GRANULARITY_OPTIONS: { id: PnLGranularity; label: string }[] = [
  { id: 'week', label: 'Semanal' },
  { id: 'month', label: 'Mensual' },
  { id: 'quarter', label: 'Trimestral' },
];

// ============================================
// FORMAT CONFIG
// ============================================

export const PNL_FORMAT_OPTIONS: { id: PnLDisplayFormat; label: string }[] = [
  { id: 'absolute', label: '€' },
  { id: 'relative', label: '%' },
  { id: 'combined', label: '€ + %' },
];
