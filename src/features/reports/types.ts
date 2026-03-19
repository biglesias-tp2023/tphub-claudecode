/**
 * Weekly Report Types — shared across aggregation, HTML builder, and UI components.
 *
 * @module features/reports/types
 */

export interface LocationRow {
  storeName: string;
  addressName: string;
  channelId: 'glovo' | 'ubereats';

  ventas: number;
  pedidos: number;
  nuevos: number;
  recurrentes: number;
  descuentos: number;
  adSpent: number;
  adRevenue: number;

  roasAds: number | null;
  roasPromo: number | null;

  evSemanalPct: number | null;

  /** Month-to-date accumulated sales */
  ventasMes: number;
  /** % consecución mensual = ventasMes / objetivoMes * 100 (null if no objective) */
  consecucionMesPct: number | null;

  /** Monthly objective from sales_projections (null if no projection exists) */
  objetivoMes: number | null;
  /**
   * On-track status considering elapsed days in the month.
   * green = ahead of pace, yellow = slightly behind, red = significantly behind.
   */
  estadoObjetivo: 'green' | 'yellow' | 'red' | null;

  semaforo: 'green' | 'yellow' | 'red';

  /** Internal: raw address ID for products lookup (not displayed) */
  _rawAddressId?: string;
}

/** Grouped location for the detailed breakdown (all channels for one address) */
export interface LocationDetail {
  storeName: string;
  addressName: string;
  channels: LocationDetailChannel[];
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  /** True when ≥75% of orders containing this product had promotions */
  isPromo?: boolean;
}

export interface LocationDetailChannel {
  channelId: 'glovo' | 'ubereats';
  ventas: number;
  pedidos: number;
  nuevos: number;
  recurrentes: number;
  evSemanalPct: number | null;
  ventasMes: number;
  consecucionMesPct: number | null;
  adSpent: number;
  adRevenue: number;
  roasAds: number | null;
  roasPromo: number | null;
  descuentos: number;
  objetivoMes: number | null;
  estadoObjetivo: 'green' | 'yellow' | 'red' | null;
  semaforo: 'green' | 'yellow' | 'red';
  avgDeliveryTime: number | null;
  topProducts: TopProduct[];
}

export interface WeeklyReportData {
  companyName: string;
  companyId: string;
  weekLabel: string;
  emailSubject: string;
  /** Month key for objectives lookup (e.g., "2026-03") */
  monthKey: string;

  totalVentas: number;
  evSemanalPct: number;
  glovoVentas: number;
  glovoEvPct: number;
  uberVentas: number;
  uberEvPct: number;

  /** Total monthly objective (sum of all channels, company-level) */
  objetivoTotal: number | null;
  /** Month-to-date total ventas */
  ventasMesTotal: number;
  /** % consecución total = ventasMesTotal / objetivoTotal */
  consecucionTotalPct: number | null;

  alerts: LocationRow[];
  highlights: LocationRow[];
  investments: LocationRow[];
  allLocations: LocationRow[];
  /** Detailed breakdown grouped by address */
  locationDetails: LocationDetail[];
}

export type InvestmentDecisionValue =
  | 'activar_ads'
  | 'desactivar_ads'
  | 'incrementar_presupuesto'
  | 'reducir_presupuesto'
  | 'observacion';

export interface InvestmentDecisionOption {
  value: InvestmentDecisionValue;
  label: string;
  emailLabel: string;
  color: string;
}

export const INVESTMENT_DECISIONS: InvestmentDecisionOption[] = [
  { value: 'activar_ads', label: 'Activar ADS', emailLabel: 'Activar ADS', color: '#16a34a' },
  { value: 'desactivar_ads', label: 'Desactivar ADS', emailLabel: 'Desactivar ADS', color: '#dc2626' },
  { value: 'incrementar_presupuesto', label: 'Incrementar presupuesto', emailLabel: 'Incrementar presupuesto', color: '#16a34a' },
  { value: 'reducir_presupuesto', label: 'Reducir presupuesto', emailLabel: 'Reducir presupuesto', color: '#dc2626' },
  { value: 'observacion', label: 'Observación y mantenimiento', emailLabel: 'Observación y mantenimiento', color: '#ca8a04' },
];

/** Map: "storeName|addressName|channelId" → decision value */
export type InvestmentDecisionMap = Map<string, InvestmentDecisionValue>;

export function locationKey(loc: LocationRow): string {
  return `${loc.storeName}|${loc.addressName}|${loc.channelId}`;
}

export interface ReportComments {
  general: string;
  alerts: string;
  ads: string;
  detail: string;
}

// ============================================
// MONTHLY REPORT TYPES
// ============================================

export interface MonthlyLocationRevenue {
  storeName: string;
  addressName: string;
  revenue: number;
  prevMonthRevenue: number;
  momChangePct: number | null;
  pctOfTotal: number;
}

export interface MonthlyChannelBreakdown {
  channelId: 'glovo' | 'ubereats';
  totalRevenue: number;
  prevTotalRevenue: number;
  momChangePct: number | null;
  locations: MonthlyLocationRevenue[];
}

export interface MonthlyROIRow {
  storeName: string;
  addressName: string;
  channelId: 'glovo' | 'ubereats';
  investment: number;
  revenue: number;
  roas: number | null;
}

export interface MonthlyChannelTarget {
  channelId: 'glovo' | 'ubereats';
  target: number | null;
  actual: number;
  achievementPct: number | null;
}

export interface MonthlyOpsRow {
  storeName: string;
  addressName: string;
  channelId: 'glovo' | 'ubereats';
  avgDeliveryTime: number | null;
  avgRating: number | null;
  totalReviews: number;
  pedidos: number;
  ticketMedio: number | null;
}

export interface ActionPlanItem {
  text: string;
  owner: 'ThinkPaladar' | 'Cliente' | 'Conjunto';
}

export interface MonthlyReportComments {
  executiveNarrative: string;
  actionPlan: ActionPlanItem[];
}

export interface MonthlyReportData {
  companyId: string;
  companyName: string;
  monthLabel: string;
  monthKey: string;
  emailSubject: string;

  // Executive summary
  totalRevenue: number;
  totalPedidos: number;
  momChangePct: number | null;
  totalTarget: number | null;
  targetAchievementPct: number | null;

  // Channel targets
  channelTargets: MonthlyChannelTarget[];

  // Revenue breakdown per channel
  revenueByChannel: MonthlyChannelBreakdown[];

  // ROI
  roiPromos: MonthlyROIRow[];
  roiAds: MonthlyROIRow[];

  // Operations & reviews
  operations: MonthlyOpsRow[];

  // Top products (aggregated)
  topProducts: TopProduct[];
}

export function suggestDecision(roas: number | null): InvestmentDecisionValue | null {
  if (roas == null) return null;
  if (roas >= 8) return 'incrementar_presupuesto';
  if (roas >= 3) return 'observacion';
  return 'reducir_presupuesto';
}
