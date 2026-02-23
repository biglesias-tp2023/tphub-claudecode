/**
 * Types, constants, and utility functions for SalesProjection
 *
 * Internal module -- not part of the public barrel export.
 *
 * @module features/strategic/components/salesProjectionTypes
 */
import type {
  SalesChannel, SalesProjectionConfig,
  GridChannelMonthData, InvestmentConfig,
} from '@/types';

// ============================================
// TYPES
// ============================================

export interface SalesProjectionProps {
  config: SalesProjectionConfig;
  targetRevenue: GridChannelMonthData;
  actualRevenue: GridChannelMonthData;
  actualAds: GridChannelMonthData;
  actualPromos: GridChannelMonthData;
  onTargetChange?: (data: GridChannelMonthData) => void;
  onActualRevenueChange?: (data: GridChannelMonthData) => void;
  onActualAdsChange?: (data: GridChannelMonthData) => void;
  onActualPromosChange?: (data: GridChannelMonthData) => void;
  onEditConfig?: () => void;
  restaurantName?: string;
  /** Real revenue by month×channel from CRP Portal for grid rows */
  realRevenueByMonth?: GridChannelMonthData;
  /** Real promos (discounts) by month×channel from CRP Portal for grid rows */
  realPromosByMonth?: GridChannelMonthData;
  /** Real ads (ad spend) by month×channel from CRP Portal for grid rows */
  realAdsByMonth?: GridChannelMonthData;
}

export interface MonthInfo {
  key: string;
  label: string;
  isCurrent: boolean;
}

export type TabType = 'revenue' | 'ads' | 'promos';

// ============================================
// CONSTANTS
// ============================================

export const CHANNELS: { id: SalesChannel; name: string; color: string; logo: string }[] = [
  { id: 'glovo', name: 'Glovo', color: '#FFC244', logo: '/images/channels/glovo.png' },
  { id: 'ubereats', name: 'UberEats', color: '#06C167', logo: '/images/channels/ubereats.png' },
  { id: 'justeat', name: 'JustEat', color: '#FF8000', logo: '/images/channels/justeat.webp' },
];

export const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ============================================
// UTILS (Pure functions)
// ============================================

/** Genera ventana fija de 6 meses: 2 anteriores + actual (HOY) + 3 futuros */
export function getFixedMonthWindow(): MonthInfo[] {
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const offsets = [-2, -1, 0, 1, 2, 3];

  return offsets.map((offset) => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      label: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      isCurrent: key === currentKey,
    };
  });
}

/** Formatea numero con separador de miles */
export const fmt = (n: number): string => (!n || isNaN(n)) ? '0' : n.toLocaleString('es-ES');

/** Formatea numero en K */
export const fmtK = (n: number): string => {
  if (!n || isNaN(n)) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
};

/** Calcula inversion basada en porcentaje */
export const calcInvestment = (revenue: number, percent: number): number => Math.round((revenue * percent) / 100);

/** Obtiene % de inversion por canal */
export const getPercent = (config: InvestmentConfig | number, ch: SalesChannel): number =>
  typeof config === 'number' ? config : config[ch] || 0;
